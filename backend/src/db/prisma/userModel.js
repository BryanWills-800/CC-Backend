const userModel = {
    prismaModel: "User",
    tableName: "users",
    fields: {
        id: "String @id @default(cuid())",
        name: "String @db.VarChar(80)",
        email: "String @unique @db.VarChar(255)",
        passwordHash: "String",
        avatarUrl: "String?",
        authProvider: "String @default(\"local\")",
        isActive: "Boolean @default(false)",
        lastLoginAt: "DateTime?",
        lastLogoutAt: "DateTime?",
        createdAt: "DateTime @default(now())",
        updatedAt: "DateTime @updatedAt",
    },
    relations: [
        "createdTeams Team[] @relation(\"TeamCreatedBy\")",
        "memberships TeamMembership[]",
        "createdProjects Project[] @relation(\"ProjectCreatedBy\")",
        "updatedProjects Project[] @relation(\"ProjectUpdatedBy\")",
        "createdTasks Task[] @relation(\"TaskCreatedBy\")",
        "updatedTasks Task[] @relation(\"TaskUpdatedBy\")",
        "assignedTasks Task[] @relation(\"TaskAssignees\")",
        "comments Comment[]",
        "activityLogs ActivityLog[]",
        "refreshTokens RefreshToken[]",
    ],
    indexes: ["@@index([email])"],
};

module.exports = userModel;
