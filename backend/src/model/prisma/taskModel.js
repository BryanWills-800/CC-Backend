const taskModel = {
    prismaModel: "Task",
    tableName: "tasks",
    fields: {
        id: "String @id @default(cuid())",
        teamId: "String",
        projectId: "String",
        title: "String @db.VarChar(200)",
        description: "String @default(\"\") @db.VarChar(5000)",
        status: "TaskStatus @default(todo)",
        priority: "TaskPriority @default(medium)",
        createdById: "String",
        updatedById: "String?",
        dueDate: "DateTime?",
        completedAt: "DateTime?",
        isDeleted: "Boolean @default(false)",
        createdAt: "DateTime @default(now())",
        updatedAt: "DateTime @updatedAt",
    },
    relations: [
        "team Team @relation(fields: [teamId], references: [id])",
        "project Project @relation(fields: [projectId], references: [id])",
        "assignedTo User[] @relation(\"TaskAssignees\")",
        "createdBy User @relation(\"TaskCreatedBy\", fields: [createdById], references: [id])",
        "updatedBy User? @relation(\"TaskUpdatedBy\", fields: [updatedById], references: [id])",
        "comments Comment[]",
    ],
    indexes: ["@@index([projectId, status, priority])", "@@index([teamId, status])"],
};

module.exports = taskModel;
