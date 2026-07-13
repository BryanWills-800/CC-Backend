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
    mockFn.mockRejectedValue = (error) => {
        mockFn.error = error;
    };
    mockFn.mockImplementation = (impl) => {
        mockFn.impl = impl;
    };

    return mockFn;
};

const createDoc = (attrs) => ({ ...attrs });

const createActionDeps = () => ({
    Project: {
        findById: createMockFn(),
        findForTeam: createMockFn(),
        create: createMockFn(),
        update: createMockFn(),
        softDelete: createMockFn(),
    },
    Team: { findById: createMockFn(), create: createMockFn() },
    TeamMembership: {
        findForUser: createMockFn(),
        findForTeam: createMockFn(),
        findForUserTeam: createMockFn(),
        create: createMockFn(),
        updateRole: createMockFn(),
    },
    TeamInvitation: { create: createMockFn() },
    Task: {
        find: createMockFn(),
        findById: createMockFn(),
        findForTeam: createMockFn(),
        create: createMockFn(),
        update: createMockFn(),
        assign: createMockFn(),
        softDelete: createMockFn(),
    },
    Comment: { create: createMockFn() },
    ActivityLog: { create: createMockFn() },
});

const primeTeam = (deps, role = "maintainer") => {
    deps.Team.findById.mockResolvedValue({ id: "team-1", isArchived: false });
    deps.TeamMembership.findForUserTeam.mockResolvedValue({ role });
    deps.ActivityLog.create.mockResolvedValue({ id: "log-1" });
};

module.exports = {
    createActionDeps,
    createDoc,
    createMockFn,
    primeTeam,
};
