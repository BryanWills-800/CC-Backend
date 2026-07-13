const activityLogModel = {
    prismaModel: "ActivityLog",
    tableName: "activity_logs",
    fields: {
        id: "String @id @default(cuid())",
        teamId: "String",
        actorId: "String",
        action: "ActivityAction",
        entityType: "ActivityEntityType",
        entityId: "String",
        metadata: "Json @default(\"{}\")",
        ipAddress: "String?",
        createdAt: "DateTime @default(now())",
        updatedAt: "DateTime @updatedAt",
    },
    relations: [
        "team Team @relation(fields: [teamId], references: [id])",
        "actor User @relation(fields: [actorId], references: [id])",
    ],
    indexes: ["@@index([teamId, createdAt])", "@@index([actorId, createdAt])", "@@index([entityId])"],
};

module.exports = activityLogModel;
