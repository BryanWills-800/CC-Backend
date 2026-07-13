const teamMembershipModel = {
    prismaModel: "TeamMembership",
    tableName: "team_memberships",
    fields: {
        id: "String @id @default(cuid())",
        teamId: "String",
        userId: "String",
        role: "TeamRole @default(member)",
        joinedAt: "DateTime @default(now())",
        invitedById: "String?",
        createdAt: "DateTime @default(now())",
        updatedAt: "DateTime @updatedAt",
    },
    relations: [
        "team Team @relation(fields: [teamId], references: [id])",
        "user User @relation(fields: [userId], references: [id])",
        "invitedBy User? @relation(\"MembershipInvitedBy\", fields: [invitedById], references: [id])",
    ],
    indexes: ["@@unique([teamId, userId])", "@@index([userId, role])"],
};

module.exports = teamMembershipModel;
