const { getPrismaClient } = require("./prismaConnect");

const ACTIVITY_ACTIONS = {
    "team.created": "team_created",
    "team.joined": "team_joined",
    "team.member_invited": "team_member_invited",
    "team.member_role_updated": "team_member_role_updated",
    "project.created": "project_created",
    "project.updated": "project_updated",
    "project.deleted": "project_deleted",
    "task.created": "task_created",
    "task.updated": "task_updated",
    "task.assigned": "task_assigned",
    "task.deleted": "task_deleted",
    "comment.created": "comment_created",
    "comment.updated": "comment_updated",
    "comment.deleted": "comment_deleted",
};

const getId = (record) => record && record.id;
const getPrisma = () => getPrismaClient();

const prismaRepositories = {
    User: {
        findById: (id) => getPrisma().user.findUnique({ where: { id } }),
        findByName: (name) => getPrisma().user.findFirst({ where: { name } }),
        findByNameOrEmail: ({ name, email }) => getPrisma().user.findFirst({ where: { OR: [{ name }, { email }] } }),
        create: (data) => getPrisma().user.create({ data }),
        update: (id, data) => getPrisma().user.update({ where: { id }, data }),
        delete: (id) => getPrisma().user.delete({ where: { id } }),
    },
    RefreshToken: {
        create: (data) => getPrisma().refreshToken.create({ data }),
        findByTokenHash: (tokenHash) => getPrisma().refreshToken.findUnique({ where: { tokenHash } }),
        revoke: (id, revokedAt = new Date()) => getPrisma().refreshToken.update({ where: { id }, data: { revokedAt } }),
        revokeFamily: (family, revokedAt = new Date()) => getPrisma().refreshToken.updateMany({
            where: { family, revokedAt: null },
            data: { revokedAt },
        }),
        findActiveForFamily: (family) => getPrisma().refreshToken.findFirst({
            where: { family, revokedAt: null, expiresAt: { gt: new Date() } },
            orderBy: { createdAt: "desc" },
        }),
        rotate: ({ currentTokenId, replacementData, revokedAt = new Date() }) => getPrisma().$transaction(async (tx) => {
            const revokeResult = await tx.refreshToken.updateMany({
                where: { id: currentTokenId, revokedAt: null },
                data: { revokedAt },
            });

            if (revokeResult.count !== 1) {
                const error = new Error("Refresh token has already been used");
                error.code = "REFRESH_TOKEN_REPLAY";
                throw error;
            }

            const replacement = await tx.refreshToken.create({ data: replacementData });
            await tx.refreshToken.update({
                where: { id: currentTokenId },
                data: { replacedByTokenId: replacement.id },
            });

            return replacement;
        }),
    },
    Team: {
        findById: (id) => getPrisma().team.findUnique({ where: { id } }),
        create: (data) => getPrisma().team.create({ data }),
    },
    TeamMembership: {
        findForUser: (userId) => getPrisma().teamMembership.findMany({
            where: { userId },
            include: { team: true },
            orderBy: { joinedAt: "desc" },
        }),
        findForTeam: (teamId) => getPrisma().teamMembership.findMany({
            where: { teamId },
            include: { user: true },
            orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
        }),
        findForUserTeam: ({ userId, teamId }) => getPrisma().teamMembership.findFirst({
            where: { userId, teamId },
            include: { team: true, user: true },
        }),
        create: (data) => getPrisma().teamMembership.create({ data }),
        updateRole: ({ teamId, userId, role }) => getPrisma().teamMembership.update({
            where: { teamId_userId: { teamId, userId } },
            data: { role },
        }),
    },
    TeamInvitation: {
        create: (data) => getPrisma().teamInvitation.create({ data }),
        findByTokenHash: (tokenHash) => getPrisma().teamInvitation.findFirst({
            where: { tokenHash },
            include: { team: true },
        }),
        accept: (id) => getPrisma().teamInvitation.update({
            where: { id },
            data: { status: "accepted", acceptedAt: new Date() },
        }),
    },
    Project: {
        findById: (id) => getPrisma().project.findUnique({ where: { id } }),
        findForTeam: (teamId) => getPrisma().project.findMany({
            where: { teamId, isDeleted: false },
            orderBy: { name: "asc" },
        }),
        countForTeam: (teamId) => getPrisma().project.count({ where: { teamId, isDeleted: false } }),
        create: (data) => getPrisma().project.create({ data }),
        update: (id, data) => getPrisma().project.update({ where: { id }, data }),
        softDelete: (id, updatedById) => getPrisma().project.update({
            where: { id },
            data: { isDeleted: true, status: "archived", updatedById },
        }),
    },
    Task: {
        find: (where) => getPrisma().task.findMany({ where, include: { assignedTo: true } }),
        findById: (id) => getPrisma().task.findUnique({ where: { id }, include: { assignedTo: true } }),
        count: (where) => getPrisma().task.count({ where }),
        findPaginated: ({ where, skip, take }) => getPrisma().task.findMany({
            where,
            skip,
            take,
            include: { assignedTo: true },
            orderBy: { title: "asc" },
        }),
        findForTeam: (teamId) => getPrisma().task.findMany({
            where: { teamId, isDeleted: false },
            orderBy: { title: "asc" },
        }),
        create: (data) => getPrisma().task.create({ data }),
        update: (id, data) => getPrisma().task.update({ where: { id }, data, include: { assignedTo: true } }),
        assign: (id, assigneeId, updatedById) => getPrisma().task.update({
            where: { id },
            data: {
                updatedById,
                assignedTo: { connect: { id: assigneeId } },
            },
            include: { assignedTo: true },
        }),
        softDelete: (id, updatedById) => getPrisma().task.update({
            where: { id },
            data: { isDeleted: true, updatedById },
            include: { assignedTo: true },
        }),
    },
    Comment: {
        create: (data) => getPrisma().comment.create({ data }),
        findForTask: (taskId) => getPrisma().comment.findMany({
            where: { taskId, isDeleted: false },
            include: { author: true },
            orderBy: { createdAt: "asc" },
        }),
    },
    ActivityLog: {
        create: (data) => getPrisma().activityLog.create({
            data: {
                ...data,
                action: ACTIVITY_ACTIONS[data.action] || data.action,
            },
        }),
        findForTeam: (teamId) => getPrisma().activityLog.findMany({
            where: { teamId },
            orderBy: { createdAt: "desc" },
        }),
    },
};

module.exports = { getId, prismaRepositories };

