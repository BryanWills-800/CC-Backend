const ejs = require("ejs");
const path = require("path");

const partialPath = path.join(__dirname, "../views/mainView/partials/commandButtons.ejs");

const renderButtons = (role) => ejs.renderFile(partialPath, { role });

describe("command buttons partial", () => {
    test("viewer sees only viewer actions", async () => {
        const html = await renderButtons("viewer");

        expect(html).toContain("View Tasks");
        expect(html).toContain("Comment");
        expect(html).not.toContain("Create Task");
        expect(html).not.toContain("Change Roles");
    });

    test("member inherits viewer actions and can create tasks", async () => {
        const html = await renderButtons("member");

        expect(html).toContain("View Tasks");
        expect(html).toContain("Create Task");
        expect(html).not.toContain("Invite Members");
    });

    test("maintainer sees project and task management actions", async () => {
        const html = await renderButtons("maintainer");

        expect(html).toContain("Create Project");
        expect(html).toContain("Assign Task");
        expect(html).toContain("Delete Task");
        expect(html).not.toContain("Change Roles");
    });

    test("admin role sees all actions", async () => {
        const html = await renderButtons("admin");

        expect(html).toContain("Update Project");
        expect(html).toContain("Change Roles");
        expect(html).toContain("Invite Members");
    });

    test("unknown roles fall back to viewer actions", async () => {
        const html = await renderButtons("stranger");

        expect(html).toContain("View Tasks");
        expect(html).toContain("Comment");
        expect(html).not.toContain("Create Task");
    });
});