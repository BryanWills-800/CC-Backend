const jwt = require("jsonwebtoken");

jest.mock("../models/teamMembershipModel", () => ({
    find: jest.fn(),
    findOne: jest.fn(),
}));

const {
    mainController,
    tasksController,
    teamSelectController,
    selectTeamController,
} = require("../controllers/userController");
const TeamMembership = require("../models/teamMembershipModel");
const { resolveMainRole } = require("../utils/roles");

const createMembershipFindQuery = (memberships) => ({
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockResolvedValue(memberships),
});

const createMembershipFindOneQuery = (membership) => ({
    populate: jest.fn().mockResolvedValue(membership),
});

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
        });
    });

    test("renders Stitch-inspired console pages outside dashboard", () => {
        const res = createResponse();

        tasksController({ user: { role: "maintainer", teamId: "team-1", teamName: "Team A" } }, res);

        expect(res.render).toHaveBeenCalledWith("consolePage", {
            role: "maintainer",
            team: { teamId: "team-1", teamName: "Team A" },
            page: expect.objectContaining({
                activePage: "tasks",
                title: "Task Operations",
            }),
        });
    });

    test("renders active team memberships for team selection", async () => {
        const memberships = [
            { role: "owner", team: { _id: "team-a", name: "Team A", description: "Alpha", isArchived: false } },
            { role: "viewer", team: { _id: "team-b", name: "Team B", description: "Beta", isArchived: true } },
        ];
        TeamMembership.find.mockReturnValue(createMembershipFindQuery(memberships));
        const res = createResponse();

        await teamSelectController({ user: { userId: "user-1" } }, res);

        expect(TeamMembership.find).toHaveBeenCalledWith({ user: "user-1" });
        expect(res.render).toHaveBeenCalledWith("teamSelect", {
            error: null,
            teams: [expect.objectContaining({ id: "team-a", name: "Team A", role: "owner" })],
        });
    });

    test("selecting a team stores team membership role in the roleToken JWT", async () => {
        const membership = {
            role: "maintainer",
            team: { _id: "team-a", name: "Team A", isArchived: false },
        };
        TeamMembership.findOne.mockReturnValue(createMembershipFindOneQuery(membership));
        const res = createResponse();

        await selectTeamController({
            user: { userId: "user-1", name: "Bryan" },
            body: { teamId: "team-a" },
        }, res);

        expect(res.cookie.mock.calls[0][0]).toBe("roleToken");
        const roleToken = res.cookie.mock.calls[0][1];
        const payload = jwt.verify(roleToken, process.env.JWT_SECRET);

        expect(TeamMembership.findOne).toHaveBeenCalledWith({ user: "user-1", team: "team-a" });
        expect(payload).toMatchObject({
            userId: "user-1",
            teamId: "team-a",
            teamName: "Team A",
            role: "maintainer",
        });
        expect(res.redirect).toHaveBeenCalledWith("/main");
    });
});





