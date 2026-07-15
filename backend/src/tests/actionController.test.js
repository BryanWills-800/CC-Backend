jest.mock("../services/actions/createProjectServices", () => ({
    createProjectService: jest.fn(),
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
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const { actionController } = require("../controllers/actionController");
const { createProjectService } = require("../services/actions/createProjectServices");
const { actionMessageServices } = require("../services/actionMessageServices");
const contentRoutes = require("../routes/contentRoutes");

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


const createContentApp = () => {
    const app = express();
    app.set("view engine", "ejs");
    app.set("views", [
        path.join(__dirname, "../views/mainView"),
        path.join(__dirname, "../views"),
    ]);
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());
    app.use(cookieParser());
    app.use("/api/content", contentRoutes);
    return app;
};

const buildLoginCookie = () => {
    const loginToken = jwt.sign({ userId: "user-1", name: "Bryan" }, process.env.JWT_SECRET);
    return `loginToken=${loginToken}`;
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


    test("content route allows createTeam without a roleToken", async () => {
        process.env.JWT_SECRET = "test-secret";

        const response = await request(createContentApp())
            .get("/api/content/actions?action=createTeam")
            .set("Cookie", buildLoginCookie());

        expect(response.status).toBe(200);
        expect(response.text).toContain("Create team");
    });

    test("content route still requires roleToken for team-scoped actions", async () => {
        process.env.JWT_SECRET = "test-secret";

        const response = await request(createContentApp())
            .get("/api/content/actions?action=createProject")
            .set("Cookie", buildLoginCookie());

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ message: "Team role authorization required" });
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
        expect(createProjectService).toHaveBeenCalledWith(expect.objectContaining({
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






