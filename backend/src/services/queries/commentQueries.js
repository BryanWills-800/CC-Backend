const { defaultDeps } = require("../actions/shared");
const { requireTaskMember } = require("./queryAccess");

const listCommentsQuery = async ({ taskId, userId }, deps = defaultDeps) => {
    await requireTaskMember({ taskId, userId }, deps);
    const comments = await deps.Comment.findForTask(taskId);

    return { message: `Found ${comments.length} comment(s).`, data: comments };
};

module.exports = {
    listCommentsQuery,
};
