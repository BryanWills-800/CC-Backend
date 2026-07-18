const jwt = require("jsonwebtoken");

jest.mock("../db/prismaRepositories", () => ({
    prismaRepositories: {
        TeamMembership: {
            findForUser: jest.fn(),
            findForUserTeam: jest.fn(),
        },
    },
}));

const {
    mainController,
    tasksController,
    teamSelectController,
    selectTeamController,
} = require("../controllers/userController");
const { prismaRepositories } = require("../db/prismaRepositories");
const TeamMembership = prismaRepositories.TeamMembership;
const { resolveMainRole } = require("../utils/roles");

describe("mainController role selection", () => {
    const OLD_ENV = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...OLD_ENV, JWT_SECRET: "test-secret" };
    });

    afterAll(() => {
        process.env = OLD_ENV;
    });

    const createResponse = () => ({
        cookie: jest.fn().mockReturnThis(),
        redirect: jest.fn(),
        render: jest.fn(),
        status: jest.fn().mockReturnThis(),
    });

    test("uses authenticated JWT role when present", () => {
        process.env.ROLE = "viewer";
        const res = createResponse();

        mainController({ user: { role: "admin" } }, res);

        expect(res.render).toHaveBeenCalledWith("main", {
            role: "admin",
            activePage: "dashboard",
            team: { teamId: undefined, teamName: undefined },
            apiFeatures: expect.any(Array),
        });
    });

    test("uses ROLE env fallback when loginToken has no role", () => {
        process.env.ROLE = "maintainer";
        const res = createResponse();

        mainController({ user: { userId: "user-1" } }, res);

        expect(res.render).toHaveBeenCalledWith("main", {
            role: "maintainer",
            activePage: "dashboard",
            team: { teamId: undefined, teamName: undefined },
            apiFeatures: expect.any(Array),
        });
    });

    test("maps owner role to admin UI buttons", () => {
        process.env.ROLE = "owner";
        const res = createResponse();

        mainController({ user: { userId: "user-1" } }, res);

        expect(res.render).toHaveBeenCalledWith("main", {
            role: "admin",
            activePage: "dashboard",
            team: { teamId: undefined, teamName: undefined },
            apiFeatures: expect.any(Array),
        });
    });

    test("normalizes role casing and spacing", () => {
        expect(resolveMainRole(" Admin ")).toBe("admin");
    });

    test("falls back to viewer when ROLE env is invalid", () => {
        process.env.ROLE = "manager";
        const res = createResponse();

        mainController({ user: { userId: "user-1" } }, res);

        expect(res.render).toHaveBeenCalledWith("main", {
            role: "viewer",
            activePage: "dashboard",
            team: { teamId: undefined, teamName: undefined },
            apiFeatures: expect.any(Array),
        });
    });

    test("renders Stitch-inspired console pages outside dashboard", () => {
        const res = createResponse();

        tasksController({ user: { role: "maintainer", teamId: "team-1", teamName: "Team A" } }, res);

        expect(res.render).toHaveBeenCalledWith("consolePage", {
            role: "maintainer",
            team: { teamId: "team-1", teamName: "Team A" },
            apiFeatures: expect.any(Array),
            page: expect.objectContaining({
                activePage: "tasks",
                title: "Task Operations",
            }),
        });
    });

    test("renders active team memberships for team selection", async () => {
        TeamMembership.findForUser.mockResolvedValue([
            { role: "owner", teamId: "team-a", team: { id: "team-a", name: "Team A", description: "Alpha", isArchived: false } },
            { role: "viewer", teamId: "team-b", team: { id: "team-b", name: "Team B", description: "Beta", isArchived: true } },
        ]);
        const res = createResponse();

        await teamSelectController({ user: { userId: "user-1" } }, res);

        expect(TeamMembership.findForUser).toHaveBeenCalledWith("user-1");
        expect(res.render).toHaveBeenCalledWith("teamSelect", {
            error: null,
            teams: [expect.objectContaining({ id: "team-a", name: "Team A", role: "owner" })],
        });
    });

    test("selecting a team stores team membership role in the roleToken JWT", async () => {
        TeamMembership.findForUserTeam.mockResolvedValue({
            role: "maintainer",
            teamId: "team-a",
            team: { id: "team-a", name: "Team A", isArchived: false },
        });
        const res = createResponse();

        await selectTeamController({
            user: { userId: "user-1", name: "Bryan" },
            body: { teamId: "team-a" },
        }, res);

        expect(res.cookie.mock.calls[0][0]).toBe("roleToken");
        const roleToken = res.cookie.mock.calls[0][1];
        const payload = jwt.verify(roleToken, process.env.JWT_SECRET);

        expect(TeamMembership.findForUserTeam).toHaveBeenCalledWith({ userId: "user-1", teamId: "team-a" });
        expect(payload).toMatchObject({
            userId: "user-1",
            teamId: "team-a",
            teamName: "Team A",
            role: "maintainer",
        });
        expect(res.redirect).toHaveBeenCalledWith("/main");
    });

    test("teamSelectController renders database errors", async () => {
        TeamMembership.findForUser.mockRejectedValue(new Error("database offline"));
        const res = createResponse();

        await teamSelectController({ user: { userId: "user-1" } }, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.render).toHaveBeenCalledWith("teamSelect", { teams: [], error: "database offline" });
    });

    test("selectTeamController rejects empty team selection", async () => {
        TeamMembership.findForUser.mockResolvedValue([
            { role: "owner", teamId: "team-a", team: { id: "team-a", name: "Team A", isArchived: false } },
        ]);
        const res = createResponse();

        await selectTeamController({ user: { userId: "user-1" }, body: {} }, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.render).toHaveBeenCalledWith("teamSelect", {
            teams: [expect.objectContaining({ id: "team-a", name: "Team A" })],
            error: "Please choose a team to continue.",
        });
    });

    test("selectTeamController rejects archived or missing selected memberships", async () => {
        TeamMembership.findForUserTeam.mockResolvedValue({
            role: "member",
            teamId: "team-a",
            team: { id: "team-a", name: "Team A", isArchived: true },
        });
        TeamMembership.findForUser.mockResolvedValue([
            { role: "viewer", teamId: "team-b", team: { id: "team-b", name: "Team B", isArchived: false } },
        ]);
        const res = createResponse();

        await selectTeamController({ user: { userId: "user-1" }, body: { teamId: "team-a" } }, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.render).toHaveBeenCalledWith("teamSelect", {
            teams: [expect.objectContaining({ id: "team-b", name: "Team B" })],
            error: "You are not a member of that team.",
        });
    });

    test("selectTeamController renders lookup errors", async () => {
        TeamMembership.findForUserTeam.mockRejectedValue(new Error("lookup failed"));
        const res = createResponse();

        await selectTeamController({ user: { userId: "user-1" }, body: { teamId: "team-a" } }, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.render).toHaveBeenCalledWith("teamSelect", { teams: [], error: "lookup failed" });
    });

    test("selectTeamController marks role cookie secure in production", async () => {
        process.env.NODE_ENV = "production";
        TeamMembership.findForUserTeam.mockResolvedValue({
            role: "owner",
            teamId: "team-a",
            team: { id: "team-a", name: "Team A", isArchived: false },
        });
        const res = createResponse();

        await selectTeamController({ user: { userId: "user-1" }, body: { teamId: "team-a" } }, res);

        expect(res.cookie.mock.calls[0][2]).toEqual(expect.objectContaining({
            httpOnly: true,
            secure: true,
            sameSite: "strict",
            path: "/",
            maxAge: 3600000,
        }));
    });
});

