const { teamMaker } = require("../routes/teamMaker");

describe("teamMaker test middleware", () => {
    test("injects default user, team, membership, and role context", () => {
        const req = {};
        const res = {};
        const next = jest.fn();

        teamMaker()(req, res, next);

        expect(req.team).toEqual({
            teamId: "team-1",
            teamName: "Test Team",
            slug: "test-team",
        });
        expect(req.membership).toEqual({
            membershipId: "membership-1",
            role: "owner",
            teamId: "team-1",
            userId: "user-1",
        });
        expect(req.user).toEqual({
            userId: "user-1",
            name: "Test User",
            email: "test.user@example.test",
            avatarUrl: null,
            teamId: "team-1",
            teamName: "Test Team",
            role: "owner",
        });
        expect(next).toHaveBeenCalled();
    });

    test("allows tests to override user, team, and membership role", () => {
        const req = {};
        const res = {};
        const next = jest.fn();

        teamMaker({
            user: { userId: "user-2", name: "Maintainer User" },
            team: { teamId: "team-2", teamName: "Maintainer Team" },
            membership: { membershipId: "membership-2", role: "maintainer" },
        })(req, res, next);

        expect(req.team).toMatchObject({ teamId: "team-2", teamName: "Maintainer Team" });
        expect(req.membership).toMatchObject({
            membershipId: "membership-2",
            role: "maintainer",
            teamId: "team-2",
            userId: "user-2",
        });
        expect(req.user).toMatchObject({
            userId: "user-2",
            name: "Maintainer User",
            teamId: "team-2",
            teamName: "Maintainer Team",
            role: "maintainer",
        });
        expect(next).toHaveBeenCalled();
    });
});

