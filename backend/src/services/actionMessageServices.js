const crypto = require("crypto");
const Project = require("../models/projectModel");
const Team = require("../models/teamModel");
const TeamMembership = require("../models/teamMembershipModel");
const TeamInvitation = require("../models/teamInvitationModel");
const Task = require("../models/taskModel");
const Comment = require("../models/commentModel");
const ActivityLog = require("../models/activityLogModel");

const TEAM_MEMBER_ROLES = ["owner", "maintainer", "member", "viewer"];
const TASK_CREATOR_ROLES = ["owner", "maintainer", "member"];
const TEAM_MANAGER_ROLES = ["owner", "maintainer"];
const TEAM_OWNER_ROLES = ["owner"];
const INVITABLE_ROLES = ["maintainer", "member", "viewer"];
const PROJECT_STATUSES = ["active", "on_hold", "completed", "archived"];
const TASK_STATUSES = ["todo", "in_progress", "blocked", "review", "done"];
const TASK_PRIORITIES = ["low", "medium", "high", "urgent"];

const createActionError = (statusCode, message) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

const normalizeText = (value) => typeof value === "string" ? value.trim() : "";
const normalizeDate = (value) => value || null;
const idMatches = (left, right) => String(left) === String(right);

const getAuditIpAddress = (input) => input && input.auditContext && input.auditContext.ipAddress
    ? input.auditContext.ipAddress
    : null;

const assertRequired = (value, message) => {
    if (!value) throw createActionError(400, message);
    return value;
}

const assertAllowedValue = (value, allowedValues, message) => {
    if (value && !allowedValues.includes(value)) throw createActionError(400, message);
    return value;
}

const assertTeamExists = async (teamId, deps) => {
    const team = await deps.Team.findById(teamId);
    if (!team || team.isArchived) throw createActionError(404, "Team not found");
    return team;
}

const assertProjectExists = async (projectId, deps) => {
    const project = await deps.Project.findById(projectId);
    if (!project || project.isDeleted) throw createActionError(404, "Project not found");
    return project;
}

const assertTaskExists = async (taskId, deps) => {
    const task = await deps.Task.findById(taskId);
    if (!task || task.isDeleted) throw createActionError(404, "Task not found");
    return task;
}

const assertMembership = async ({ teamId, userId, allowedRoles }, deps) => {
    assertRequired(userId, "Authenticated user is required");

    const membership = await deps.TeamMembership.findOne({ team: teamId, user: userId });
    if (!membership) throw createActionError(403, "Team membership is required");
    if (allowedRoles && !allowedRoles.includes(membership.role)) {
        throw createActionError(403, "You do not have permission to perform this action");
    }

    return membership;
}

const logActivity = async ({ teamId, actorId, action, entityType, entityId, metadata, ipAddress }, deps) => {
    if (!deps.ActivityLog) return null;

    return deps.ActivityLog.create({
        team: teamId,
        actor: actorId,
        action,
        entityType,
        entityId,
        metadata: metadata || {},
        ipAddress: ipAddress || null,
    });
}

const normalizeViewTasksInput = (input = {}) => ({
    teamId: input.teamId || input.team || "",
    projectId: input.projectId || input.project || "",
    userId: input.userId || input.createdBy,
    status: normalizeText(input.status),
});

const viewTasksService = async (input, deps = defaultDeps) => {
    const taskInput = normalizeViewTasksInput(input);
    let teamId = taskInput.teamId;
    const query = { isDeleted: false };

    if (taskInput.projectId) {
        const project = await assertProjectExists(taskInput.projectId, deps);
        teamId = project.team;
        query.project = taskInput.projectId;
    } else {
        assertRequired(teamId, "Team or project is required");
        query.team = teamId;
    }

    assertAllowedValue(taskInput.status, TASK_STATUSES, "Task status is invalid");
    if (taskInput.status) query.status = taskInput.status;

    await assertTeamExists(teamId, deps);
    await assertMembership({ teamId, userId: taskInput.userId, allowedRoles: TEAM_MEMBER_ROLES }, deps);

    const tasks = await deps.Task.find(query);

    return {
        message: tasks.length ? `Found ${tasks.length} task(s).` : "No tasks found.",
        data: tasks,
    };
}

const normalizeCreateTaskInput = (input = {}) => ({
    projectId: input.projectId || input.project || "",
    userId: input.userId || input.createdBy,
    title: normalizeText(input.title),
    description: normalizeText(input.description),
    status: normalizeText(input.status) || "todo",
    priority: normalizeText(input.priority) || "medium",
    dueDate: normalizeDate(input.dueDate),
    auditContext: input.auditContext,
});

const createTaskService = async (input, deps = defaultDeps) => {
    const taskInput = normalizeCreateTaskInput(input);
    assertRequired(taskInput.projectId, "Project is required");
    assertRequired(taskInput.title, "Task title is required");
    assertAllowedValue(taskInput.status, TASK_STATUSES, "Task status is invalid");
    assertAllowedValue(taskInput.priority, TASK_PRIORITIES, "Task priority is invalid");

    const project = await assertProjectExists(taskInput.projectId, deps);
    await assertTeamExists(project.team, deps);
    await assertMembership({ teamId: project.team, userId: taskInput.userId, allowedRoles: TASK_CREATOR_ROLES }, deps);

    const task = await deps.Task.create({
        team: project.team,
        project: taskInput.projectId,
        title: taskInput.title,
        description: taskInput.description,
        status: taskInput.status,
        priority: taskInput.priority,
        createdBy: taskInput.userId,
        dueDate: taskInput.dueDate,
    });

    await logActivity({
        teamId: project.team,
        actorId: taskInput.userId,
        action: "task.created",
        entityType: "task",
        entityId: task._id,
        metadata: { title: task.title, project: taskInput.projectId },
        ipAddress: getAuditIpAddress(taskInput),
    }, deps);

    return { message: `Task "${task.title}" created successfully.`, data: task };
}

const normalizeUpdateAssignedTaskInput = (input = {}) => ({
    taskId: input.taskId || input.task || "",
    userId: input.userId || input.updatedBy,
    status: normalizeText(input.status),
    description: normalizeText(input.description),
    dueDate: normalizeDate(input.dueDate),
    auditContext: input.auditContext,
});

const updateAssignedTaskService = async (input, deps = defaultDeps) => {
    const taskInput = normalizeUpdateAssignedTaskInput(input);
    assertRequired(taskInput.taskId, "Task is required");
    assertAllowedValue(taskInput.status, TASK_STATUSES, "Task status is invalid");

    const task = await assertTaskExists(taskInput.taskId, deps);
    await assertTeamExists(task.team, deps);
    await assertMembership({ teamId: task.team, userId: taskInput.userId, allowedRoles: TASK_CREATOR_ROLES }, deps);

    const isAssigned = Array.isArray(task.assignedTo) && task.assignedTo.some((assigneeId) => idMatches(assigneeId, taskInput.userId));
    if (!isAssigned) throw createActionError(403, "Only assigned users can update this task");

    if (taskInput.status) task.status = taskInput.status;
    if (taskInput.description) task.description = taskInput.description;
    if (taskInput.dueDate !== null) task.dueDate = taskInput.dueDate;
    task.updatedBy = taskInput.userId;
    task.completedAt = task.status === "done" ? new Date() : null;

    const updatedTask = await task.save();

    await logActivity({
        teamId: task.team,
        actorId: taskInput.userId,
        action: "task.updated",
        entityType: "task",
        entityId: task._id,
        metadata: { status: task.status },
        ipAddress: getAuditIpAddress(taskInput),
    }, deps);

    return { message: `Task "${updatedTask.title}" updated successfully.`, data: updatedTask };
}

const normalizeCommentInput = (input = {}) => ({
    taskId: input.taskId || input.task || "",
    userId: input.userId || input.author,
    content: normalizeText(input.content),
    auditContext: input.auditContext,
});

const commentService = async (input, deps = defaultDeps) => {
    const commentInput = normalizeCommentInput(input);
    assertRequired(commentInput.taskId, "Task is required");
    assertRequired(commentInput.content, "Comment content is required");

    const task = await assertTaskExists(commentInput.taskId, deps);
    await assertTeamExists(task.team, deps);
    await assertMembership({ teamId: task.team, userId: commentInput.userId, allowedRoles: TEAM_MEMBER_ROLES }, deps);

    const comment = await deps.Comment.create({
        team: task.team,
        project: task.project,
        task: commentInput.taskId,
        content: commentInput.content,
        author: commentInput.userId,
    });

    await logActivity({
        teamId: task.team,
        actorId: commentInput.userId,
        action: "comment.created",
        entityType: "comment",
        entityId: comment._id,
        metadata: { task: commentInput.taskId },
        ipAddress: getAuditIpAddress(commentInput),
    }, deps);

    return { message: "Comment created successfully.", data: comment };
}

const normalizeInviteMembersInput = (input = {}) => ({
    teamId: input.teamId || input.team || "",
    userId: input.userId || input.invitedBy,
    email: normalizeText(input.email).toLowerCase(),
    role: normalizeText(input.role) || "member",
    auditContext: input.auditContext,
});

const inviteMembersService = async (input, deps = defaultDeps) => {
    const inviteInput = normalizeInviteMembersInput(input);
    assertRequired(inviteInput.teamId, "Team is required");
    assertRequired(inviteInput.email, "Email is required");
    assertAllowedValue(inviteInput.role, INVITABLE_ROLES, "Invitation role is invalid");

    await assertTeamExists(inviteInput.teamId, deps);
    await assertMembership({ teamId: inviteInput.teamId, userId: inviteInput.userId, allowedRoles: TEAM_MANAGER_ROLES }, deps);

    const token = crypto.randomBytes(32).toString("hex");
    const invitation = await deps.TeamInvitation.create({
        team: inviteInput.teamId,
        email: inviteInput.email,
        role: inviteInput.role,
        tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
        invitedBy: inviteInput.userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    await logActivity({
        teamId: inviteInput.teamId,
        actorId: inviteInput.userId,
        action: "team.member_invited",
        entityType: "team",
        entityId: inviteInput.teamId,
        metadata: { email: inviteInput.email, role: inviteInput.role },
        ipAddress: getAuditIpAddress(inviteInput),
    }, deps);

    return { message: `Invitation created for ${invitation.email}.`, data: invitation };
}

const normalizeProjectMutationInput = (input = {}) => ({
    projectId: input.projectId || input.project || "",
    userId: input.userId || input.updatedBy,
    name: normalizeText(input.name),
    description: normalizeText(input.description),
    status: normalizeText(input.status),
    dueDate: normalizeDate(input.dueDate),
    auditContext: input.auditContext,
});

const editProjectService = async (input, deps = defaultDeps) => {
    const projectInput = normalizeProjectMutationInput(input);
    assertRequired(projectInput.projectId, "Project is required");

    const project = await assertProjectExists(projectInput.projectId, deps);
    await assertTeamExists(project.team, deps);
    await assertMembership({ teamId: project.team, userId: projectInput.userId, allowedRoles: TEAM_MANAGER_ROLES }, deps);

    return { message: `Project "${project.name}" is ready to edit.`, data: project };
}

const updateProjectService = async (input, deps = defaultDeps) => {
    const projectInput = normalizeProjectMutationInput(input);
    assertRequired(projectInput.projectId, "Project is required");
    assertAllowedValue(projectInput.status, PROJECT_STATUSES, "Project status is invalid");

    const project = await assertProjectExists(projectInput.projectId, deps);
    await assertTeamExists(project.team, deps);
    await assertMembership({ teamId: project.team, userId: projectInput.userId, allowedRoles: TEAM_MANAGER_ROLES }, deps);

    if (projectInput.name) project.name = projectInput.name;
    if (projectInput.description) project.description = projectInput.description;
    if (projectInput.status) project.status = projectInput.status;
    if (projectInput.dueDate !== null) project.dueDate = projectInput.dueDate;
    project.updatedBy = projectInput.userId;

    const updatedProject = await project.save();

    await logActivity({
        teamId: project.team,
        actorId: projectInput.userId,
        action: "project.updated",
        entityType: "project",
        entityId: project._id,
        metadata: { name: project.name, status: project.status },
        ipAddress: getAuditIpAddress(projectInput),
    }, deps);

    return { message: `Project "${updatedProject.name}" updated successfully.`, data: updatedProject };
}

const deleteProjectService = async (input, deps = defaultDeps) => {
    const projectInput = normalizeProjectMutationInput(input);
    assertRequired(projectInput.projectId, "Project is required");

    const project = await assertProjectExists(projectInput.projectId, deps);
    await assertTeamExists(project.team, deps);
    await assertMembership({ teamId: project.team, userId: projectInput.userId, allowedRoles: TEAM_MANAGER_ROLES }, deps);

    project.isDeleted = true;
    project.status = "archived";
    project.updatedBy = projectInput.userId;
    const deletedProject = await project.save();

    await logActivity({
        teamId: project.team,
        actorId: projectInput.userId,
        action: "project.deleted",
        entityType: "project",
        entityId: project._id,
        metadata: { name: project.name },
        ipAddress: getAuditIpAddress(projectInput),
    }, deps);

    return { message: `Project "${deletedProject.name}" deleted successfully.`, data: deletedProject };
}

const normalizeAssignTaskInput = (input = {}) => ({
    taskId: input.taskId || input.task || "",
    assigneeId: input.assigneeId || input.assignedTo || "",
    userId: input.userId || input.updatedBy,
    auditContext: input.auditContext,
});

const assignTaskService = async (input, deps = defaultDeps) => {
    const taskInput = normalizeAssignTaskInput(input);
    assertRequired(taskInput.taskId, "Task is required");
    assertRequired(taskInput.assigneeId, "Assignee is required");

    const task = await assertTaskExists(taskInput.taskId, deps);
    await assertTeamExists(task.team, deps);
    await assertMembership({ teamId: task.team, userId: taskInput.userId, allowedRoles: TEAM_MANAGER_ROLES }, deps);
    await assertMembership({ teamId: task.team, userId: taskInput.assigneeId, allowedRoles: TEAM_MEMBER_ROLES }, deps);

    const assignedTo = Array.isArray(task.assignedTo) ? task.assignedTo : [];
    if (!assignedTo.some((assigneeId) => idMatches(assigneeId, taskInput.assigneeId))) {
        assignedTo.push(taskInput.assigneeId);
    }

    task.assignedTo = assignedTo;
    task.updatedBy = taskInput.userId;
    const updatedTask = await task.save();

    await logActivity({
        teamId: task.team,
        actorId: taskInput.userId,
        action: "task.assigned",
        entityType: "task",
        entityId: task._id,
        metadata: { assignee: taskInput.assigneeId },
        ipAddress: getAuditIpAddress(taskInput),
    }, deps);

    return { message: `Task "${updatedTask.title}" assigned successfully.`, data: updatedTask };
}

const deleteTaskService = async (input, deps = defaultDeps) => {
    const taskInput = normalizeAssignTaskInput(input);
    assertRequired(taskInput.taskId, "Task is required");

    const task = await assertTaskExists(taskInput.taskId, deps);
    await assertTeamExists(task.team, deps);
    await assertMembership({ teamId: task.team, userId: taskInput.userId, allowedRoles: TEAM_MANAGER_ROLES }, deps);

    task.isDeleted = true;
    task.updatedBy = taskInput.userId;
    const deletedTask = await task.save();

    await logActivity({
        teamId: task.team,
        actorId: taskInput.userId,
        action: "task.deleted",
        entityType: "task",
        entityId: task._id,
        metadata: { title: task.title },
        ipAddress: getAuditIpAddress(taskInput),
    }, deps);

    return { message: `Task "${deletedTask.title}" deleted successfully.`, data: deletedTask };
}

const normalizeChangeRolesInput = (input = {}) => ({
    teamId: input.teamId || input.team || "",
    memberUserId: input.memberUserId || input.member || input.user || "",
    userId: input.userId || input.updatedBy,
    role: normalizeText(input.role),
    auditContext: input.auditContext,
});

const changeRolesService = async (input, deps = defaultDeps) => {
    const roleInput = normalizeChangeRolesInput(input);
    assertRequired(roleInput.teamId, "Team is required");
    assertRequired(roleInput.memberUserId, "Team member is required");
    assertAllowedValue(roleInput.role, INVITABLE_ROLES, "Team role is invalid");

    await assertTeamExists(roleInput.teamId, deps);
    await assertMembership({ teamId: roleInput.teamId, userId: roleInput.userId, allowedRoles: TEAM_OWNER_ROLES }, deps);

    const membership = await deps.TeamMembership.findOne({ team: roleInput.teamId, user: roleInput.memberUserId });
    if (!membership) throw createActionError(404, "Team member not found");

    membership.role = roleInput.role;
    const updatedMembership = await membership.save();

    await logActivity({
        teamId: roleInput.teamId,
        actorId: roleInput.userId,
        action: "team.member_role_updated",
        entityType: "user",
        entityId: roleInput.memberUserId,
        metadata: { role: roleInput.role },
        ipAddress: getAuditIpAddress(roleInput),
    }, deps);

    return { message: "Team member role updated successfully.", data: updatedMembership };
}

const defaultDeps = {
    Project,
    Team,
    TeamMembership,
    TeamInvitation,
    Task,
    Comment,
    ActivityLog,
};

const actionMessageServices = {
    assignTask: assignTaskService,
    changeRoles: changeRolesService,
    comment: commentService,
    createTask: createTaskService,
    deleteProject: deleteProjectService,
    deleteTask: deleteTaskService,
    editProject: editProjectService,
    inviteMembers: inviteMembersService,
    updateAssignedTask: updateAssignedTaskService,
    updateProject: updateProjectService,
    viewTasks: viewTasksService,
};

module.exports = { actionMessageServices };
