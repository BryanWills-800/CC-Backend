const {
    deleteProjectService,
    editProjectService,
    updateProjectService,
} = require("../services/actions/projectServices");
const { createActionDeps, primeTeam } = require("./serviceTestUtils");

describe("project action services edge cases", () => {
    let deps;

    beforeEach(() => {
        deps = createActionDeps();
        primeTeam(deps);
    });

    test("editProject rejects missing project id", async () => {
        await expect(editProjectService({ userId: "user-1" }, deps)).rejects.toMatchObject({
            statusCode: 400,
            message: "Project is required",
        });
    });

    test("editProject requires maintainer-level role", async () => {
        deps.Project.findById.mockResolvedValue({ id: "project-1", teamId: "team-1", name: "Core", isDeleted: false });
        deps.TeamMembership.findForUserTeam.mockResolvedValue({ role: "viewer" });

        await expect(editProjectService({ projectId: "project-1", userId: "user-1" }, deps)).rejects.toMatchObject({ statusCode: 403 });
    });

    test("updateProject rejects invalid status", async () => {
        await expect(updateProjectService({ projectId: "project-1", userId: "user-1", status: "almost" }, deps)).rejects.toMatchObject({
            statusCode: 400,
            message: "Project status is invalid",
        });
    });

    test("updateProject trims mutable fields and keeps blank description unchanged", async () => {
        const project = { id: "project-1", teamId: "team-1", name: "Old", description: "Keep", status: "active", isDeleted: false };
        const updatedProject = { ...project, name: "New", status: "on_hold", dueDate: "2026-08-01", updatedById: "user-1" };
        deps.Project.findById.mockResolvedValue(project);
        deps.Project.update.mockResolvedValue(updatedProject);

        await updateProjectService({ project: "project-1", updatedBy: "user-1", name: "  New  ", description: "   ", status: "on_hold", dueDate: "2026-08-01" }, deps);

        expect(deps.Project.update.calls[0]).toEqual(["project-1", {
            updatedById: "user-1",
            name: "New",
            status: "on_hold",
            dueDate: "2026-08-01",
        }]);
    });

    test("updateProject leaves due date unchanged when omitted", async () => {
        const project = { id: "project-1", teamId: "team-1", name: "Core", dueDate: "2026-08-01", status: "active", isDeleted: false };
        deps.Project.findById.mockResolvedValue(project);
        deps.Project.update.mockResolvedValue({ ...project, name: "Core API" });

        await updateProjectService({ projectId: "project-1", userId: "user-1", name: "Core API" }, deps);

        expect(deps.Project.update.calls[0]).toEqual(["project-1", {
            updatedById: "user-1",
            name: "Core API",
        }]);
    });

    test("deleteProject rejects missing project id", async () => {
        await expect(deleteProjectService({ userId: "user-1" }, deps)).rejects.toMatchObject({
            statusCode: 400,
            message: "Project is required",
        });
    });

    test("deleteProject archives and soft deletes project", async () => {
        const project = { id: "project-1", teamId: "team-1", name: "Core", status: "active", isDeleted: false };
        deps.Project.findById.mockResolvedValue(project);
        deps.Project.softDelete.mockResolvedValue({ ...project, isDeleted: true, status: "archived", updatedById: "user-1" });

        const result = await deleteProjectService({ projectId: "project-1", userId: "user-1", auditContext: { ipAddress: "127.0.0.1" } }, deps);

        expect(result.data.isDeleted).toBe(true);
        expect(result.data.status).toBe("archived");
        expect(deps.Project.softDelete.calls[0]).toEqual(["project-1", "user-1"]);
        expect(deps.ActivityLog.create.calls[0][0]).toEqual(expect.objectContaining({
            action: "project.deleted",
            ipAddress: "127.0.0.1",
        }));
    });
});

