const tokenModel = {
    prismaModel: "Token",
    tableName: "tokens",
    fields: {
        id: "String @id @default(cuid())",
        userId: "String",
        tokenHash: "String",
        type: "String",
        expiresAt: "DateTime",
        usedAt: "DateTime?",
        createdAt: "DateTime @default(now())",
        updatedAt: "DateTime @updatedAt",
    },
    relations: ["user User @relation(fields: [userId], references: [id])"],
    indexes: ["@@index([userId, tokenHash])"],
};

module.exports = tokenModel;
