const crypto = require("crypto");
const {
    INVITABLE_ROLES,
    MAINTAINER_LEVEL_ROLES,
    OWNER_LEVEL_ROLES,
    assertAllowedValue,
    assertMembership,
    assertRequired,
    assertTeamExists,
    buildSlug,
    createActionError,
    defaultDeps,
    getAuditIpAddress,
    logActivity,
    normalizeText,
} = require("./shared");

const normalizeCreateTeamInput = (input = {}) => ({
    userId: input.userId || input.createdBy,
    name: normalizeText(input.name),
    description: normalizeText(input.description),
    auditContext: input.auditContext,
});

const createTeamService = async (input, deps = defaultDeps) => {
    const teamInput = normalizeCreateTeamInput(input);
    if (!teamInput.userId) throw createActionError(401, "Authenticated user is required");
    assertRequired(teamInput.name, "Team name is required");

    const team = await deps.Team.create({
        name: teamInput.name,
        description: teamInput.description,
        slug: buildSlug(teamInput.name),
        createdById: teamInput.userId,
    });

    await deps.TeamMembership.create({
        teamId: team.id,
        userId: teamInput.userId,
        role: "owner",
        invitedById: null,
    });

    await logActivity({
        teamId: team.id,
        actorId: teamInput.userId,
        action: "team.created",
        entityType: "team",
        entityId: team.id,
        metadata: { name: team.name, slug: team.slug },
        ipAddress: getAuditIpAddress(teamInput),
    }, deps);

    return { message: `Team "${team.name}" created successfully.`, data: team };
};

const normalizeInviteMembersInput = (input = {}) => ({
    teamId: input.teamId || input.team || "",
    userId: input.userId || input.invitedBy,
    email: normalizeText(input.email).toLowerCase(),
    role: normalizeText(input.role) || "member",
    auditContext: input.auditContext,
});

const inviteMembersService = async (input, deps = defaultDeps) => {
    const inviteInput = normalizeInviteMembersInput(input);
    assertRequired(inviteInput.teamId, "Team is required");
    assertRequired(inviteInput.email, "Email is required");
    assertAllowedValue(inviteInput.role, INVITABLE_ROLES, "Invitation role is invalid");

    await assertTeamExists(inviteInput.teamId, deps);
    await assertMembership({ teamId: inviteInput.teamId, userId: inviteInput.userId, allowedRoles: MAINTAINER_LEVEL_ROLES }, deps);

    const token = crypto.randomBytes(32).toString("hex");
    const invitation = await deps.TeamInvitation.create({
        teamId: inviteInput.teamId,
        email: inviteInput.email,
        role: inviteInput.role,
        tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
        invitedById: inviteInput.userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    await logActivity({
        teamId: inviteInput.teamId,
        actorId: inviteInput.userId,
        action: "team.member_invited",
        entityType: "team",
        entityId: inviteInput.teamId,
        metadata: { email: inviteInput.email, role: inviteInput.role },
        ipAddress: getAuditIpAddress(inviteInput),
    }, deps);

    const { tokenHash, ...invitationData } = invitation;
    return { message: `Invitation created for ${invitation.email}.`, data: { ...invitationData, invitationToken: token } };
};


const normalizeJoinTeamInput = (input = {}) => ({
    teamId: input.teamId || input.team || "",
    userId: input.userId,
    token: normalizeText(input.token),
    auditContext: input.auditContext,
});

const joinTeamService = async (input, deps = defaultDeps) => {
    const joinInput = normalizeJoinTeamInput(input);
    assertRequired(joinInput.teamId, "Team is required");
    if (!joinInput.userId) throw createActionError(401, "Authenticated user is required");
    assertRequired(joinInput.token, "Invitation token is required");

    await assertTeamExists(joinInput.teamId, deps);

    const tokenHash = crypto.createHash("sha256").update(joinInput.token).digest("hex");
    const invitation = await deps.TeamInvitation.findByTokenHash(tokenHash);
    if (!invitation || invitation.teamId !== joinInput.teamId) throw createActionError(404, "Invitation not found");
    if (invitation.status !== "pending") throw createActionError(409, "Invitation is no longer pending");
    if (invitation.expiresAt && invitation.expiresAt <= new Date()) throw createActionError(400, "Invitation has expired");

    const existingMembership = await deps.TeamMembership.findForUserTeam({ teamId: joinInput.teamId, userId: joinInput.userId });
    if (existingMembership) throw createActionError(409, "User is already a team member");

    const membership = await deps.TeamMembership.create({
        teamId: joinInput.teamId,
        userId: joinInput.userId,
        role: invitation.role,
        invitedById: invitation.invitedById,
    });

    await deps.TeamInvitation.accept(invitation.id);

    await logActivity({
        teamId: joinInput.teamId,
        actorId: joinInput.userId,
        action: "team.joined",
        entityType: "team",
        entityId: joinInput.teamId,
        metadata: { role: invitation.role },
        ipAddress: getAuditIpAddress(joinInput),
    }, deps);

    return { message: "Team joined successfully.", data: membership };
};
const normalizeChangeRolesInput = (input = {}) => ({
    teamId: input.teamId || input.team || "",
    memberUserId: input.memberUserId || input.member || input.user || "",
    userId: input.userId || input.updatedBy,
    role: normalizeText(input.role),
    auditContext: input.auditContext,
});

const changeRolesService = async (input, deps = defaultDeps) => {
    const roleInput = normalizeChangeRolesInput(input);
    assertRequired(roleInput.teamId, "Team is required");
    assertRequired(roleInput.memberUserId, "Team member is required");
    assertAllowedValue(roleInput.role, INVITABLE_ROLES, "Team role is invalid");

    await assertTeamExists(roleInput.teamId, deps);
    await assertMembership({ teamId: roleInput.teamId, userId: roleInput.userId, allowedRoles: OWNER_LEVEL_ROLES }, deps);

    const membership = await deps.TeamMembership.findForUserTeam({ teamId: roleInput.teamId, userId: roleInput.memberUserId });
    if (!membership) throw createActionError(404, "Team member not found");

    const updatedMembership = await deps.TeamMembership.updateRole({
        teamId: roleInput.teamId,
        userId: roleInput.memberUserId,
        role: roleInput.role,
    });

    await logActivity({
        teamId: roleInput.teamId,
        actorId: roleInput.userId,
        action: "team.member_role_updated",
        entityType: "user",
        entityId: roleInput.memberUserId,
        metadata: { role: roleInput.role },
        ipAddress: getAuditIpAddress(roleInput),
    }, deps);

    return { message: "Team member role updated successfully.", data: updatedMembership };
};

module.exports = {
    changeRolesService,
    createTeamService,
    inviteMembersService,
    joinTeamService,
};


