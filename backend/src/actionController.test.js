jest.mock("../services/createProject", () => ({
    PROJECT_CREATOR_ROLES: ["owner", "maintainer"],
    createProjectService: jest.fn(),
}));

const express = require("express");
const path = require("path");
const request = require("supertest");
const { actionController } = require("../controllers/actionController");
const { createProjectService } = require("../services/createProject");

const createApp = () => {
    const app = express();
    app.set("view engine", "ejs");
    app.set("views", [
        path.join(__dirname, "../views/mainView"),
        path.join(__dirname, "../views"),
    ]);
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());
    app.get("/actions", actionController);
    app.use((req, res, next) => {
        req.user = { userId: "user-1" };
        next();
    });
    app.post("/actions", actionController);
    return app;
};

describe("actionController", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    const cases = [
        ["viewTasks", "View Tasks action selected"],
        ["comment", "Comment action selected"],
        ["createTask", "Create Task action selected"],
        ["updateAssignedTask", "Update Assigned Task action selected"],
        ["inviteMembers", "Invite Members action selected"],
        ["editProject", "Edit Project action selected"],
        ["updateProject", "Update Project action selected"],
        ["deleteProject", "Delete Project action selected"],
        ["assignTask", "Assign Task action selected"],
        ["deleteTask", "Delete Task action selected"],
        ["changeRoles", "Change Roles action selected"],
    ];

    test.each(cases)("handles %s from form body", async (action, expectedText) => {
        const response = await request(createApp())
            .post("/actions")
            .send(`action=${action}`);

        expect(response.status).toBe(200);
        expect(response.text).toBe(expectedText);
    });

    test.each(cases)("handles %s from query string", async (action, expectedText) => {
        const response = await request(createApp()).get(`/actions?action=${action}`);

        expect(response.status).toBe(200);
        expect(response.text).toBe(expectedText);
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
        createProjectService.mockResolvedValue({ name: "Real Project" });

        const response = await request(createApp())
            .post("/actions")
            .send("action=createProject&teamId=team-1&name=Real%20Project&description=Live&dueDate=2026-08-01");

        expect(response.status).toBe(201);
        expect(response.text).toContain("Project &#34;Real Project&#34; created successfully.");
        expect(createProjectService).toHaveBeenCalledWith({
            teamId: "team-1",
            name: "Real Project",
            description: "Live",
            dueDate: "2026-08-01",
            userId: "user-1",
            ipAddress: expect.any(String),
        });
    });

    test("rerenders create project form with service errors", async () => {
        createProjectService.mockRejectedValue(Object.assign(new Error("Team not found"), { statusCode: 404 }));

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




