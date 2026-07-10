const nodeTest = typeof global.describe === "function" ? null : require("node:test");
const describeFn = global.describe || nodeTest.describe;
const beforeEachFn = global.beforeEach || nodeTest.beforeEach;
const testFn = global.test || nodeTest.test;
const assert = require("node:assert/strict");

const { actionMessageServices } = require("../services/actionMessageServices");

const createMockFn = () => {
    const mockFn = async (...args) => {
        mockFn.calls.push(args);

        if (mockFn.error) {
            throw mockFn.error;
        }

        if (mockFn.impl) {
            return mockFn.impl(...args);
        }

        return mockFn.value;
    };

    mockFn.calls = [];
    mockFn.mockResolvedValue = (value) => {
        mockFn.value = value;
    };
    mockFn.mockImplementation = (impl) => {
        mockFn.impl = impl;
    };

    return mockFn;
};

const createDoc = (attrs) => {
    const doc = { ...attrs };
    doc.save = createMockFn();
    doc.save.mockResolvedValue(doc);
    return doc;
};

const createDeps = () => ({
    Project: { findById: createMockFn() },
    Team: { findById: createMockFn(), create: createMockFn() },
    TeamMembership: { findOne: createMockFn(), create: createMockFn() },
    TeamInvitation: { create: createMockFn() },
    Task: { find: createMockFn(), findById: createMockFn(), create: createMockFn() },
    Comment: { create: createMockFn() },
    ActivityLog: { create: createMockFn() },
});

const allowMembership = (deps, role = "maintainer") => {
    deps.TeamMembership.findOne.mockResolvedValue({ role });
};

describeFn("action message services", () => {
    let deps;

    beforeEachFn(() => {
        deps = createDeps();
        deps.Team.findById.mockResolvedValue({ _id: "team-1", isArchived: false });
        deps.ActivityLog.create.mockResolvedValue({ _id: "log-1" });
        allowMembership(deps);
    });


    testFn("creates a team with owner membership and activity log", async () => {
        deps.Team.create.mockImplementation(async (payload) => ({ _id: "team-new", ...payload }));
        deps.TeamMembership.create.mockResolvedValue({ _id: "membership-1" });

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
            createdBy: "user-1",
        });
        assert.deepEqual(deps.TeamMembership.create.calls[0][0], {
            team: "team-new",
            user: "user-1",
            role: "owner",
            invitedBy: null,
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
        deps.Team.create.mockImplementation(async (payload) => ({ _id: "team-new", ...payload }));
        deps.TeamMembership.create.mockResolvedValue({ _id: "membership-1" });

        await actionMessageServices.createTeam({ userId: "user-1", name: "Team B" }, deps);

        assert.equal(deps.Team.create.calls[0][0].description, "");
    });
    testFn("views tasks for a team member", async () => {
        deps.Task.find.mockResolvedValue([{ title: "One" }, { title: "Two" }]);

        const result = await actionMessageServices.viewTasks({ teamId: "team-1", userId: "user-1" }, deps);

        assert.equal(result.message, "Found 2 task(s).");
        assert.deepEqual(deps.Task.find.calls, [[{ isDeleted: false, team: "team-1" }]]);
    });

    testFn("creates a task and logs activity", async () => {
        deps.Project.findById.mockResolvedValue({ _id: "project-1", team: "team-1", isDeleted: false });
        deps.Task.create.mockResolvedValue({ _id: "task-1", title: "Build API" });

        const result = await actionMessageServices.createTask({
            projectId: "project-1",
            userId: "user-1",
            title: " Build API ",
            auditContext: { ipAddress: "127.0.0.1" },
        }, deps);

        assert.equal(result.message, "Task \"Build API\" created successfully.");
        assert.deepEqual(deps.Task.create.calls[0][0], {
            team: "team-1",
            project: "project-1",
            title: "Build API",
            description: "",
            status: "todo",
            priority: "medium",
            createdBy: "user-1",
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
        const task = createDoc({ _id: "task-1", team: "team-1", title: "Build API", assignedTo: ["user-1"], status: "todo" });
        deps.Task.findById.mockResolvedValue(task);

        const result = await actionMessageServices.updateAssignedTask({ taskId: "task-1", userId: "user-1", status: "done" }, deps);

        assert.equal(result.message, "Task \"Build API\" updated successfully.");
        assert.equal(task.status, "done");
        assert.ok(task.completedAt);
    });

    testFn("rejects updates for unassigned users", async () => {
        deps.Task.findById.mockResolvedValue(createDoc({ _id: "task-1", team: "team-1", assignedTo: ["other-user"] }));

        await assert.rejects(
            () => actionMessageServices.updateAssignedTask({ taskId: "task-1", userId: "user-1", status: "done" }, deps),
            { statusCode: 403, message: "Only assigned users can update this task" }
        );
    });

    testFn("creates a comment and logs activity", async () => {
        deps.Task.findById.mockResolvedValue({ _id: "task-1", team: "team-1", project: "project-1", isDeleted: false });
        deps.Comment.create.mockResolvedValue({ _id: "comment-1", content: "Looks good" });

        const result = await actionMessageServices.comment({ taskId: "task-1", userId: "user-1", content: " Looks good " }, deps);

        assert.equal(result.message, "Comment created successfully.");
        assert.equal(deps.Comment.create.calls[0][0].content, "Looks good");
        assert.equal(deps.ActivityLog.create.calls[0][0].action, "comment.created");
    });

    testFn("creates a team invitation", async () => {
        deps.TeamInvitation.create.mockImplementation(async (payload) => ({ _id: "invite-1", ...payload }));

        const result = await actionMessageServices.inviteMembers({ teamId: "team-1", userId: "user-1", email: "NEW@EXAMPLE.COM", role: "member" }, deps);

        assert.equal(result.message, "Invitation created for new@example.com.");
        assert.equal(deps.TeamInvitation.create.calls[0][0].email, "new@example.com");
        assert.equal(deps.TeamInvitation.create.calls[0][0].role, "member");
    });

    testFn("loads a project for editing", async () => {
        deps.Project.findById.mockResolvedValue({ _id: "project-1", team: "team-1", name: "Core", isDeleted: false });

        const result = await actionMessageServices.editProject({ projectId: "project-1", userId: "user-1" }, deps);

        assert.equal(result.message, "Project \"Core\" is ready to edit.");
    });

    testFn("updates a project and logs activity", async () => {
        const project = createDoc({ _id: "project-1", team: "team-1", name: "Core", status: "active", isDeleted: false });
        deps.Project.findById.mockResolvedValue(project);

        const result = await actionMessageServices.updateProject({ projectId: "project-1", userId: "user-1", name: "Core API", status: "completed" }, deps);

        assert.equal(result.message, "Project \"Core API\" updated successfully.");
        assert.equal(project.name, "Core API");
        assert.equal(project.status, "completed");
        assert.equal(deps.ActivityLog.create.calls[0][0].action, "project.updated");
    });

    testFn("soft deletes a project", async () => {
        const project = createDoc({ _id: "project-1", team: "team-1", name: "Core", status: "active", isDeleted: false });
        deps.Project.findById.mockResolvedValue(project);

        const result = await actionMessageServices.deleteProject({ projectId: "project-1", userId: "user-1" }, deps);

        assert.equal(result.message, "Project \"Core\" deleted successfully.");
        assert.equal(project.isDeleted, true);
        assert.equal(project.status, "archived");
    });

    testFn("assigns a task to a team member", async () => {
        const task = createDoc({ _id: "task-1", team: "team-1", title: "Build API", assignedTo: [], isDeleted: false });
        deps.Task.findById.mockResolvedValue(task);
        deps.TeamMembership.findOne.mockImplementation(async () => ({ role: "maintainer" }));

        const result = await actionMessageServices.assignTask({ taskId: "task-1", userId: "user-1", assigneeId: "user-2" }, deps);

        assert.equal(result.message, "Task \"Build API\" assigned successfully.");
        assert.deepEqual(task.assignedTo, ["user-2"]);
        assert.equal(deps.ActivityLog.create.calls[0][0].action, "task.assigned");
    });

    testFn("soft deletes a task", async () => {
        const task = createDoc({ _id: "task-1", team: "team-1", title: "Build API", isDeleted: false });
        deps.Task.findById.mockResolvedValue(task);

        const result = await actionMessageServices.deleteTask({ taskId: "task-1", userId: "user-1" }, deps);

        assert.equal(result.message, "Task \"Build API\" deleted successfully.");
        assert.equal(task.isDeleted, true);
    });

    testFn("changes a team member role", async () => {
        const targetMembership = createDoc({ team: "team-1", user: "user-2", role: "member" });
        let callCount = 0;
        deps.TeamMembership.findOne.mockImplementation(async () => {
            callCount += 1;
            return callCount === 1 ? { role: "owner" } : targetMembership;
        });

        const result = await actionMessageServices.changeRoles({ teamId: "team-1", userId: "user-1", memberUserId: "user-2", role: "viewer" }, deps);

        assert.equal(result.message, "Team member role updated successfully.");
        assert.equal(targetMembership.role, "viewer");
        assert.equal(deps.ActivityLog.create.calls[0][0].action, "team.member_role_updated");
    });
});

