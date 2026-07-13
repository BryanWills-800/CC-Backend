const projectModel = {
    prismaModel: "Project",
    tableName: "projects",
    fields: {
        id: "String @id @default(cuid())",
        teamId: "String",
        name: "String @db.VarChar(160)",
        description: "String @default(\"\") @db.VarChar(3000)",
        status: "ProjectStatus @default(active)",
        createdById: "String",
        updatedById: "String?",
        dueDate: "DateTime?",
        isDeleted: "Boolean @default(false)",
        createdAt: "DateTime @default(now())",
        updatedAt: "DateTime @updatedAt",
    },
    relations: [
        "team Team @relation(fields: [teamId], references: [id])",
        "createdBy User @relation(\"ProjectCreatedBy\", fields: [createdById], references: [id])",
        "updatedBy User? @relation(\"ProjectUpdatedBy\", fields: [updatedById], references: [id])",
        "tasks Task[]",
        "comments Comment[]",
    ],
    indexes: ["@@index([teamId, name])", "@@index([teamId, status])"],
};

module.exports = projectModel;
