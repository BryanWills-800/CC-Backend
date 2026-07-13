const jwt = require("jsonwebtoken");
const { authenticateUser, authorizeUserRole } = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");

const createResponse = () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
});

describe("auth middleware focused behavior", () => {
    const OLD_ENV = process.env;

    beforeEach(() => {
        process.env = { ...OLD_ENV, JWT_SECRET: "test-secret", ROLE: undefined };
    });

    afterAll(() => {
        process.env = OLD_ENV;
    });

    test("authenticateUser copies decoded login payload to req.user", () => {
        const token = jwt.sign({ userId: "user-1", name: "Bryan" }, process.env.JWT_SECRET);
        const req = { cookies: { loginToken: token } };
        const res = createResponse();
        const next = jest.fn();

        authenticateUser(req, res, next);

        expect(req.user).toMatchObject({ userId: "user-1", name: "Bryan" });
        expect(next).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalled();
    });

    test("authorizeUserRole preserves user identity fields and attaches team role", () => {
        const roleToken = jwt.sign({ userId: "user-1", teamId: "team-1", teamName: "Team A", role: "maintainer" }, process.env.JWT_SECRET);
        const req = {
            cookies: { roleToken },
            user: { userId: "user-1", name: "Bryan", email: "b@example.com", avatarUrl: "avatar.png" },
        };
        const res = createResponse();
        const next = jest.fn();

        authorizeUserRole(req, res, next);

        expect(req.user).toEqual({
            userId: "user-1",
            name: "Bryan",
            email: "b@example.com",
            avatarUrl: "avatar.png",
            teamId: "team-1",
            teamName: "Team A",
            role: "maintainer",
        });
        expect(next).toHaveBeenCalledTimes(1);
    });

    test("authorizeUserRole rejects expired or invalid role tokens", () => {
        const req = { cookies: { roleToken: "not-a-token" }, user: { userId: "user-1" } };
        const res = createResponse();
        const next = jest.fn();

        authorizeUserRole(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: "Invalid or expired role token" });
        expect(next).not.toHaveBeenCalled();
    });

    test("authorizeRoles accepts req.user role before env fallback", () => {
        process.env.ROLE = "viewer";
        const req = { user: { role: " Maintainer " } };
        const res = createResponse();
        const next = jest.fn();

        authorizeRoles("maintainer")(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalled();
    });

    test("authorizeRoles uses ROLE env fallback", () => {
        process.env.ROLE = "admin";
        const req = { user: {} };
        const res = createResponse();
        const next = jest.fn();

        authorizeRoles("admin")(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
    });

    test("authorizeRoles rejects roles outside allowed list", () => {
        const req = { user: { role: "viewer" } };
        const res = createResponse();
        const next = jest.fn();

        authorizeRoles("admin", "maintainer")(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
        expect(next).not.toHaveBeenCalled();
    });
});