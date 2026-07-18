const {
    VIEWER_LEVEL_ROLES,
    assertMembership,
    assertProjectExists,
    assertTaskExists,
    assertTeamExists,
    defaultDeps,
} = require("../actions/shared");

const requireTeamMember = async ({ teamId, userId }, deps = defaultDeps) => {
    const team = await assertTeamExists(teamId, deps);
    const membership = await assertMembership({ teamId, userId, allowedRoles: VIEWER_LEVEL_ROLES }, deps);

    return { membership, team };
};

const requireProjectMember = async ({ projectId, userId }, deps = defaultDeps) => {
    const project = await assertProjectExists(projectId, deps);
    await requireTeamMember({ teamId: project.teamId, userId }, deps);
    return project;
};

const requireTaskMember = async ({ taskId, userId }, deps = defaultDeps) => {
    const task = await assertTaskExists(taskId, deps);
    await requireTeamMember({ teamId: task.teamId, userId }, deps);
    return task;
};

module.exports = {
    requireProjectMember,
    requireTaskMember,
    requireTeamMember,
};
