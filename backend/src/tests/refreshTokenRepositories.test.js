const mockRefreshTokenCreate = jest.fn();
const mockRefreshTokenFindUnique = jest.fn();
const mockRefreshTokenFindFirst = jest.fn();
const mockRefreshTokenUpdate = jest.fn();
const mockRefreshTokenUpdateMany = jest.fn();
const mockTransaction = jest.fn(async (callback) => callback({
    refreshToken: {
        create: mockRefreshTokenCreate,
        update: mockRefreshTokenUpdate,
        updateMany: mockRefreshTokenUpdateMany,
    },
}));

jest.mock("../db/prismaConnect", () => ({
    getPrismaClient: () => ({
        refreshToken: {
            create: mockRefreshTokenCreate,
            findUnique: mockRefreshTokenFindUnique,
            findFirst: mockRefreshTokenFindFirst,
            update: mockRefreshTokenUpdate,
            updateMany: mockRefreshTokenUpdateMany,
        },
        $transaction: mockTransaction,
    }),
}));

const { prismaRepositories } = require("../db/prismaRepositories");

const RefreshToken = prismaRepositories.RefreshToken;

describe("RefreshToken Prisma repository", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockRefreshTokenCreate.mockResolvedValue({ id: "refresh-2" });
        mockRefreshTokenUpdate.mockResolvedValue({ id: "refresh-1" });
        mockRefreshTokenUpdateMany.mockResolvedValue({ count: 1 });
    });

    test("finds refresh tokens by token hash", async () => {
        await RefreshToken.findByTokenHash("hashed-token");

        expect(mockRefreshTokenFindUnique).toHaveBeenCalledWith({ where: { tokenHash: "hashed-token" } });
    });

    test("rotates a refresh token transactionally", async () => {
        const replacementData = {
            userId: "user-1",
            tokenHash: "new-hash",
            family: "family-1",
            expiresAt: expect.any(Date),
        };

        await RefreshToken.rotate({ currentTokenId: "refresh-1", replacementData });

        expect(mockTransaction).toHaveBeenCalled();
        expect(mockRefreshTokenUpdateMany).toHaveBeenCalledWith({
            where: { id: "refresh-1", revokedAt: null },
            data: { revokedAt: expect.any(Date) },
        });
        expect(mockRefreshTokenCreate).toHaveBeenCalledWith({ data: replacementData });
        expect(mockRefreshTokenUpdate).toHaveBeenCalledWith({
            where: { id: "refresh-1" },
            data: { replacedByTokenId: "refresh-2" },
        });
    });

    test("rejects rotation when the token was already revoked", async () => {
        mockRefreshTokenUpdateMany.mockResolvedValue({ count: 0 });

        await expect(RefreshToken.rotate({
            currentTokenId: "refresh-1",
            replacementData: { userId: "user-1", tokenHash: "new-hash", family: "family-1", expiresAt: new Date() },
        })).rejects.toMatchObject({ code: "REFRESH_TOKEN_REPLAY" });

        expect(mockRefreshTokenCreate).not.toHaveBeenCalled();
    });

    test("revokes an entire token family", async () => {
        await RefreshToken.revokeFamily("family-1");

        expect(mockRefreshTokenUpdateMany).toHaveBeenCalledWith({
            where: { family: "family-1", revokedAt: null },
            data: { revokedAt: expect.any(Date) },
        });
    });
});