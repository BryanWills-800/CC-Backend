const express = require("express");
const cookieParser = require("cookie-parser");
const request = require("supertest");
const jwt = require("jsonwebtoken");

jest.mock("bcryptjs", () => ({
    compare: jest.fn(),
    genSalt: jest.fn(),
    hash: jest.fn(),
}));

jest.mock("../models/userModel", () => {
    const MockUser = jest.fn((data) => ({
        ...data,
        save: MockUser.mockSave || jest.fn().mockResolvedValue(undefined),
    }));

    MockUser.findOne = jest.fn();
    MockUser.findById = jest.fn();
    MockUser.findByIdAndUpdate = jest.fn();
    MockUser.findByIdAndDelete = jest.fn();
    MockUser.mockSave = jest.fn().mockResolvedValue(undefined);

    return MockUser;
});

const bcryptjs = require("bcryptjs");
const User = require("../models/userModel");
const authRoutes = require("../routes/authRoutes");

const createApp = () => {
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());
    app.use("/api/auth", authRoutes);
    return app;
};

const createUserQuery = (user) => ({
    select: jest.fn().mockResolvedValue(user),
});

describe("auth flow", () => {
    const OLD_ENV = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        User.mockSave = jest.fn().mockResolvedValue(undefined);
        process.env = { ...OLD_ENV, JWT_SECRET: "test-secret" };
    });

    afterAll(() => {
        process.env = OLD_ENV;
    });

    test("signup hashes password, saves user, and redirects to login", async () => {
        User.findOne.mockResolvedValue(null);
        bcryptjs.genSalt.mockResolvedValue("salt");
        bcryptjs.hash.mockResolvedValue("hashed-password");

        const response = await request(createApp())
            .post("/api/auth/signup")
            .send({ name: "Bryan", email: "bryan@example.com", password: "Password123!" });

        expect(response.status).toBe(302);
        expect(response.headers.location).toBe("/login");
        expect(User.findOne).toHaveBeenCalledWith({ $or: [{ name: "Bryan" }, { email: "bryan@example.com" }] });
        expect(bcryptjs.hash).toHaveBeenCalledWith("Password123!", "salt");
        expect(User).toHaveBeenCalledWith({
            name: "Bryan",
            email: "bryan@example.com",
            passwordHash: "hashed-password",
        });
        expect(User.mockSave).toHaveBeenCalled();
    });

    test("signup returns 409 when name or email already exists", async () => {
        User.findOne.mockResolvedValue({ _id: "existing-user" });

        const response = await request(createApp())
            .post("/api/auth/signup")
            .send({ name: "Bryan", email: "bryan@example.com", password: "Password123!" });

        expect(response.status).toBe(409);
        expect(response.body).toEqual({ message: "User already exists" });
        expect(User.mockSave).not.toHaveBeenCalled();
    });

    test("signup maps duplicate key save errors to 409", async () => {
        User.findOne.mockResolvedValue(null);
        User.mockSave = jest.fn().mockRejectedValue({ code: 11000 });
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
        const user = {
            _id: "user-1",
            name: "Bryan",
            email: "bryan@example.com",
            avatarUrl: null,
            passwordHash: "hash",
            save: jest.fn().mockResolvedValue(undefined),
        };
        User.findOne.mockReturnValue(createUserQuery(user));
        bcryptjs.compare.mockResolvedValue(true);

        const response = await request(createApp())
            .post("/api/auth/login")
            .send({ name: "Bryan", password: "password" });

        const cookie = response.headers["set-cookie"][0];
        expect(response.status).toBe(302);
        expect(response.headers.location).toBe("/main");
        expect(cookie).toContain("token=");
        expect(cookie).toContain("HttpOnly");
        expect(cookie).toContain("SameSite=Strict");
        expect(cookie).not.toContain("Secure");
    });

    test("production login cookie includes Secure", async () => {
        process.env.NODE_ENV = "production";
        const user = {
            _id: "user-1",
            name: "Bryan",
            email: "bryan@example.com",
            avatarUrl: null,
            passwordHash: "hash",
            save: jest.fn().mockResolvedValue(undefined),
        };
        User.findOne.mockReturnValue(createUserQuery(user));
        bcryptjs.compare.mockResolvedValue(true);

        const response = await request(createApp())
            .post("/api/auth/login")
            .send({ name: "Bryan", password: "password" });

        expect(response.headers["set-cookie"][0]).toContain("Secure");
    });

    test("logout clears cookie and redirects without a token", async () => {
        const response = await request(createApp()).post("/api/auth/logout");

        const cookie = response.headers["set-cookie"][0];
        expect(response.status).toBe(302);
        expect(response.headers.location).toBe("/login");
        expect(cookie).toContain("token=;");
        expect(cookie).toContain("Path=/");
    });

    test("logout clears invalid token without failing", async () => {
        const response = await request(createApp())
            .post("/api/auth/logout")
            .set("Cookie", "token=bad-token");

        expect(response.status).toBe(302);
        expect(response.headers.location).toBe("/login");
        expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    test("valid logout updates user state", async () => {
        const token = jwt.sign({ userId: "user-1" }, process.env.JWT_SECRET);

        const response = await request(createApp())
            .post("/api/auth/logout")
            .set("Cookie", `token=${token}`);

        expect(response.status).toBe(302);
        expect(User.findByIdAndUpdate).toHaveBeenCalledWith("user-1", {
            isActive: false,
            lastLogoutAt: expect.any(Number),
        });
    });

    test("update uses JWT user id and ignores body userId", async () => {
        const token = jwt.sign({ userId: "real-user" }, process.env.JWT_SECRET);
        const user = {
            passwordHash: "hash",
            name: "Old",
            email: "old@example.com",
            avatarUrl: null,
            save: jest.fn().mockResolvedValue(undefined),
        };
        User.findById.mockReturnValue(createUserQuery(user));
        bcryptjs.compare.mockResolvedValue(true);

        const response = await request(createApp())
            .post("/api/auth/update")
            .set("Cookie", `token=${token}`)
            .send({
                userId: "attacker-user",
                name: "New",
                password: "current-password",
            });

        expect(response.status).toBe(200);
        expect(User.findById).toHaveBeenCalledWith("real-user");
        expect(user.name).toBe("New");
        expect(user.save).toHaveBeenCalled();
    });

    test("update validates password", async () => {
        const token = jwt.sign({ userId: "real-user" }, process.env.JWT_SECRET);
        const user = {
            passwordHash: "hash",
            save: jest.fn(),
        };
        User.findById.mockReturnValue(createUserQuery(user));
        bcryptjs.compare.mockResolvedValue(false);

        const response = await request(createApp())
            .patch("/api/auth/update")
            .set("Cookie", `token=${token}`)
            .send({ password: "wrong-password", name: "New" });

        expect(response.status).toBe(401);
        expect(user.save).not.toHaveBeenCalled();
    });


    test("update rejects missing token before controller lookup", async () => {
        const response = await request(createApp())
            .post("/api/auth/update")
            .send({ password: "current-password", name: "New" });

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ message: "Unauthorized: No token provided" });
        expect(User.findById).not.toHaveBeenCalled();
    });

    test("delete rejects invalid token before controller lookup", async () => {
        const response = await request(createApp())
            .post("/api/auth/delete")
            .set("Cookie", "token=bad-token")
            .send({ password: "current-password" });

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ message: "Unauthorized: Invalid token" });
        expect(User.findById).not.toHaveBeenCalled();
    });
    test("delete uses JWT user id, validates password, deletes user, and clears cookie", async () => {
        const token = jwt.sign({ userId: "real-user" }, process.env.JWT_SECRET);
        const user = { passwordHash: "hash" };
        User.findById.mockReturnValue(createUserQuery(user));
        bcryptjs.compare.mockResolvedValue(true);
        User.findByIdAndDelete.mockResolvedValue(undefined);

        const response = await request(createApp())
            .post("/api/auth/delete")
            .set("Cookie", `token=${token}`)
            .send({ userId: "attacker-user", password: "current-password" });

        expect(response.status).toBe(302);
        expect(response.headers.location).toBe("/login");
        expect(User.findById).toHaveBeenCalledWith("real-user");
        expect(User.findByIdAndDelete).toHaveBeenCalledWith("real-user");
        expect(response.headers["set-cookie"][0]).toContain("token=;");
    });
});