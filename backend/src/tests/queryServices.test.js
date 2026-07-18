const { listActivityQuery } = require("../services/queries/activityQueries");
const { listCommentsQuery } = require("../services/queries/commentQueries");
const { listTeamMembersQuery } = require("../services/queries/memberQueries");
const { getProjectQuery, listProjectsQuery } = require("../services/queries/projectQueries");
const { getTaskQuery, listTasksQuery } = require("../services/queries/taskQueries");
const { getTeamQuery } = require("../services/queries/teamQueries");
const { createActionDeps, primeTeam } = require("./serviceTestUtils");

describe("domain query services", () => {
    let deps;

    beforeEach(() => {
        deps = createActionDeps();
        primeTeam(deps, "viewer");
    });

    test("getTeamQuery requires membership and returns the validated team", async () => {
        const result = await getTeamQuery({ teamId: "team-1", userId: "user-1" }, deps);

        expect(result.data).toEqual({ id: "team-1", isArchived: false });
        expect(deps.Team.findById.calls).toEqual([["team-1"]]);
        expect(deps.TeamMembership.findForUserTeam.calls[0][0]).toEqual({ teamId: "team-1", userId: "user-1" });
    });

    test("team-scoped list queries enforce membership before reading", async () => {
        deps.TeamMembership.findForTeam.mockResolvedValue([{ userId: "user-1", role: "viewer" }]);
        deps.Project.findForTeam.mockResolvedValue([{ id: "project-1", teamId: "team-1" }]);
        deps.ActivityLog.findForTeam.mockResolvedValue([{ id: "log-1", teamId: "team-1" }]);

        const members = await listTeamMembersQuery({ teamId: "team-1", userId: "user-1" }, deps);
        const projects = await listProjectsQuery({ teamId: "team-1", userId: "user-1" }, deps);
        const activity = await listActivityQuery({ teamId: "team-1", userId: "user-1" }, deps);

        expect(members.data).toEqual([{ userId: "user-1", role: "viewer" }]);
        expect(projects.data).toEqual([{ id: "project-1", teamId: "team-1" }]);
        expect(activity.data).toEqual([{ id: "log-1", teamId: "team-1" }]);
        expect(deps.TeamMembership.findForUserTeam.calls).toHaveLength(3);
    });

    test("getProjectQuery checks membership in the owning team", async () => {
        deps.Project.findById.mockResolvedValue({ id: "project-1", teamId: "team-1", isDeleted: false });

        const result = await getProjectQuery({ projectId: "project-1", userId: "user-1" }, deps);

        expect(result.data.id).toBe("project-1");
        expect(deps.Project.findById.calls[0]).toEqual(["project-1"]);
        expect(deps.TeamMembership.findForUserTeam.calls[0][0]).toEqual({ teamId: "team-1", userId: "user-1" });
    });

    test("task detail and comments check membership in the owning team", async () => {
        deps.Task.findById.mockResolvedValue({ id: "task-1", teamId: "team-1", projectId: "project-1", isDeleted: false });
        deps.Comment.findForTask.mockResolvedValue([{ id: "comment-1", taskId: "task-1" }]);

        const task = await getTaskQuery({ taskId: "task-1", userId: "user-1" }, deps);
        const comments = await listCommentsQuery({ taskId: "task-1", userId: "user-1" }, deps);

        expect(task.data.id).toBe("task-1");
        expect(comments.data).toEqual([{ id: "comment-1", taskId: "task-1" }]);
        expect(deps.Task.findById.calls).toEqual([["task-1"], ["task-1"]]);
        expect(deps.TeamMembership.findForUserTeam.calls).toHaveLength(2);
    });

    test("listTasksQuery preserves filters and pagination", async () => {
        deps.Task.count.mockResolvedValue(25);
        deps.Task.findPaginated.mockResolvedValue([{ id: "task-1", title: "Build API" }]);

        const result = await listTasksQuery({
            teamId: "team-1",
            userId: "user-1",
            status: "todo",
            priority: "high",
            search: "build",
            page: 2,
            limit: 10,
        }, deps);

        expect(result.pagination).toEqual({ page: 2, limit: 10, total: 25, pages: 3 });
        expect(deps.Task.count.calls[0][0]).toEqual({
            isDeleted: false,
            priority: "high",
            status: "todo",
            teamId: "team-1",
            title: { contains: "build", mode: "insensitive" },
        });
        expect(deps.Task.findPaginated.calls[0][0]).toEqual(expect.objectContaining({
            skip: 10,
            take: 10,
        }));
    });

    test("read queries reject users without team membership", async () => {
        deps.TeamMembership.findForUserTeam.mockResolvedValue(null);

        await expect(getTeamQuery({ teamId: "team-1", userId: "user-1" }, deps)).rejects.toMatchObject({
            statusCode: 403,
            message: "Team membership is required",
        });
    });
});
