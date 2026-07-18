const { defaultDeps } = require("../actions/shared");
const { viewTasksService } = require("../actions/taskServices");
const { requireTaskMember } = require("./queryAccess");

const listTasksQuery = async (input, deps = defaultDeps) => viewTasksService(input, deps);

const getTaskQuery = async ({ taskId, userId }, deps = defaultDeps) => {
    const task = await requireTaskMember({ taskId, userId }, deps);

    return { message: "Task retrieved successfully.", data: task };
};

module.exports = {
    getTaskQuery,
    listTasksQuery,
};
