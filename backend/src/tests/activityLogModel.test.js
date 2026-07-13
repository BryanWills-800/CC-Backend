const mockActivityLogCreate = jest.fn();

jest.mock("../db/prismaConnect", () => ({
    getPrismaClient: () => ({
        activityLog: { create: mockActivityLogCreate },
    }),
}));

const { prismaRepositories } = require("../db/prismaRepositories");

describe("ActivityLog Prisma repository", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockActivityLogCreate.mockResolvedValue({ id: "log-1" });
    });

    test("maps dotted activity actions to Prisma enum keys", async () => {
        await prismaRepositories.ActivityLog.create({
            teamId: "team-1",
            actorId: "user-1",
            action: "task.created",
            entityType: "task",
            entityId: "task-1",
            metadata: { title: "Build" },
            ipAddress: "127.0.0.1",
        });

        expect(mockActivityLogCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
                action: "task_created",
                teamId: "team-1",
                actorId: "user-1",
            }),
        });
    });

    test("keeps already-normalized actions unchanged", async () => {
        await prismaRepositories.ActivityLog.create({
            teamId: "team-1",
            actorId: "user-1",
            action: "task_created",
            entityType: "task",
            entityId: "task-1",
        });

        expect(mockActivityLogCreate.mock.calls[0][0].data.action).toBe("task_created");
    });
});

