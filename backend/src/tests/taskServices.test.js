const {
    assignTaskService,
    commentService,
    createTaskService,
    deleteTaskService,
    updateAssignedTaskService,
    viewTasksService,
} = require("../services/actions/taskServices");
const { createActionDeps, primeTeam } = require("./serviceTestUtils");

describe("task action services edge cases", () => {
    let deps;

    beforeEach(() => {
        deps = createActionDeps();
        primeTeam(deps);
    });

    test("viewTasks filters by project status", async () => {
        deps.Project.findById.mockResolvedValue({ id: "project-1", teamId: "team-1", isDeleted: false });
        deps.Task.find.mockResolvedValue([{ id: "task-1" }]);

        const result = await viewTasksService({ projectId: "project-1", userId: "user-1", status: "done" }, deps);

        expect(result.message).toBe("Found 1 task(s).");
        expect(deps.Task.find.calls[0][0]).toEqual({ isDeleted: false, projectId: "project-1", status: "done" });
    });

    test("viewTasks reports no tasks", async () => {
        deps.Task.find.mockResolvedValue([]);

        const result = await viewTasksService({ teamId: "team-1", userId: "user-1" }, deps);

        expect(result.message).toBe("No tasks found.");
    });

    test("viewTasks rejects requests without team or project", async () => {
        await expect(viewTasksService({ userId: "user-1" }, deps)).rejects.toMatchObject({
            statusCode: 400,
            message: "Team or project is required",
        });
    });

    test("viewTasks rejects invalid status", async () => {
        await expect(viewTasksService({ teamId: "team-1", userId: "user-1", status: "bad" }, deps)).rejects.toMatchObject({
            statusCode: 400,
            message: "Task status is invalid",
        });
    });

    test("createTask rejects missing project", async () => {
        await expect(createTaskService({ userId: "user-1", title: "Build" }, deps)).rejects.toMatchObject({
            statusCode: 400,
            message: "Project is required",
        });
    });

    test("createTask rejects invalid priority", async () => {
        await expect(createTaskService({ projectId: "project-1", userId: "user-1", title: "Build", priority: "highest" }, deps)).rejects.toMatchObject({
            statusCode: 400,
            message: "Task priority is invalid",
        });
    });

    test("createTask accepts aliases and trims payload fields", async () => {
        deps.Project.findById.mockResolvedValue({ id: "project-1", teamId: "team-1", isDeleted: false });
        deps.Task.create.mockResolvedValue({ id: "task-1", title: "Build" });

        await createTaskService({ project: "project-1", createdBy: "user-1", title: "  Build  ", description: "  Docs  ", status: "review", dueDate: "2026-08-01" }, deps);

        expect(deps.Task.create.calls[0][0]).toEqual(expect.objectContaining({
            teamId: "team-1",
            projectId: "project-1",
            createdById: "user-1",
            title: "Build",
            description: "Docs",
            status: "review",
            priority: "medium",
            dueDate: "2026-08-01",
        }));
    });

    test("updateAssignedTask rejects missing task", async () => {
        await expect(updateAssignedTaskService({ userId: "user-1", status: "done" }, deps)).rejects.toMatchObject({
            statusCode: 400,
            message: "Task is required",
        });
    });

    test("updateAssignedTask clears completedAt when status is not done", async () => {
        const task = { id: "task-1", teamId: "team-1", title: "Build", assignedTo: [{ id: "user-1" }], status: "done", completedAt: new Date(), isDeleted: false };
        deps.Task.findById.mockResolvedValue(task);
        deps.Task.update.mockResolvedValue({ ...task, status: "review", completedAt: null, updatedById: "user-1" });

        await updateAssignedTaskService({ taskId: "task-1", userId: "user-1", status: "review" }, deps);

        expect(deps.Task.update.calls[0][0]).toBe("task-1");
        expect(deps.Task.update.calls[0][1]).toEqual(expect.objectContaining({
            status: "review",
            completedAt: null,
            updatedById: "user-1",
        }));
    });

    test("comment rejects blank content", async () => {
        await expect(commentService({ taskId: "task-1", userId: "user-1", content: "   " }, deps)).rejects.toMatchObject({
            statusCode: 400,
            message: "Comment content is required",
        });
    });

    test("comment writes project and author on comment", async () => {
        deps.Task.findById.mockResolvedValue({ id: "task-1", teamId: "team-1", projectId: "project-1", isDeleted: false });
        deps.Comment.create.mockResolvedValue({ id: "comment-1" });

        await commentService({ taskId: "task-1", userId: "user-1", content: " Looks good " }, deps);

        expect(deps.Comment.create.calls[0][0]).toEqual({
            teamId: "team-1",
            projectId: "project-1",
            taskId: "task-1",
            content: "Looks good",
            authorId: "user-1",
        });
    });

    test("assignTask rejects missing assignee", async () => {
        await expect(assignTaskService({ taskId: "task-1", userId: "user-1" }, deps)).rejects.toMatchObject({
            statusCode: 400,
            message: "Assignee is required",
        });
    });

    test("assignTask does not duplicate an existing assignee", async () => {
        const task = { id: "task-1", teamId: "team-1", title: "Build", assignedTo: [{ id: "user-2" }], isDeleted: false };
        deps.Task.findById.mockResolvedValue(task);
        deps.TeamMembership.findForUserTeam.mockImplementation(async ({ userId }) => userId === "user-1" ? { role: "maintainer" } : { role: "member" });
        deps.Task.update.mockResolvedValue(task);

        await assignTaskService({ taskId: "task-1", userId: "user-1", assigneeId: "user-2" }, deps);

        expect(deps.Task.assign.calls).toHaveLength(0);
        expect(deps.Task.update.calls[0]).toEqual(["task-1", { updatedById: "user-1" }]);
    });

    test("deleteTask marks task as deleted and logs actor", async () => {
        const task = { id: "task-1", teamId: "team-1", title: "Build", isDeleted: false };
        deps.Task.findById.mockResolvedValue(task);
        deps.Task.softDelete.mockResolvedValue({ ...task, isDeleted: true, updatedById: "user-1" });

        await deleteTaskService({ taskId: "task-1", userId: "user-1" }, deps);

        expect(deps.Task.softDelete.calls[0]).toEqual(["task-1", "user-1"]);
        expect(deps.ActivityLog.create.calls[0][0].action).toBe("task.deleted");
    });
});

