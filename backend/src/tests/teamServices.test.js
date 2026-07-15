const {
    changeRolesService,
    createTeamService,
    inviteMembersService,
    joinTeamService,
} = require("../services/actions/teamServices");
const { createActionDeps, primeTeam } = require("./serviceTestUtils");

describe("team action services edge cases", () => {
    let deps;

    beforeEach(() => {
        deps = createActionDeps();
        primeTeam(deps);
    });

    test("createTeam trims fields and builds slug", async () => {
        deps.Team.create.mockImplementation(async (payload) => ({ id: "team-2", ...payload }));
        deps.TeamMembership.create.mockResolvedValue({ id: "membership-1" });

        await createTeamService({ createdBy: "user-1", name: "  Platform Team  ", description: "  Core apps  " }, deps);

        expect(deps.Team.create.calls[0][0]).toEqual({
            name: "Platform Team",
            description: "Core apps",
            slug: "platform-team",
            createdById: "user-1",
        });
        expect(deps.TeamMembership.create.calls[0][0]).toEqual({
            teamId: "team-2",
            userId: "user-1",
            role: "owner",
            invitedById: null,
        });
    });

    test("createTeam rejects unauthenticated requests", async () => {
        await expect(createTeamService({ name: "Platform" }, deps)).rejects.toMatchObject({
            statusCode: 401,
            message: "Authenticated user is required",
        });
    });

    test("inviteMembers defaults role to member", async () => {
        deps.TeamInvitation.create.mockImplementation(async (payload) => ({ id: "invite-1", ...payload }));

        const result = await inviteMembersService({ teamId: "team-1", userId: "user-1", email: " USER@EXAMPLE.COM " }, deps);

        expect(deps.TeamInvitation.create.calls[0][0]).toEqual(expect.objectContaining({
            teamId: "team-1",
            email: "user@example.com",
            role: "member",
            invitedById: "user-1",
        }));
        expect(deps.TeamInvitation.create.calls[0][0].tokenHash).toHaveLength(64);
        expect(deps.TeamInvitation.create.calls[0][0].expiresAt).toBeInstanceOf(Date);
        expect(result.data.invitationToken).toBeTruthy();
        expect(result.data.tokenHash).toBeUndefined();
    });

    test("inviteMembers rejects invalid invite role", async () => {
        await expect(inviteMembersService({ teamId: "team-1", userId: "user-1", email: "a@example.com", role: "owner" }, deps)).rejects.toMatchObject({
            statusCode: 400,
            message: "Invitation role is invalid",
        });
    });

    test("inviteMembers rejects missing email", async () => {
        await expect(inviteMembersService({ teamId: "team-1", userId: "user-1" }, deps)).rejects.toMatchObject({
            statusCode: 400,
            message: "Email is required",
        });
    });

    test("inviteMembers requires maintainer-level permissions", async () => {
        deps.TeamMembership.findForUserTeam.mockResolvedValue({ role: "viewer" });

        await expect(inviteMembersService({ teamId: "team-1", userId: "user-1", email: "a@example.com" }, deps)).rejects.toMatchObject({ statusCode: 403 });
    });


    test("joinTeam accepts a pending invitation token", async () => {
        deps.TeamMembership.findForUserTeam.mockResolvedValue(null);
        deps.TeamInvitation.findByTokenHash.mockResolvedValue({
            id: "invite-1",
            teamId: "team-1",
            role: "member",
            invitedById: "owner-1",
            status: "pending",
            expiresAt: new Date(Date.now() + 60000),
        });
        deps.TeamMembership.create.mockResolvedValue({ id: "membership-1", teamId: "team-1", userId: "user-2", role: "member" });
        deps.TeamInvitation.accept.mockResolvedValue({ id: "invite-1", status: "accepted" });

        const result = await joinTeamService({ teamId: "team-1", userId: "user-2", token: "raw-token" }, deps);

        expect(result.message).toBe("Team joined successfully.");
        expect(deps.TeamInvitation.findByTokenHash.calls[0][0]).toHaveLength(64);
        expect(deps.TeamMembership.create.calls[0][0]).toEqual({
            teamId: "team-1",
            userId: "user-2",
            role: "member",
            invitedById: "owner-1",
        });
        expect(deps.TeamInvitation.accept.calls[0][0]).toBe("invite-1");
        expect(deps.ActivityLog.create.calls[0][0]).toEqual(expect.objectContaining({
            action: "team.joined",
            actorId: "user-2",
        }));
    });

    test("joinTeam rejects invalid, expired, and already accepted invitations", async () => {
        deps.TeamMembership.findForUserTeam.mockResolvedValue(null);
        deps.TeamInvitation.findByTokenHash.mockResolvedValue(null);

        await expect(joinTeamService({ teamId: "team-1", userId: "user-2", token: "bad" }, deps)).rejects.toMatchObject({ statusCode: 404 });

        deps.TeamInvitation.findByTokenHash.mockResolvedValue({
            id: "invite-1",
            teamId: "team-1",
            role: "member",
            status: "accepted",
            expiresAt: new Date(Date.now() + 60000),
        });
        await expect(joinTeamService({ teamId: "team-1", userId: "user-2", token: "used" }, deps)).rejects.toMatchObject({ statusCode: 409 });

        deps.TeamInvitation.findByTokenHash.mockResolvedValue({
            id: "invite-1",
            teamId: "team-1",
            role: "member",
            status: "pending",
            expiresAt: new Date(Date.now() - 60000),
        });
        await expect(joinTeamService({ teamId: "team-1", userId: "user-2", token: "expired" }, deps)).rejects.toMatchObject({ statusCode: 400 });
    });

    test("joinTeam rejects duplicate memberships", async () => {
        deps.TeamInvitation.findByTokenHash.mockResolvedValue({
            id: "invite-1",
            teamId: "team-1",
            role: "member",
            status: "pending",
            expiresAt: new Date(Date.now() + 60000),
        });
        deps.TeamMembership.findForUserTeam.mockResolvedValue({ id: "membership-1" });

        await expect(joinTeamService({ teamId: "team-1", userId: "user-2", token: "raw-token" }, deps)).rejects.toMatchObject({
            statusCode: 409,
            message: "User is already a team member",
        });
    });
    test("changeRoles rejects invalid target role", async () => {
        await expect(changeRolesService({ teamId: "team-1", userId: "owner-1", memberUserId: "user-2", role: "owner" }, deps)).rejects.toMatchObject({
            statusCode: 400,
            message: "Team role is invalid",
        });
    });

    test("changeRoles requires owner permissions", async () => {
        deps.TeamMembership.findForUserTeam.mockResolvedValue({ role: "maintainer" });

        await expect(changeRolesService({ teamId: "team-1", userId: "user-1", memberUserId: "user-2", role: "viewer" }, deps)).rejects.toMatchObject({ statusCode: 403 });
    });

    test("changeRoles rejects a missing target membership", async () => {
        let calls = 0;
        deps.TeamMembership.findForUserTeam.mockImplementation(async () => {
            calls += 1;
            return calls === 1 ? { role: "owner" } : null;
        });

        await expect(changeRolesService({ teamId: "team-1", userId: "owner-1", memberUserId: "user-2", role: "viewer" }, deps)).rejects.toMatchObject({
            statusCode: 404,
            message: "Team member not found",
        });
    });

    test("changeRoles updates target membership", async () => {
        let calls = 0;
        deps.TeamMembership.findForUserTeam.mockImplementation(async () => {
            calls += 1;
            return calls === 1 ? { role: "owner" } : { teamId: "team-1", userId: "user-2", role: "member" };
        });
        deps.TeamMembership.updateRole.mockResolvedValue({ teamId: "team-1", userId: "user-2", role: "viewer" });

        const result = await changeRolesService({ team: "team-1", updatedBy: "owner-1", member: "user-2", role: "viewer" }, deps);

        expect(result.data.role).toBe("viewer");
        expect(deps.TeamMembership.updateRole.calls[0][0]).toEqual({ teamId: "team-1", userId: "user-2", role: "viewer" });
        expect(deps.ActivityLog.create.calls[0][0]).toEqual(expect.objectContaining({
            action: "team.member_role_updated",
            entityId: "user-2",
            metadata: { role: "viewer" },
        }));
    });
});



