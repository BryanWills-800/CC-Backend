const express = require("express");
const request = require("supertest");
const { actionController } = require("../controllers/actionController");

const createApp = () => {
    const app = express();
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());
    app.get("/actions", actionController);
    app.post("/actions", actionController);
    return app;
};

describe("actionController", () => {
    const cases = [
        ["viewTasks", "View Tasks action selected"],
        ["comment", "Comment action selected"],
        ["createTask", "Create Task action selected"],
        ["updateAssignedTask", "Update Assigned Task action selected"],
        ["inviteMembers", "Invite Members action selected"],
        ["createProject", "Create Project action selected"],
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