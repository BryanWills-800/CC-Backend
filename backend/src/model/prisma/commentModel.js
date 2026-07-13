const commentModel = {
    prismaModel: "Comment",
    tableName: "comments",
    fields: {
        id: "String @id @default(cuid())",
        teamId: "String",
        projectId: "String",
        taskId: "String",
        content: "String @db.VarChar(3000)",
        authorId: "String",
        editedAt: "DateTime?",
        isDeleted: "Boolean @default(false)",
        createdAt: "DateTime @default(now())",
        updatedAt: "DateTime @updatedAt",
    },
    relations: [
        "team Team @relation(fields: [teamId], references: [id])",
        "project Project @relation(fields: [projectId], references: [id])",
        "task Task @relation(fields: [taskId], references: [id])",
        "author User @relation(fields: [authorId], references: [id])",
    ],
    indexes: ["@@index([taskId, createdAt])"],
};

module.exports = commentModel;
