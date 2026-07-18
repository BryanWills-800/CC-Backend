const nodeTest = typeof global.describe === "function" ? null : require("node:test");
const describeFn = global.describe || nodeTest.describe;
const beforeEachFn = global.beforeEach || nodeTest.beforeEach;
const testFn = global.test || nodeTest.test;
const assert = require("node:assert/strict");

const {
    buildProjectPayload,
    createProjectService,
    normalizeProjectInput,
    validateProjectInput,
} = require("../services/actions/projectServices");
const { createActionDeps } = require("./serviceTestUtils");

describeFn("createProject service", () => {
    let deps;

    beforeEachFn(() => {
        deps = createActionDeps();
    });

    testFn("normalizes supported project input aliases", () => {
        assert.deepEqual(normalizeProjectInput({
            team: "team-1",
            createdBy: "user-1",
            name: "  Build API  ",
            description: "  Core service  ",
        }), {
            teamId: "team-1",
            userId: "user-1",
            name: "Build API",
            description: "Core service",
            dueDate: null,
        });
    });

    testFn("validates required project fields", () => {
        assert.throws(
            () => validateProjectInput({ teamId: "team-1", userId: "user-1", name: "" }),
            /Project name is required/
        );
    });

    testFn("builds a Prisma-ready project payload", () => {
        assert.deepEqual(buildProjectPayload({
            teamId: "team-1",
            userId: "user-1",
            name: "Build API",
            description: "Core service",
            dueDate: "2026-08-01",
        }), {
            teamId: "team-1",
            name: "Build API",
            description: "Core service",
            status: "active",
            createdById: "user-1",
            dueDate: "2026-08-01",
        });
    });

    testFn("creates a project and logs activity for owners", async () => {
        const project = { id: "project-1", name: "Build API" };
        deps.Team.findById.mockResolvedValue({ id: "team-1", isArchived: false });
        deps.TeamMembership.findForUserTeam.mockResolvedValue({ role: "owner" });
        deps.Project.create.mockResolvedValue(project);
        deps.ActivityLog.create.mockResolvedValue({ id: "log-1" });

        const result = await createProjectService({
            teamId: "team-1",
            userId: "user-1",
            name: "Build API",
            auditContext: {
                ipAddress: "127.0.0.1",
            },
        }, deps);

        assert.equal(result, project);
        assert.deepEqual(deps.Team.findById.calls, [["team-1"]]);
        assert.deepEqual(deps.TeamMembership.findForUserTeam.calls, [[{ teamId: "team-1", userId: "user-1" }]]);
        assert.deepEqual(deps.Project.create.calls, [[{
            teamId: "team-1",
            name: "Build API",
            description: "",
            status: "active",
            createdById: "user-1",
            dueDate: null,
        }]]);
        assert.deepEqual(deps.ActivityLog.create.calls, [[{
            teamId: "team-1",
            actorId: "user-1",
            action: "project.created",
            entityType: "project",
            entityId: "project-1",
            metadata: { name: "Build API" },
            ipAddress: "127.0.0.1",
        }]]);
    });

    testFn("rejects non-maintainer project creation", async () => {
        deps.Team.findById.mockResolvedValue({ id: "team-1", isArchived: false });
        deps.TeamMembership.findForUserTeam.mockResolvedValue({ role: "viewer" });

        await assert.rejects(
            () => createProjectService({
                teamId: "team-1",
                userId: "user-1",
                name: "Build API",
            }, deps),
            { statusCode: 403 }
        );

        assert.equal(deps.Project.create.calls.length, 0);
    });
});

