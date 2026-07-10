jest.mock("../services/createProject", () => ({
    createProject: {
        meta: {
            PROJECT_CREATOR_ROLES: ["owner", "maintainer"],
        },
        services: {
            createProjectService: jest.fn(),
        },
    },
}));

jest.mock("../services/actionMessageServices", () => ({
    actionMessageServices: {
        assignTask: jest.fn(),
        changeRoles: jest.fn(),
        comment: jest.fn(),
        createTask: jest.fn(),
        createTeam: jest.fn(),
        deleteProject: jest.fn(),
        deleteTask: jest.fn(),
        editProject: jest.fn(),
        inviteMembers: jest.fn(),
        updateAssignedTask: jest.fn(),
        updateProject: jest.fn(),
        viewTasks: jest.fn(),
    },
}));

const express = require("express");
const path = require("path");
const request = require("supertest");
const { actionController } = require("../controllers/actionController");
const { createProject } = require("../services/createProject");
const { actionMessageServices } = require("../services/actionMessageServices");

const createApp = () => {
    const app = express();
    app.set("view engine", "ejs");
    app.set("views", [
        path.join(__dirname, "../views/mainView"),
        path.join(__dirname, "../views"),
    ]);
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());
    app.use((req, res, next) => {
        req.user = { userId: "user-1" };
        next();
    });
    app.get("/actions", actionController);
    app.post("/actions", actionController);
    return app;
};

const actionCases = [
    ["viewTasks", "viewTasks", "View tasks"],
    ["comment", "comment", "Create comment"],
    ["createTask", "createTask", "Create task"],
    ["createTeam", "createTeam", "Create team"],
    ["updateAssignedTask", "updateAssignedTask", "Update assigned task"],
    ["inviteMembers", "inviteMembers", "Invite member"],
    ["editProject", "editProject", "Load project for editing"],
    ["updateProject", "updateProject", "Update project"],
    ["deleteProject", "deleteProject", "Delete project"],
    ["assignTask", "assignTask", "Assign task"],
    ["deleteTask", "deleteTask", "Delete task"],
    ["changeRoles", "changeRoles", "Change team role"],
];

describe("actionController", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        Object.values(actionMessageServices).forEach((service) => {
            service.mockResolvedValue({ message: "Action completed successfully." });
        });
    });

    test.each(actionCases)("renders %s action form", async (action, _serviceName, expectedTitle) => {
        const response = await request(createApp()).get(`/actions?action=${action}`);

        expect(response.status).toBe(200);
        expect(response.text).toContain(expectedTitle);
        expect(response.text).toContain(`value=\"${action}\"`);
    });

    test.each(actionCases)("submits %s through its action service", async (action, serviceName) => {
        const response = await request(createApp())
            .post("/actions")
            .send(`action=${action}`);

        expect(response.status).toBe(action === "createTeam" ? 201 : 200);
        expect(response.text).toContain("Action completed successfully.");
        expect(actionMessageServices[serviceName]).toHaveBeenCalledWith(expect.objectContaining({
            action,
            userId: "user-1",
            auditContext: {
                ipAddress: expect.any(String),
            },
        }));
    });

    test("renders create project form", async () => {
        const response = await request(createApp()).get("/actions?action=createProject");

        expect(response.status).toBe(200);
        expect(response.text).toContain("Create project");
        expect(response.text).toContain("method=\"post\"");
        expect(response.text).toContain("name=\"teamId\"");
        expect(response.text).not.toContain("readonly");
    });

    test("submits create project form through service", async () => {
        createProject.services.createProjectService.mockResolvedValue({ name: "Real Project" });

        const response = await request(createApp())
            .post("/actions")
            .send("action=createProject&teamId=team-1&name=Real%20Project&description=Live&dueDate=2026-08-01");

        expect(response.status).toBe(201);
        expect(response.text).toContain("Project &#34;Real Project&#34; created successfully.");
        expect(createProject.services.createProjectService).toHaveBeenCalledWith(expect.objectContaining({
            teamId: "team-1",
            name: "Real Project",
            description: "Live",
            dueDate: "2026-08-01",
            userId: "user-1",
            auditContext: {
                ipAddress: expect.any(String),
            },
        }));
    });

    test("rerenders create project form with service errors", async () => {
        createProject.services.createProjectService.mockRejectedValue(Object.assign(new Error("Team not found"), { statusCode: 404 }));

        const response = await request(createApp())
            .post("/actions")
            .send("action=createProject&teamId=missing-team&name=Real%20Project");

        expect(response.status).toBe(404);
        expect(response.text).toContain("Team not found");
        expect(response.text).toContain("Real Project");
    });

    test("rejects missing action", async () => {
        const response = await request(createApp()).get("/actions");

        expect(response.status).toBe(400);
        expect(response.text).toBe("Unknown action");
    });

    test("rejects unknown action", async () => {
        const response = await request(createApp())
            .post("/actions")
            .send("action=unknownAction");

        expect(response.status).toBe(400);
        expect(response.text).toBe("Unknown action");
    });
});


