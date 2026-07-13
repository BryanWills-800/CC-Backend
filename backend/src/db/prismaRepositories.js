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
    },
    Project: {
        findById: (id) => getPrisma().project.findUnique({ where: { id } }),
        findForTeam: (teamId) => getPrisma().project.findMany({
            where: { teamId, isDeleted: false },
            orderBy: { name: "asc" },
        }),
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
    },
    ActivityLog: {
        create: (data) => getPrisma().activityLog.create({
            data: {
                ...data,
                action: ACTIVITY_ACTIONS[data.action] || data.action,
            },
        }),
    },
};

module.exports = { getId, prismaRepositories };



