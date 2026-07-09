const { describe, beforeEach, test } = require("node:test");
const assert = require("node:assert/strict");

const {
    buildProjectPayload,
    createProjectService,
    normalizeProjectInput,
    validateProjectInput,
} = require("../services/createProject");

const createMockFn = () => {
    const mockFn = async (...args) => {
        mockFn.calls.push(args);

        if (mockFn.error) {
            throw mockFn.error;
        }

        return mockFn.value;
    };

    mockFn.calls = [];
    mockFn.mockResolvedValue = (value) => {
        mockFn.value = value;
    };

    return mockFn;
};

const createDeps = () => ({
    Project: { create: createMockFn() },
    Team: { findById: createMockFn() },
    TeamMembership: { findOne: createMockFn() },
    ActivityLog: { create: createMockFn() },
});

describe("createProject service", () => {
    let deps;

    beforeEach(() => {
        deps = createDeps();
    });

    test("normalizes supported project input aliases", () => {
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

    test("validates required project fields", () => {
        assert.throws(
            () => validateProjectInput({ teamId: "team-1", userId: "user-1", name: "" }),
            /Project name is required/
        );
    });

    test("builds a model-ready project payload", () => {
        assert.deepEqual(buildProjectPayload({
            teamId: "team-1",
            userId: "user-1",
            name: "Build API",
            description: "Core service",
            dueDate: "2026-08-01",
        }), {
            team: "team-1",
            name: "Build API",
            description: "Core service",
            status: "active",
            createdBy: "user-1",
            dueDate: "2026-08-01",
        });
    });

    test("creates a project and logs activity for owners", async () => {
        const project = { _id: "project-1", name: "Build API" };
        deps.Team.findById.mockResolvedValue({ _id: "team-1", isArchived: false });
        deps.TeamMembership.findOne.mockResolvedValue({ role: "owner" });
        deps.Project.create.mockResolvedValue(project);
        deps.ActivityLog.create.mockResolvedValue({ _id: "log-1" });

        const result = await createProjectService({
            teamId: "team-1",
            userId: "user-1",
            name: "Build API",
            ipAddress: "127.0.0.1",
        }, deps);

        assert.equal(result, project);
        assert.deepEqual(deps.Team.findById.calls, [["team-1"]]);
        assert.deepEqual(deps.TeamMembership.findOne.calls, [[{ team: "team-1", user: "user-1" }]]);
        assert.deepEqual(deps.Project.create.calls, [[{
            team: "team-1",
            name: "Build API",
            description: "",
            status: "active",
            createdBy: "user-1",
            dueDate: null,
        }]]);
        assert.deepEqual(deps.ActivityLog.create.calls, [[{
            team: "team-1",
            actor: "user-1",
            action: "project.created",
            entityType: "project",
            entityId: "project-1",
            metadata: { name: "Build API" },
            ipAddress: "127.0.0.1",
        }]]);
    });

    test("rejects non-maintainer project creation", async () => {
        deps.Team.findById.mockResolvedValue({ _id: "team-1", isArchived: false });
        deps.TeamMembership.findOne.mockResolvedValue({ role: "viewer" });

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
