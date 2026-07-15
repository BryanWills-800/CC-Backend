const express = require("express");
const cookieParser = require("cookie-parser");
const request = require("supertest");
const jwt = require("jsonwebtoken");

const mockPrismaHealthCheck = jest.fn();

jest.mock("../db/prismaConnect", () => ({
    prismaHealthCheck: mockPrismaHealthCheck,
}));

jest.mock("../services/actions/teamServices", () => ({
    changeRolesService: jest.fn(),
    createTeamService: jest.fn(),
    inviteMembersService: jest.fn(),
    joinTeamService: jest.fn(),
}));

jest.mock("../services/actions/createProjectServices", () => ({
    createProjectService: jest.fn(),
}));

jest.mock("../services/actions/projectServices", () => ({
    deleteProjectService: jest.fn(),
    updateProjectService: jest.fn(),
}));

jest.mock("../services/actions/taskServices", () => ({
    assignTaskService: jest.fn(),
    commentService: jest.fn(),
    createTaskService: jest.fn(),
    deleteTaskService: jest.fn(),
    updateTaskService: jest.fn(),
    viewTasksService: jest.fn(),
}));

jest.mock("../db/prismaRepositories", () => ({
    prismaRepositories: {
        Team: {
            findById: jest.fn(),
        },
        TeamMembership: {
            findForUserTeam: jest.fn(),
            findForTeam: jest.fn(),
        },
        Project: {
            findById: jest.fn(),
            findForTeam: jest.fn(),
        },
        Task: {
            findById: jest.fn(),
        },
        Comment: {
            findForTask: jest.fn(),
        },
        ActivityLog: {
            findForTeam: jest.fn(),
        },
    },
}));

const { prismaRepositories } = require("../db/prismaRepositories");
const teamServices = require("../services/actions/teamServices");
const { createProjectService } = require("../services/actions/createProjectServices");
const projectServices = require("../services/actions/projectServices");
const taskServices = require("../services/actions/taskServices");
const restApiRoutes = require("../routes/restApiRoutes");
const { health } = require("../controllers/restApiController");

const createApp = () => {
    const app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.get("/health", health);
    app.use("/v1/api", restApiRoutes);
    return app;
};

const authCookie = () => `loginToken=${jwt.sign({ userId: "user-1", name: "Bryan" }, process.env.JWT_SECRET)}`;

describe("REST API routes", () => {
    const OLD_ENV = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...OLD_ENV, JWT_SECRET: "test-secret" };
        prismaRepositories.Team.findById.mockResolvedValue({ id: "team-1", name: "Team A", isArchived: false });
        prismaRepositories.TeamMembership.findForUserTeam.mockResolvedValue({ teamId: "team-1", userId: "user-1", role: "owner" });
        prismaRepositories.TeamMembership.findForTeam.mockResolvedValue([{ userId: "user-1", role: "owner" }]);
        prismaRepositories.Project.findById.mockResolvedValue({ id: "project-1", teamId: "team-1", name: "Project", isDeleted: false });
        prismaRepositories.Project.findForTeam.mockResolvedValue([{ id: "project-1", teamId: "team-1" }]);
        prismaRepositories.Task.findById.mockResolvedValue({ id: "task-1", teamId: "team-1", projectId: "project-1", assignedTo: [{ id: "user-1" }], isDeleted: false });
        prismaRepositories.Comment.findForTask.mockResolvedValue([{ id: "comment-1", taskId: "task-1" }]);
        prismaRepositories.ActivityLog.findForTeam.mockResolvedValue([{ id: "log-1", teamId: "team-1" }]);
        teamServices.createTeamService.mockResolvedValue({ message: "Team created.", data: { id: "team-1" } });
        teamServices.joinTeamService.mockResolvedValue({ message: "Team joined successfully.", data: { id: "membership-1" } });
        teamServices.inviteMembersService.mockResolvedValue({ message: "Invitation created.", data: { id: "invite-1", invitationToken: "raw-token" } });
        teamServices.changeRolesService.mockResolvedValue({ message: "Role changed.", data: { role: "viewer" } });
        createProjectService.mockResolvedValue({ id: "project-1", name: "Project" });
        projectServices.updateProjectService.mockResolvedValue({ message: "Project updated.", data: { id: "project-1" } });
        projectServices.deleteProjectService.mockResolvedValue({ message: "Project deleted." });
        taskServices.viewTasksService.mockResolvedValue({
            message: "Found 1 task(s).",
            data: [{ id: "task-1" }],
            pagination: { page: 2, limit: 5, total: 6, pages: 2 },
        });
        taskServices.createTaskService.mockResolvedValue({ message: "Task created.", data: { id: "task-1" } });
        taskServices.updateTaskService.mockResolvedValue({ message: "Task updated.", data: { id: "task-1" } });
        taskServices.deleteTaskService.mockResolvedValue({ message: "Task deleted." });
        taskServices.assignTaskService.mockResolvedValue({ message: "Task assigned.", data: { id: "task-1" } });
        taskServices.commentService.mockResolvedValue({ message: "Comment created.", data: { id: "comment-1" } });
        mockPrismaHealthCheck.mockResolvedValue(true);
    });

    afterAll(() => {
        process.env = OLD_ENV;
    });

    test("creates a team", async () => {
        const response = await request(createApp()).post("/v1/api/teams").set("Cookie", authCookie()).send({ name: "Team A" });

        expect(response.status).toBe(201);
        expect(response.body).toEqual({ message: "Team created.", data: { id: "team-1" } });
        expect(teamServices.createTeamService).toHaveBeenCalledWith(expect.objectContaining({ userId: "user-1", name: "Team A" }));
    });

    test("validates required REST payloads", async () => {
        const response = await request(createApp()).post("/v1/api/teams").set("Cookie", authCookie()).send({});

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ code: "VALIDATION_ERROR", message: "name is required" });
    });

    test("gets team details and members", async () => {
        const teamResponse = await request(createApp()).get("/v1/api/teams/team-1").set("Cookie", authCookie());
        const membersResponse = await request(createApp()).get("/v1/api/teams/team-1/members").set("Cookie", authCookie());

        expect(teamResponse.status).toBe(200);
        expect(membersResponse.body.data).toEqual([{ userId: "user-1", role: "owner" }]);
    });

    test("joins, invites, and changes roles", async () => {
        const joinResponse = await request(createApp()).post("/v1/api/teams/team-1/join").set("Cookie", authCookie()).send({ token: "raw-token" });
        const inviteResponse = await request(createApp()).post("/v1/api/teams/team-1/invitations").set("Cookie", authCookie()).send({ email: "a@example.com" });
        const roleResponse = await request(createApp()).patch("/v1/api/teams/team-1/members/user-2/role").set("Cookie", authCookie()).send({ role: "viewer" });

        expect(joinResponse.status).toBe(201);
        expect(inviteResponse.status).toBe(201);
        expect(inviteResponse.body.data.invitationToken).toBe("raw-token");
        expect(roleResponse.status).toBe(200);
    });

    test("rejects invalid role payloads", async () => {
        const response = await request(createApp()).patch("/v1/api/teams/team-1/members/user-2/role").set("Cookie", authCookie()).send({ role: "owner" });

        expect(response.status).toBe(400);
        expect(response.body.code).toBe("VALIDATION_ERROR");
    });

    test("lists, creates, gets, updates, and deletes projects", async () => {
        expect((await request(createApp()).get("/v1/api/teams/team-1/projects").set("Cookie", authCookie())).status).toBe(200);
        expect((await request(createApp()).post("/v1/api/teams/team-1/projects").set("Cookie", authCookie()).send({ name: "Project" })).status).toBe(201);
        expect((await request(createApp()).get("/v1/api/projects/project-1").set("Cookie", authCookie())).status).toBe(200);
        expect((await request(createApp()).patch("/v1/api/projects/project-1").set("Cookie", authCookie()).send({ status: "completed" })).status).toBe(200);
        expect((await request(createApp()).delete("/v1/api/projects/project-1").set("Cookie", authCookie())).status).toBe(204);
    });

    test("rejects invalid project status", async () => {
        const response = await request(createApp()).patch("/v1/api/projects/project-1").set("Cookie", authCookie()).send({ status: "bad" });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ code: "VALIDATION_ERROR", message: "status is invalid" });
    });

    test("lists tasks with filters and pagination", async () => {
        const response = await request(createApp())
            .get("/v1/api/teams/team-1/tasks?status=todo&priority=high&search=build&page=2&limit=5")
            .set("Cookie", authCookie());

        expect(response.status).toBe(200);
        expect(response.body.pagination).toEqual({ page: 2, limit: 5, total: 6, pages: 2 });
        expect(taskServices.viewTasksService).toHaveBeenCalledWith(expect.objectContaining({
            status: "todo",
            priority: "high",
            search: "build",
            page: 2,
            limit: 5,
        }));
    });

    test("rejects invalid task filters and pagination", async () => {
        const priorityResponse = await request(createApp()).get("/v1/api/teams/team-1/tasks?priority=bad").set("Cookie", authCookie());
        const pageResponse = await request(createApp()).get("/v1/api/teams/team-1/tasks?page=0").set("Cookie", authCookie());

        expect(priorityResponse.status).toBe(400);
        expect(pageResponse.status).toBe(400);
    });

    test("creates, gets, updates, deletes, and assigns tasks", async () => {
        expect((await request(createApp()).post("/v1/api/projects/project-1/tasks").set("Cookie", authCookie()).send({ title: "Task" })).status).toBe(201);
        expect((await request(createApp()).get("/v1/api/tasks/task-1").set("Cookie", authCookie())).status).toBe(200);
        expect((await request(createApp()).patch("/v1/api/tasks/task-1").set("Cookie", authCookie()).send({ status: "done" })).status).toBe(200);
        expect((await request(createApp()).post("/v1/api/tasks/task-1/assignees").set("Cookie", authCookie()).send({ assigneeId: "user-2" })).status).toBe(200);
        expect((await request(createApp()).delete("/v1/api/tasks/task-1").set("Cookie", authCookie())).status).toBe(204);
    });

    test("lists and creates comments", async () => {
        const listResponse = await request(createApp()).get("/v1/api/tasks/task-1/comments").set("Cookie", authCookie());
        const createResponse = await request(createApp()).post("/v1/api/tasks/task-1/comments").set("Cookie", authCookie()).send({ content: "Looks good" });

        expect(listResponse.status).toBe(200);
        expect(createResponse.status).toBe(201);
    });

    test("lists activity", async () => {
        const response = await request(createApp()).get("/v1/api/teams/team-1/activity").set("Cookie", authCookie());

        expect(response.status).toBe(200);
        expect(response.body.data).toEqual([{ id: "log-1", teamId: "team-1" }]);
    });

    test("reports health success and failure", async () => {
        const success = await request(createApp()).get("/health");
        mockPrismaHealthCheck.mockRejectedValueOnce(new Error("down"));
        const failure = await request(createApp()).get("/health");

        expect(success.status).toBe(200);
        expect(success.body.database).toBe("connected");
        expect(failure.status).toBe(503);
        expect(failure.body.code).toBe("DATABASE_UNAVAILABLE");
    });
});
