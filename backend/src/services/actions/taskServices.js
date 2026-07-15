const {
    MEMBER_LEVEL_ROLES,
    TASK_PRIORITIES,
    TASK_STATUSES,
    MAINTAINER_LEVEL_ROLES,
    VIEWER_LEVEL_ROLES,
    assertAllowedValue,
    assertMembership,
    assertProjectExists,
    assertRequired,
    assertTaskExists,
    assertTeamExists,
    createActionError,
    defaultDeps,
    getAuditIpAddress,
    idMatches,
    logActivity,
    normalizeDate,
    normalizeText,
} = require("./shared");

const getProjectTeamId = (project) => project.teamId || project.team;
const getTaskTeamId = (task) => task.teamId || task.team;
const getTaskProjectId = (task) => task.projectId || task.project;
const getAssigneeId = (assignee) => assignee && assignee.id ? assignee.id : assignee;

const normalizeViewTasksInput = (input = {}) => ({
    teamId: input.teamId || input.team || "",
    projectId: input.projectId || input.project || "",
    userId: input.userId || input.createdBy,
    status: normalizeText(input.status),
    priority: normalizeText(input.priority),
    search: normalizeText(input.search),
    page: input.page,
    limit: input.limit,
});

const viewTasksService = async (input, deps = defaultDeps) => {
    const taskInput = normalizeViewTasksInput(input);
    let teamId = taskInput.teamId;
    const query = { isDeleted: false };

    if (taskInput.projectId) {
        const project = await assertProjectExists(taskInput.projectId, deps);
        teamId = getProjectTeamId(project);
        query.projectId = taskInput.projectId;
    } else {
        assertRequired(teamId, "Team or project is required");
        query.teamId = teamId;
    }

    assertAllowedValue(taskInput.status, TASK_STATUSES, "Task status is invalid");
    assertAllowedValue(taskInput.priority, TASK_PRIORITIES, "Task priority is invalid");
    if (taskInput.status) query.status = taskInput.status;
    if (taskInput.priority) query.priority = taskInput.priority;
    if (taskInput.search) query.title = { contains: taskInput.search, mode: "insensitive" };

    await assertTeamExists(teamId, deps);
    await assertMembership({ teamId, userId: taskInput.userId, allowedRoles: VIEWER_LEVEL_ROLES }, deps);

    if (taskInput.page && taskInput.limit && deps.Task.count && deps.Task.findPaginated) {
        const page = Number(taskInput.page);
        const limit = Number(taskInput.limit);
        const total = await deps.Task.count(query);
        const tasks = await deps.Task.findPaginated({
            where: query,
            skip: (page - 1) * limit,
            take: limit,
        });

        return {
            message: tasks.length ? `Found ${tasks.length} task(s).` : "No tasks found.",
            data: tasks,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        };
    }

    const tasks = await deps.Task.find(query);

    return {
        message: tasks.length ? `Found ${tasks.length} task(s).` : "No tasks found.",
        data: tasks,
    };
};

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
    const teamId = getProjectTeamId(project);
    await assertTeamExists(teamId, deps);
    await assertMembership({ teamId, userId: taskInput.userId, allowedRoles: MEMBER_LEVEL_ROLES }, deps);

    const task = await deps.Task.create({
        teamId,
        projectId: taskInput.projectId,
        title: taskInput.title,
        description: taskInput.description,
        status: taskInput.status,
        priority: taskInput.priority,
        createdById: taskInput.userId,
        dueDate: taskInput.dueDate,
    });

    await logActivity({
        teamId,
        actorId: taskInput.userId,
        action: "task.created",
        entityType: "task",
        entityId: task.id,
        metadata: { title: task.title, projectId: taskInput.projectId },
        ipAddress: getAuditIpAddress(taskInput),
    }, deps);

    return { message: `Task "${task.title}" created successfully.`, data: task };
};

const normalizeUpdateAssignedTaskInput = (input = {}) => ({
    taskId: input.taskId || input.task || "",
    userId: input.userId || input.updatedBy,
    status: normalizeText(input.status),
    description: normalizeText(input.description),
    dueDate: normalizeDate(input.dueDate),
    auditContext: input.auditContext,
});

const updateTaskWithAccess = async (input, deps = defaultDeps, allowMaintainerLevelUpdate = false) => {
    const taskInput = normalizeUpdateAssignedTaskInput(input);
    assertRequired(taskInput.taskId, "Task is required");
    assertAllowedValue(taskInput.status, TASK_STATUSES, "Task status is invalid");

    const task = await assertTaskExists(taskInput.taskId, deps);
    const teamId = getTaskTeamId(task);
    await assertTeamExists(teamId, deps);
    const membership = await assertMembership({ teamId, userId: taskInput.userId, allowedRoles: VIEWER_LEVEL_ROLES }, deps);

    const hasMaintainerLevelAccess = MAINTAINER_LEVEL_ROLES.includes(membership.role);
    const isAssigned = Array.isArray(task.assignedTo) && task.assignedTo.some((assignee) => idMatches(getAssigneeId(assignee), taskInput.userId));
    if (!isAssigned && !(allowMaintainerLevelUpdate && hasMaintainerLevelAccess)) {
        throw createActionError(403, allowMaintainerLevelUpdate
            ? "Only maintainer-level users or assigned users can update this task"
            : "Only assigned users can update this task");
    }

    const data = { updatedById: taskInput.userId };
    if (taskInput.status) data.status = taskInput.status;
    if (taskInput.description) data.description = taskInput.description;
    if (taskInput.dueDate !== null) data.dueDate = taskInput.dueDate;
    data.completedAt = (taskInput.status || task.status) === "done" ? new Date() : null;

    const updatedTask = await deps.Task.update(taskInput.taskId, data);

    await logActivity({
        teamId,
        actorId: taskInput.userId,
        action: "task.updated",
        entityType: "task",
        entityId: task.id,
        metadata: { status: updatedTask.status },
        ipAddress: getAuditIpAddress(taskInput),
    }, deps);

    return { message: `Task "${updatedTask.title}" updated successfully.`, data: updatedTask };
};

const updateAssignedTaskService = (input, deps = defaultDeps) => updateTaskWithAccess(input, deps, false);
const updateTaskService = (input, deps = defaultDeps) => updateTaskWithAccess(input, deps, true);

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
    const teamId = getTaskTeamId(task);
    await assertTeamExists(teamId, deps);
    await assertMembership({ teamId, userId: commentInput.userId, allowedRoles: VIEWER_LEVEL_ROLES }, deps);

    const comment = await deps.Comment.create({
        teamId,
        projectId: getTaskProjectId(task),
        taskId: commentInput.taskId,
        content: commentInput.content,
        authorId: commentInput.userId,
    });

    await logActivity({
        teamId,
        actorId: commentInput.userId,
        action: "comment.created",
        entityType: "comment",
        entityId: comment.id,
        metadata: { taskId: commentInput.taskId },
        ipAddress: getAuditIpAddress(commentInput),
    }, deps);

    return { message: "Comment created successfully.", data: comment };
};

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
    const teamId = getTaskTeamId(task);
    await assertTeamExists(teamId, deps);
    await assertMembership({ teamId, userId: taskInput.userId, allowedRoles: MAINTAINER_LEVEL_ROLES }, deps);
    await assertMembership({ teamId, userId: taskInput.assigneeId, allowedRoles: VIEWER_LEVEL_ROLES }, deps);

    const assignedTo = Array.isArray(task.assignedTo) ? task.assignedTo : [];
    const alreadyAssigned = assignedTo.some((assignee) => idMatches(getAssigneeId(assignee), taskInput.assigneeId));
    const updatedTask = alreadyAssigned
        ? await deps.Task.update(taskInput.taskId, { updatedById: taskInput.userId })
        : await deps.Task.assign(taskInput.taskId, taskInput.assigneeId, taskInput.userId);

    await logActivity({
        teamId,
        actorId: taskInput.userId,
        action: "task.assigned",
        entityType: "task",
        entityId: task.id,
        metadata: { assigneeId: taskInput.assigneeId },
        ipAddress: getAuditIpAddress(taskInput),
    }, deps);

    return { message: `Task "${updatedTask.title}" assigned successfully.`, data: updatedTask };
};

const deleteTaskService = async (input, deps = defaultDeps) => {
    const taskInput = normalizeAssignTaskInput(input);
    assertRequired(taskInput.taskId, "Task is required");

    const task = await assertTaskExists(taskInput.taskId, deps);
    const teamId = getTaskTeamId(task);
    await assertTeamExists(teamId, deps);
    await assertMembership({ teamId, userId: taskInput.userId, allowedRoles: MAINTAINER_LEVEL_ROLES }, deps);

    const deletedTask = await deps.Task.softDelete(taskInput.taskId, taskInput.userId);

    await logActivity({
        teamId,
        actorId: taskInput.userId,
        action: "task.deleted",
        entityType: "task",
        entityId: task.id,
        metadata: { title: task.title },
        ipAddress: getAuditIpAddress(taskInput),
    }, deps);

    return { message: `Task "${deletedTask.title}" deleted successfully.`, data: deletedTask };
};

module.exports = {
    assignTaskService,
    commentService,
    createTaskService,
    deleteTaskService,
    updateAssignedTaskService,
    updateTaskService,
    viewTasksService,
};

