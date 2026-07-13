const teamInvitationModel = {
    prismaModel: "TeamInvitation",
    tableName: "team_invitations",
    fields: {
        id: "String @id @default(cuid())",
        teamId: "String",
        email: "String @db.VarChar(255)",
        role: "TeamRole @default(member)",
        tokenHash: "String",
        invitedById: "String",
        status: "InvitationStatus @default(pending)",
        expiresAt: "DateTime",
        acceptedAt: "DateTime?",
        createdAt: "DateTime @default(now())",
        updatedAt: "DateTime @updatedAt",
    },
    relations: [
        "team Team @relation(fields: [teamId], references: [id])",
        "invitedBy User @relation(fields: [invitedById], references: [id])",
    ],
    indexes: ["@@index([teamId, email, status])"],
};

module.exports = teamInvitationModel;
