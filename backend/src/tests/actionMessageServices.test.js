const nodeTest = typeof global.describe === "function" ? null : require("node:test");
const describeFn = global.describe || nodeTest.describe;
const beforeEachFn = global.beforeEach || nodeTest.beforeEach;
const testFn = global.test || nodeTest.test;
const assert = require("node:assert/strict");

const { actionMessageServices } = require("../services/actionMessageServices");
const { createActionDeps } = require("./serviceTestUtils");

const allowMembership = (deps, role = "maintainer") => {
    deps.TeamMembership.findForUserTeam.mockResolvedValue({ role });
};

describeFn("action message services", () => {
    let deps;

    beforeEachFn(() => {
        deps = createActionDeps();
        deps.Team.findById.mockResolvedValue({ id: "team-1", isArchived: false });
        deps.ActivityLog.create.mockResolvedValue({ id: "log-1" });
        allowMembership(deps);
    });

    testFn("creates a team with owner membership and activity log", async () => {
        deps.Team.create.mockImplementation(async (payload) => ({ id: "team-new", ...payload }));
        deps.TeamMembership.create.mockResolvedValue({ id: "membership-1" });

        const result = await actionMessageServices.createTeam({
            userId: "user-1",
            name: " Team A ",
            description: " New workspace ",
            auditContext: { ipAddress: "127.0.0.1" },
        }, deps);

        assert.equal(result.message, "Team \"Team A\" created successfully.");
        assert.deepEqual(deps.Team.create.calls[0][0], {
            name: "Team A",
            description: "New workspace",
            slug: "team-a",
            createdById: "user-1",
        });
        assert.deepEqual(deps.TeamMembership.create.calls[0][0], {
            teamId: "team-new",
            userId: "user-1",
            role: "owner",
            invitedById: null,
        });
        assert.equal(deps.ActivityLog.create.calls[0][0].action, "team.created");
        assert.equal(deps.ActivityLog.create.calls[0][0].ipAddress, "127.0.0.1");
    });

    testFn("rejects create team without an authenticated user", async () => {
        await assert.rejects(
            () => actionMessageServices.createTeam({ name: "Team A" }, deps),
            { statusCode: 401, message: "Authenticated user is required" }
        );
    });

    testFn("rejects create team without a name", async () => {
        await assert.rejects(
            () => actionMessageServices.createTeam({ userId: "user-1", name: "   " }, deps),
            { statusCode: 400, message: "Team name is required" }
        );
    });

    testFn("creates a team with an optional blank description", async () => {
        deps.Team.create.mockImplementation(async (payload) => ({ id: "team-new", ...payload }));
        deps.TeamMembership.create.mockResolvedValue({ id: "membership-1" });

        await actionMessageServices.createTeam({ userId: "user-1", name: "Team B" }, deps);

        assert.equal(deps.Team.create.calls[0][0].description, "");
    });

    testFn("views tasks for a team member", async () => {
        deps.Task.find.mockResolvedValue([{ title: "One" }, { title: "Two" }]);

        const result = await actionMessageServices.viewTasks({ teamId: "team-1", userId: "user-1" }, deps);

        assert.equal(result.message, "Found 2 task(s).");
        assert.deepEqual(deps.Task.find.calls, [[{ isDeleted: false, teamId: "team-1" }]]);
    });

    testFn("creates a task and logs activity", async () => {
        deps.Project.findById.mockResolvedValue({ id: "project-1", teamId: "team-1", isDeleted: false });
        deps.Task.create.mockResolvedValue({ id: "task-1", title: "Build API" });

        const result = await actionMessageServices.createTask({
            projectId: "project-1",
            userId: "user-1",
            title: " Build API ",
            auditContext: { ipAddress: "127.0.0.1" },
        }, deps);

        assert.equal(result.message, "Task \"Build API\" created successfully.");
        assert.deepEqual(deps.Task.create.calls[0][0], {
            teamId: "team-1",
            projectId: "project-1",
            title: "Build API",
            description: "",
            status: "todo",
            priority: "medium",
            createdById: "user-1",
            dueDate: null,
        });
        assert.equal(deps.ActivityLog.create.calls[0][0].action, "task.created");
        assert.equal(deps.ActivityLog.create.calls[0][0].ipAddress, "127.0.0.1");
    });

    testFn("rejects create task without a title", async () => {
        await assert.rejects(
            () => actionMessageServices.createTask({ projectId: "project-1", userId: "user-1" }, deps),
            { statusCode: 400, message: "Task title is required" }
        );
    });

    testFn("updates only an assigned task", async () => {
        const task = { id: "task-1", teamId: "team-1", title: "Build API", assignedTo: [{ id: "user-1" }], status: "todo" };
        deps.Task.findById.mockResolvedValue(task);
        deps.Task.update.mockResolvedValue({ ...task, status: "done", completedAt: new Date() });

        const result = await actionMessageServices.updateAssignedTask({ taskId: "task-1", userId: "user-1", status: "done" }, deps);

        assert.equal(result.message, "Task \"Build API\" updated successfully.");
        assert.equal(deps.Task.update.calls[0][1].status, "done");
        assert.ok(deps.Task.update.calls[0][1].completedAt);
    });

    testFn("rejects updates for unassigned users", async () => {
        deps.Task.findById.mockResolvedValue({ id: "task-1", teamId: "team-1", assignedTo: [{ id: "other-user" }] });

        await assert.rejects(
            () => actionMessageServices.updateAssignedTask({ taskId: "task-1", userId: "user-1", status: "done" }, deps),
            { statusCode: 403, message: "Only assigned users can update this task" }
        );
    });

    testFn("creates a comment and logs activity", async () => {
        deps.Task.findById.mockResolvedValue({ id: "task-1", teamId: "team-1", projectId: "project-1", isDeleted: false });
        deps.Comment.create.mockResolvedValue({ id: "comment-1", content: "Looks good" });

        const result = await actionMessageServices.comment({ taskId: "task-1", userId: "user-1", content: " Looks good " }, deps);

        assert.equal(result.message, "Comment created successfully.");
        assert.equal(deps.Comment.create.calls[0][0].content, "Looks good");
        assert.equal(deps.ActivityLog.create.calls[0][0].action, "comment.created");
    });

    testFn("creates a team invitation", async () => {
        deps.TeamInvitation.create.mockImplementation(async (payload) => ({ id: "invite-1", ...payload }));

        const result = await actionMessageServices.inviteMembers({ teamId: "team-1", userId: "user-1", email: "NEW@EXAMPLE.COM", role: "member" }, deps);

        assert.equal(result.message, "Invitation created for new@example.com.");
        assert.equal(deps.TeamInvitation.create.calls[0][0].email, "new@example.com");
        assert.equal(deps.TeamInvitation.create.calls[0][0].role, "member");
    });

    testFn("loads a project for editing", async () => {
        deps.Project.findById.mockResolvedValue({ id: "project-1", teamId: "team-1", name: "Core", isDeleted: false });

        const result = await actionMessageServices.editProject({ projectId: "project-1", userId: "user-1" }, deps);

        assert.equal(result.message, "Project \"Core\" is ready to edit.");
    });

    testFn("updates a project and logs activity", async () => {
        const project = { id: "project-1", teamId: "team-1", name: "Core", status: "active", isDeleted: false };
        deps.Project.findById.mockResolvedValue(project);
        deps.Project.update.mockResolvedValue({ ...project, name: "Core API", status: "completed" });

        const result = await actionMessageServices.updateProject({ projectId: "project-1", userId: "user-1", name: "Core API", status: "completed" }, deps);

        assert.equal(result.message, "Project \"Core API\" updated successfully.");
        assert.equal(deps.Project.update.calls[0][1].name, "Core API");
        assert.equal(deps.ActivityLog.create.calls[0][0].action, "project.updated");
    });

    testFn("soft deletes a project", async () => {
        const project = { id: "project-1", teamId: "team-1", name: "Core", status: "active", isDeleted: false };
        deps.Project.findById.mockResolvedValue(project);
        deps.Project.softDelete.mockResolvedValue({ ...project, isDeleted: true, status: "archived" });

        const result = await actionMessageServices.deleteProject({ projectId: "project-1", userId: "user-1" }, deps);

        assert.equal(result.message, "Project \"Core\" deleted successfully.");
        assert.equal(deps.Project.softDelete.calls[0][0], "project-1");
    });

    testFn("assigns a task to a team member", async () => {
        const task = { id: "task-1", teamId: "team-1", title: "Build API", assignedTo: [], isDeleted: false };
        deps.Task.findById.mockResolvedValue(task);
        deps.TeamMembership.findForUserTeam.mockImplementation(async () => ({ role: "maintainer" }));
        deps.Task.assign.mockResolvedValue({ ...task, assignedTo: [{ id: "user-2" }] });

        const result = await actionMessageServices.assignTask({ taskId: "task-1", userId: "user-1", assigneeId: "user-2" }, deps);

        assert.equal(result.message, "Task \"Build API\" assigned successfully.");
        assert.equal(deps.Task.assign.calls[0][1], "user-2");
        assert.equal(deps.ActivityLog.create.calls[0][0].action, "task.assigned");
    });

    testFn("soft deletes a task", async () => {
        const task = { id: "task-1", teamId: "team-1", title: "Build API", isDeleted: false };
        deps.Task.findById.mockResolvedValue(task);
        deps.Task.softDelete.mockResolvedValue({ ...task, isDeleted: true });

        const result = await actionMessageServices.deleteTask({ taskId: "task-1", userId: "user-1" }, deps);

        assert.equal(result.message, "Task \"Build API\" deleted successfully.");
        assert.equal(deps.Task.softDelete.calls[0][0], "task-1");
    });

    testFn("changes a team member role", async () => {
        let callCount = 0;
        deps.TeamMembership.findForUserTeam.mockImplementation(async () => {
            callCount += 1;
            return callCount === 1 ? { role: "owner" } : { teamId: "team-1", userId: "user-2", role: "member" };
        });
        deps.TeamMembership.updateRole.mockResolvedValue({ teamId: "team-1", userId: "user-2", role: "viewer" });

        const result = await actionMessageServices.changeRoles({ teamId: "team-1", userId: "user-1", memberUserId: "user-2", role: "viewer" }, deps);

        assert.equal(result.message, "Team member role updated successfully.");
        assert.equal(deps.TeamMembership.updateRole.calls[0][0].role, "viewer");
        assert.equal(deps.ActivityLog.create.calls[0][0].action, "team.member_role_updated");
    });
});
