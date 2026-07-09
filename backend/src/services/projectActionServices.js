const { createProject } = require("./createProject");

const projectActionServices = {
    createProject: async (input) => createProject.services.createProjectService(input),
    creatorRoles: createProject.meta.PROJECT_CREATOR_ROLES,
};

module.exports = { projectActionServices };
