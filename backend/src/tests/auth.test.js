const express = require("express");
const cookieParser = require("cookie-parser");
const request = require("supertest");
const jwt = require("jsonwebtoken");

jest.mock("bcryptjs", () => ({
    compare: jest.fn(),
    genSalt: jest.fn(),
    hash: jest.fn(),
}));

jest.mock("../db/prismaRepositories", () => ({
    prismaRepositories: {
        User: {
            findByNameOrEmail: jest.fn(),
            findByName: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
    },
}));

const bcryptjs = require("bcryptjs");
const { prismaRepositories } = require("../db/prismaRepositories");
const User = prismaRepositories.User;
const authRoutes = require("../routes/authRoutes");
const { authenticateUser, authorizeUserRole } = require("../middlewares/authMiddleware");

const createApp = () => {
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());
    app.use("/api/auth", authRoutes);
    return app;
};

describe("auth flow", () => {
    const OLD_ENV = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...OLD_ENV, JWT_SECRET: "test-secret" };
        User.create.mockResolvedValue({ id: "user-1" });
        User.update.mockResolvedValue({ id: "user-1" });
        User.delete.mockResolvedValue({ id: "user-1" });
    });

    afterAll(() => {
        process.env = OLD_ENV;
    });

    test("signup hashes password, saves user, and redirects to login", async () => {
        User.findByNameOrEmail.mockResolvedValue(null);
        bcryptjs.genSalt.mockResolvedValue("salt");
        bcryptjs.hash.mockResolvedValue("hashed-password");

        const response = await request(createApp())
            .post("/api/auth/signup")
            .send({ name: "Bryan", email: "bryan@example.com", password: "Password123!" });

        expect(response.status).toBe(302);
        expect(response.headers.location).toBe("/login");
        expect(User.findByNameOrEmail).toHaveBeenCalledWith({ name: "Bryan", email: "bryan@example.com" });
        expect(bcryptjs.hash).toHaveBeenCalledWith("Password123!", "salt");
        expect(User.create).toHaveBeenCalledWith({
            name: "Bryan",
            email: "bryan@example.com",
            passwordHash: "hashed-password",
        });
    });

    test("signup returns 409 when name or email already exists", async () => {
        User.findByNameOrEmail.mockResolvedValue({ id: "existing-user" });

        const response = await request(createApp())
            .post("/api/auth/signup")
            .send({ name: "Bryan", email: "bryan@example.com", password: "Password123!" });

        expect(response.status).toBe(409);
        expect(response.body).toEqual({ message: "User already exists" });
        expect(User.create).not.toHaveBeenCalled();
    });

    test("signup maps duplicate key save errors to 409", async () => {
        User.findByNameOrEmail.mockResolvedValue(null);
        User.create.mockRejectedValue({ code: "P2002" });
        bcryptjs.genSalt.mockResolvedValue("salt");
        bcryptjs.hash.mockResolvedValue("hashed-password");

        const response = await request(createApp())
            .post("/api/auth/signup")
            .send({ name: "Bryan", email: "bryan@example.com", password: "Password123!" });

        expect(response.status).toBe(409);
        expect(response.body).toEqual({ message: "User already exists" });
    });

    test("localhost login cookie is set without Secure", async () => {
        process.env.NODE_ENV = "development";
        User.findByName.mockResolvedValue({
            id: "user-1",
            name: "Bryan",
            email: "bryan@example.com",
            avatarUrl: null,
            passwordHash: "hash",
        });
        bcryptjs.compare.mockResolvedValue(true);

        const response = await request(createApp())
            .post("/api/auth/login")
            .send({ name: "Bryan", password: "password" });

        const cookie = response.headers["set-cookie"][0];
        expect(response.status).toBe(302);
        expect(response.headers.location).toBe("/team-select");
        expect(cookie).toContain("loginToken=");
        expect(cookie).toContain("HttpOnly");
        expect(cookie).toContain("SameSite=Strict");
        expect(cookie).not.toContain("Secure");
    });

    test("production login cookie includes Secure", async () => {
        process.env.NODE_ENV = "production";
        User.findByName.mockResolvedValue({
            id: "user-1",
            name: "Bryan",
            email: "bryan@example.com",
            avatarUrl: null,
            passwordHash: "hash",
        });
        bcryptjs.compare.mockResolvedValue(true);

        const response = await request(createApp())
            .post("/api/auth/login")
            .send({ name: "Bryan", password: "password" });

        expect(response.headers["set-cookie"][0]).toContain("Secure");
    });

    test("logout clears cookie and redirects without a loginToken", async () => {
        const response = await request(createApp()).post("/api/auth/logout");

        const cookie = response.headers["set-cookie"][0];
        expect(response.status).toBe(302);
        expect(response.headers.location).toBe("/login");
        expect(cookie).toContain("loginToken=;");
        expect(cookie).toContain("Path=/");
        expect(response.headers["set-cookie"][1]).toContain("roleToken=;");
    });

    test("logout clears invalid loginToken without failing", async () => {
        const response = await request(createApp())
            .post("/api/auth/logout")
            .set("Cookie", "loginToken=bad-login-token");

        expect(response.status).toBe(302);
        expect(response.headers.location).toBe("/login");
        expect(User.update).not.toHaveBeenCalled();
    });

    test("valid logout updates user state", async () => {
        const loginToken = jwt.sign({ userId: "user-1" }, process.env.JWT_SECRET);

        const response = await request(createApp())
            .post("/api/auth/logout")
            .set("Cookie", `loginToken=${loginToken}`);

        expect(response.status).toBe(302);
        expect(User.update).toHaveBeenCalledWith("user-1", {
            isActive: false,
            lastLogoutAt: expect.any(Date),
        });
    });

    test("update uses JWT user id and ignores body userId", async () => {
        const loginToken = jwt.sign({ userId: "real-user" }, process.env.JWT_SECRET);
        User.findById.mockResolvedValue({ passwordHash: "hash" });
        bcryptjs.compare.mockResolvedValue(true);

        const response = await request(createApp())
            .post("/api/auth/update")
            .set("Cookie", `loginToken=${loginToken}`)
            .send({
                userId: "attacker-user",
                name: "New",
                password: "current-password",
            });

        expect(response.status).toBe(200);
        expect(User.findById).toHaveBeenCalledWith("real-user");
        expect(User.update).toHaveBeenCalledWith("real-user", { name: "New" });
    });

    test("update validates password", async () => {
        const loginToken = jwt.sign({ userId: "real-user" }, process.env.JWT_SECRET);
        User.findById.mockResolvedValue({ passwordHash: "hash" });
        bcryptjs.compare.mockResolvedValue(false);

        const response = await request(createApp())
            .patch("/api/auth/update")
            .set("Cookie", `loginToken=${loginToken}`)
            .send({ password: "wrong-password", name: "New" });

        expect(response.status).toBe(401);
        expect(User.update).not.toHaveBeenCalled();
    });

    test("update rejects missing loginToken before controller lookup", async () => {
        const response = await request(createApp())
            .post("/api/auth/update")
            .send({ password: "current-password", name: "New" });

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ message: "Authentication required" });
        expect(User.findById).not.toHaveBeenCalled();
    });

    test("delete rejects invalid loginToken before controller lookup", async () => {
        const response = await request(createApp())
            .post("/api/auth/delete")
            .set("Cookie", "loginToken=bad-login-token")
            .send({ password: "current-password" });

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ message: "Invalid or expired login token" });
        expect(User.findById).not.toHaveBeenCalled();
    });

    test("delete uses JWT user id, validates password, deletes user, and clears cookie", async () => {
        const loginToken = jwt.sign({ userId: "real-user" }, process.env.JWT_SECRET);
        User.findById.mockResolvedValue({ passwordHash: "hash" });
        bcryptjs.compare.mockResolvedValue(true);

        const response = await request(createApp())
            .post("/api/auth/delete")
            .set("Cookie", `loginToken=${loginToken}`)
            .send({ userId: "attacker-user", password: "current-password" });

        expect(response.status).toBe(302);
        expect(response.headers.location).toBe("/login");
        expect(User.findById).toHaveBeenCalledWith("real-user");
        expect(User.delete).toHaveBeenCalledWith("real-user");
        expect(response.headers["set-cookie"][0]).toContain("loginToken=;");
        expect(response.headers["set-cookie"][1]).toContain("roleToken=;");
    });
});

describe("auth middleware", () => {
    const OLD_ENV = process.env;

    beforeEach(() => {
        process.env = { ...OLD_ENV, JWT_SECRET: "test-secret" };
    });

    afterAll(() => {
        process.env = OLD_ENV;
    });

    const createResponse = () => ({
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
    });

    test("authenticateUser accepts a valid loginToken", () => {
        const loginToken = jwt.sign({ userId: "user-1", name: "Bryan" }, process.env.JWT_SECRET);
        const req = { cookies: { loginToken } };
        const res = createResponse();
        const next = jest.fn();

        authenticateUser(req, res, next);

        expect(req.user).toMatchObject({ userId: "user-1", name: "Bryan" });
        expect(next).toHaveBeenCalled();
    });

    test("authenticateUser rejects missing loginToken", () => {
        const req = { cookies: {} };
        const res = createResponse();
        const next = jest.fn();

        authenticateUser(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: "Authentication required" });
        expect(next).not.toHaveBeenCalled();
    });

    test("authenticateUser rejects invalid loginToken", () => {
        const req = { cookies: { loginToken: "bad-login-token" } };
        const res = createResponse();
        const next = jest.fn();

        authenticateUser(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: "Invalid or expired login token" });
        expect(next).not.toHaveBeenCalled();
    });

    test("authorizeUserRole accepts a matching roleToken", () => {
        const roleToken = jwt.sign({ userId: "user-1", teamId: "team-1", teamName: "Team A", role: "owner" }, process.env.JWT_SECRET);
        const req = {
            cookies: { roleToken },
            user: { userId: "user-1", name: "Bryan", email: "bryan@example.com", avatarUrl: null },
        };
        const res = createResponse();
        const next = jest.fn();

        authorizeUserRole(req, res, next);

        expect(req.user).toEqual({
            userId: "user-1",
            name: "Bryan",
            email: "bryan@example.com",
            avatarUrl: null,
            teamId: "team-1",
            teamName: "Team A",
            role: "owner",
        });
        expect(next).toHaveBeenCalled();
    });

    test("authorizeUserRole rejects missing roleToken", () => {
        const req = { cookies: {}, user: { userId: "user-1" } };
        const res = createResponse();
        const next = jest.fn();

        authorizeUserRole(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: "Team role authorization required" });
        expect(next).not.toHaveBeenCalled();
    });

    test("authorizeUserRole rejects mismatched user IDs", () => {
        const roleToken = jwt.sign({ userId: "other-user", teamId: "team-1", role: "owner" }, process.env.JWT_SECRET);
        const req = { cookies: { roleToken }, user: { userId: "user-1" } };
        const res = createResponse();
        const next = jest.fn();

        authorizeUserRole(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: "Invalid team role authorization" });
        expect(next).not.toHaveBeenCalled();
    });

    test("authorizeUserRole rejects roleToken without teamId or role", () => {
        const roleToken = jwt.sign({ userId: "user-1", teamName: "Team A" }, process.env.JWT_SECRET);
        const req = { cookies: { roleToken }, user: { userId: "user-1" } };
        const res = createResponse();
        const next = jest.fn();

        authorizeUserRole(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: "Invalid team role authorization" });
        expect(next).not.toHaveBeenCalled();
    });
});

