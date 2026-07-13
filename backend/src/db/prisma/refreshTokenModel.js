const refreshTokenModel = {
    prismaModel: "RefreshToken",
    tableName: "refresh_tokens",
    fields: {
        id: "String @id @default(cuid())",
        userId: "String",
        tokenHash: "String @unique",
        family: "String?",
        userAgent: "String?",
        ipAddress: "String?",
        expiresAt: "DateTime",
        revokedAt: "DateTime?",
        replacedByTokenId: "String?",
        createdAt: "DateTime @default(now())",
        updatedAt: "DateTime @updatedAt",
    },
    relations: ["user User @relation(fields: [userId], references: [id])"],
    indexes: ["@@index([userId])", "@@index([expiresAt])"],
};

module.exports = refreshTokenModel;
