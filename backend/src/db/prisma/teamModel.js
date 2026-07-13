const teamModel = {
    prismaModel: "Team",
    tableName: "teams",
    fields: {
        id: "String @id @default(cuid())",
        name: "String @db.VarChar(120)",
        description: "String @default(\"\") @db.VarChar(1000)",
        slug: "String @unique @db.VarChar(160)",
        createdById: "String",
        isArchived: "Boolean @default(false)",
        createdAt: "DateTime @default(now())",
        updatedAt: "DateTime @updatedAt",
    },
    relations: [
        "createdBy User @relation(\"TeamCreatedBy\", fields: [createdById], references: [id])",
        "memberships TeamMembership[]",
        "projects Project[]",
        "tasks Task[]",
        "comments Comment[]",
        "invitations TeamInvitation[]",
        "activityLogs ActivityLog[]",
    ],
    indexes: ["@@index([createdById])", "@@index([slug])"],
};

module.exports = teamModel;
