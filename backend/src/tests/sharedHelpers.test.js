const {
    assertAllowedValue,
    assertMembership,
    assertProjectExists,
    assertRequired,
    assertTaskExists,
    assertTeamExists,
    buildSlug,
    createActionError,
    getAuditIpAddress,
    idMatches,
    logActivity,
    normalizeDate,
    normalizeText,
} = require("../services/actionMessages/shared");
const { createActionDeps } = require("./serviceTestUtils");

describe("action shared helpers", () => {
    test.each([
        ["  Hello  ", "Hello"],
        [null, ""],
        [42, ""],
    ])("normalizes text %#", (input, expected) => {
        expect(normalizeText(input)).toBe(expected);
    });

    test.each([
        ["Launch API!", "launch-api"],
        ["  Many   Spaces  ", "many-spaces"],
        ["***", ""],
    ])("builds slugs %#", (input, expected) => {
        expect(buildSlug(input)).toBe(expected);
    });

    test("normalizes empty dates to null", () => {
        expect(normalizeDate("")).toBeNull();
        expect(normalizeDate(undefined)).toBeNull();
        expect(normalizeDate("2026-08-01")).toBe("2026-08-01");
    });

    test("compares ids by string value", () => {
        expect(idMatches(123, "123")).toBe(true);
        expect(idMatches("abc", "def")).toBe(false);
    });

    test("creates status-aware action errors", () => {
        const error = createActionError(418, "Short and stout");

        expect(error).toBeInstanceOf(Error);
        expect(error.statusCode).toBe(418);
        expect(error.message).toBe("Short and stout");
    });

    test("asserts required values", () => {
        expect(assertRequired("value", "Required")).toBe("value");
        expect(() => assertRequired("", "Required")).toThrow("Required");
    });

    test("asserts allowed values", () => {
        expect(assertAllowedValue("done", ["todo", "done"], "Bad status")).toBe("done");
        expect(() => assertAllowedValue("blocked", ["todo", "done"], "Bad status")).toThrow("Bad status");
        expect(assertAllowedValue("", ["todo"], "Bad status")).toBe("");
    });

    test("reads audit ip from input", () => {
        expect(getAuditIpAddress({ auditContext: { ipAddress: "127.0.0.1" } })).toBe("127.0.0.1");
        expect(getAuditIpAddress({})).toBeNull();
    });

    test("rejects missing or archived teams", async () => {
        const deps = createActionDeps();
        deps.Team.findById.mockResolvedValue({ id: "team-1", isArchived: true });

        await expect(assertTeamExists("team-1", deps)).rejects.toMatchObject({ statusCode: 404 });

        deps.Team.findById.mockResolvedValue(null);
        await expect(assertTeamExists("team-1", deps)).rejects.toThrow("Team not found");
    });

    test("rejects deleted or missing projects", async () => {
        const deps = createActionDeps();
        deps.Project.findById.mockResolvedValue({ id: "project-1", isDeleted: true });

        await expect(assertProjectExists("project-1", deps)).rejects.toMatchObject({ statusCode: 404 });

        deps.Project.findById.mockResolvedValue(null);
        await expect(assertProjectExists("project-1", deps)).rejects.toThrow("Project not found");
    });

    test("rejects deleted or missing tasks", async () => {
        const deps = createActionDeps();
        deps.Task.findById.mockResolvedValue({ id: "task-1", isDeleted: true });

        await expect(assertTaskExists("task-1", deps)).rejects.toMatchObject({ statusCode: 404 });

        deps.Task.findById.mockResolvedValue(null);
        await expect(assertTaskExists("task-1", deps)).rejects.toThrow("Task not found");
    });

    test("requires authenticated membership", async () => {
        const deps = createActionDeps();

        await expect(assertMembership({ teamId: "team-1" }, deps)).rejects.toMatchObject({ statusCode: 400 });
    });

    test("rejects users without membership", async () => {
        const deps = createActionDeps();
        deps.TeamMembership.findForUserTeam.mockResolvedValue(null);

        await expect(assertMembership({ teamId: "team-1", userId: "user-1" }, deps)).rejects.toMatchObject({ statusCode: 403 });
    });

    test("rejects memberships outside allowed roles", async () => {
        const deps = createActionDeps();
        deps.TeamMembership.findForUserTeam.mockResolvedValue({ role: "viewer" });

        await expect(assertMembership({ teamId: "team-1", userId: "user-1", allowedRoles: ["owner"] }, deps)).rejects.toThrow("permission");
    });

    test("returns matching membership", async () => {
        const deps = createActionDeps();
        const membership = { role: "owner" };
        deps.TeamMembership.findForUserTeam.mockResolvedValue(membership);

        await expect(assertMembership({ teamId: "team-1", userId: "user-1", allowedRoles: ["owner"] }, deps)).resolves.toBe(membership);
    });


    test("logs activity through create fallback", async () => {
        const deps = createActionDeps();

        await logActivity({ teamId: "team-1", actorId: "user-1", action: "x", entityType: "task", entityId: "task-1", ipAddress: "ip" }, deps);

        expect(deps.ActivityLog.create.calls[0][0]).toEqual(expect.objectContaining({ teamId: "team-1", actorId: "user-1", action: "x", ipAddress: "ip" }));
    });

    test("skips activity logging when no model is provided", async () => {
        const deps = createActionDeps();
        deps.ActivityLog = null;

        await expect(logActivity({ action: "x" }, deps)).resolves.toBeNull();
    });

    test("logs activity without ip address when omitted", async () => {
        const deps = createActionDeps();

        await logActivity({ teamId: "team-1", actorId: "user-1", action: "x", entityType: "task", entityId: "task-1" }, deps);

        expect(deps.ActivityLog.create.calls[0][0]).toEqual(expect.objectContaining({ ipAddress: null }));
    });
});


