const jwt = require("jsonwebtoken");
const TeamMembership = require("../models/teamMembershipModel");
const { resolveMainRole } = require("../utils/roles");

const getResolvedRole = (req) => {
    const requestedRole = req.user && req.user.role ? req.user.role : process.env.ROLE;
    return resolveMainRole(requestedRole);
}

const authCookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 3600000,
});

const getSelectedTeam = (req) => ({
    teamId: req.user && req.user.teamId,
    teamName: req.user && req.user.teamName,
});

const buildTeamOption = (membership) => {
    const team = membership.team || {};

    return {
        id: String(team._id || membership.team),
        name: team.name || "Unnamed team",
        description: team.description || "Team workspace",
        role: membership.role,
        joinedAt: membership.joinedAt,
    };
}

const findUserMemberships = async (userId) => TeamMembership
    .find({ user: userId })
    .populate("team")
    .sort({ joinedAt: -1 });

const findSelectedMembership = async ({ userId, teamId }) => TeamMembership
    .findOne({ user: userId, team: teamId })
    .populate("team");

const consolePages = {
    overview: {
        activePage: "overview",
        kicker: "System Overview",
        title: "Control Plane",
        description: "A Stitch-inspired operations page for reading the RBAC workspace at a glance without launching a write action.",
        statusLabel: "Overview online",
        statusDetail: "Read-only console page",
        metrics: [
            { label: "Auth Surface", value: "Guarded", text: "Content routes stay behind token verification." },
            { label: "Role Source", value: "JWT", text: "The dashboard resolves the user role before rendering." },
            { label: "Action Layer", value: "Ready", text: "Actions route through controller, renderer, and service boundaries." },
        ],
        panels: [
            { title: "Command Summary", tag: "SYS", text: "Use this area as the landing console for operators before they enter a workflow." },
            { title: "Service Boundaries", tag: "SVC", text: "Project, task, comment, invitation, and role changes remain service-owned." },
            { title: "Audit Posture", tag: "LOG", text: "Request context is prepared for activity logging without crowding the UI." },
        ],
    },
    tasks: {
        activePage: "tasks",
        kicker: "Task Matrix",
        title: "Task Operations",
        description: "A non-final task matrix page inspired by the Stitch task screens, focused on readable lanes and action entry points.",
        statusLabel: "Task routes armed",
        statusDetail: "Create, assign, update, delete",
        metrics: [
            { label: "Create", value: "Task", text: "Open the create task action form." },
            { label: "Assigned", value: "Update", text: "Move assigned work through status states." },
            { label: "Maintainer", value: "Assign", text: "Assign or remove task records through services." },
        ],
        panels: [
            { title: "View Tasks", tag: "VIEW", text: "Inspect team or project task lanes.", href: "/api/content/actions?action=viewTasks" },
            { title: "Create Task", tag: "TASK", text: "Create a project-scoped task.", href: "/api/content/actions?action=createTask" },
            { title: "Assign Task", tag: "ASGN", text: "Attach an operator to a task.", href: "/api/content/actions?action=assignTask" },
            { title: "Update Assigned Task", tag: "SYNC", text: "Update status, due date, or description.", href: "/api/content/actions?action=updateAssignedTask" },
        ],
    },
    projects: {
        activePage: "projects",
        kicker: "Project Registry",
        title: "Project Console",
        description: "A project command page that gives project actions their own surface instead of making the dashboard do everything.",
        statusLabel: "Project services ready",
        statusDetail: "Create, update, archive",
        metrics: [
            { label: "Creator Roles", value: "2", text: "Owners and maintainers can create projects." },
            { label: "Status", value: "Active", text: "Projects default into active state." },
            { label: "Audit", value: "Logged", text: "Project mutations write activity log records." },
        ],
        panels: [
            { title: "Create Project", tag: "PROJ", text: "Provision a team-scoped project record.", href: "/api/content/actions?action=createProject" },
            { title: "Edit Project", tag: "EDIT", text: "Load project metadata for review.", href: "/api/content/actions?action=editProject" },
            { title: "Update Project", tag: "UPDT", text: "Patch metadata and workflow state.", href: "/api/content/actions?action=updateProject" },
            { title: "Delete Project", tag: "ARCH", text: "Archive project records through service rules.", href: "/api/content/actions?action=deleteProject" },
        ],
    },
    permissions: {
        activePage: "permissions",
        kicker: "Permissions Matrix",
        title: "Role Control",
        description: "A permission-focused page inspired by the Stitch permissions console, separated from the main action grid.",
        statusLabel: "Role controls scoped",
        statusDetail: "Owner-gated mutations",
        metrics: [
            { label: "Viewer", value: "Read", text: "Baseline access to view and comment workflows." },
            { label: "Maintainer", value: "Operate", text: "Project and task management workflows." },
            { label: "Admin", value: "Control", text: "Role mutation entry points." },
        ],
        panels: [
            { title: "Change Roles", tag: "ROLE", text: "Update a member role through the team membership service.", href: "/api/content/actions?action=changeRoles" },
            { title: "Invite Members", tag: "JOIN", text: "Create team invitations with scoped roles.", href: "/api/content/actions?action=inviteMembers" },
            { title: "Auth Guard", tag: "JWT", text: "Protected pages require a verified token before rendering." },
        ],
    },
    members: {
        activePage: "members",
        kicker: "Member Directory",
        title: "Operator Roster",
        description: "A member-oriented console page for invite and role workflows, designed as a future directory surface.",
        statusLabel: "Directory shell ready",
        statusDetail: "Invite and role actions",
        metrics: [
            { label: "Invitation", value: "Pending", text: "Invites persist through TeamInvitation." },
            { label: "Membership", value: "Scoped", text: "TeamMembership owns team access roles." },
            { label: "User Role", value: "Future", text: "User.role can be plucked later for dashboard defaults." },
        ],
        panels: [
            { title: "Invite Members", tag: "JOIN", text: "Send a team invitation with a role.", href: "/api/content/actions?action=inviteMembers" },
            { title: "Change Roles", tag: "ROLE", text: "Adjust member access from the permissions workflow.", href: "/api/content/actions?action=changeRoles" },
            { title: "Comment", tag: "NOTE", text: "Collaborate through task comments.", href: "/api/content/actions?action=comment" },
        ],
    },
    audit: {
        activePage: "audit",
        kicker: "System Audit Logs",
        title: "Audit Context",
        description: "A log-inspired page that mirrors the Stitch audit direction while staying local to the existing EJS app.",
        statusLabel: "Audit stream modeled",
        statusDetail: "ActivityLog-backed services",
        metrics: [
            { label: "Projects", value: "Tracked", text: "Create, update, and delete operations log activity." },
            { label: "Tasks", value: "Tracked", text: "Task creation, assignment, update, and deletion are logged." },
            { label: "Comments", value: "Tracked", text: "Comment creation writes activity records." },
        ],
        panels: [
            { title: "Project Created", tag: "LOG", text: "Includes actor, team, project, metadata, and IP context." },
            { title: "Task Assigned", tag: "LOG", text: "Captures assignee metadata on task changes." },
            { title: "Member Role Updated", tag: "LOG", text: "Records role changes against the affected user." },
        ],
    },
    notes: {
        activePage: "notes",
        kicker: "Service Notes",
        title: "Architecture Notes",
        description: "A reference page for the action-service-renderer structure, echoing the Stitch service notes screens.",
        statusLabel: "Boundaries clear",
        statusDetail: "Action to service to renderer",
        metrics: [
            { label: "Controller", value: "Switch", text: "Only dispatches the selected action." },
            { label: "Renderer", value: "Forms", text: "Extracts input and renders success or error states." },
            { label: "Service", value: "Mongo", text: "Owns validation, authorization, persistence, and audit logging." },
        ],
        panels: [
            { title: "Action Controller", tag: "CTRL", text: "Keeps the action switch thin and predictable." },
            { title: "Action Renderers", tag: "VIEW", text: "Provide shared forms and response rendering." },
            { title: "Action Services", tag: "SVC", text: "Use injected dependencies in tests and Mongoose models in runtime." },
        ],
    },
    settings: {
        activePage: "settings",
        kicker: "System Settings",
        title: "Console Settings",
        description: "A settings shell inspired by Stitch system settings, ready for future profile or workspace controls.",
        statusLabel: "Settings shell online",
        statusDetail: "No destructive action here",
        metrics: [
            { label: "Profile", value: "Local", text: "User updates still go through auth routes." },
            { label: "Session", value: "Cookie", text: "JWT is stored in an HTTP-only cookie." },
            { label: "Theme", value: "Midnight", text: "Visual tokens are centralized in CSS." },
        ],
        panels: [
            { title: "Update Profile", tag: "USER", text: "Future profile controls can live here without redirecting to dashboard." },
            { title: "Delete Account", tag: "WARN", text: "Destructive account controls should require confirmation." },
            { title: "Logout", tag: "EXIT", text: "End the current authenticated session." },
        ],
    },
};

const homeController = (req, res) => {
    res.render("home");
}

const loginController = (req, res) => {
    res.render("login");
}

const signupController = (req, res) => {
    res.render("signup");
}

const logoutController = (req, res) => {
    res.render("logout");
}

const teamSelectController = async (req, res) => {
    try {
        const memberships = await findUserMemberships(req.user.userId);
        const teams = memberships
            .filter((membership) => membership.team && !membership.team.isArchived)
            .map(buildTeamOption);

        return res.render("teamSelect", { teams, error: null });
    } catch (error) {
        return res.status(500).render("teamSelect", { teams: [], error: error.message });
    }
}

const selectTeamController = async (req, res) => {
    try {
        const { teamId } = req.body;
        if (!teamId) {
            const memberships = await findUserMemberships(req.user.userId);
            const teams = memberships
                .filter((membership) => membership.team && !membership.team.isArchived)
                .map(buildTeamOption);

            return res.status(400).render("teamSelect", { teams, error: "Please choose a team to continue." });
        }

        const membership = await findSelectedMembership({ userId: req.user.userId, teamId });
        if (!membership || !membership.team || membership.team.isArchived) {
            const memberships = await findUserMemberships(req.user.userId);
            const teams = memberships
                .filter((item) => item.team && !item.team.isArchived)
                .map(buildTeamOption);

            return res.status(403).render("teamSelect", { teams, error: "You are not a member of that team." });
        }

        const rolePayload = {
            userId: req.user.userId,
            teamId: String(membership.team._id),
            teamName: membership.team.name,
            role: membership.role,
        };

        const roleToken = jwt.sign(rolePayload, process.env.JWT_SECRET, { expiresIn: "1h" });

        return res.cookie("roleToken", roleToken, authCookieOptions())
            .status(200)
            .redirect("/main");
    } catch (error) {
        return res.status(500).render("teamSelect", { teams: [], error: error.message });
    }
}

const updateController = (req, res) => {
    return renderConsolePage("settings")(req, res);
}

const deleteController = (req, res) => {
    return renderConsolePage("settings")(req, res);
}

const mainController = (req, res) => {
    const role = getResolvedRole(req);

    res.render("main", { role, activePage: "dashboard", team: getSelectedTeam(req) });
}

const renderConsolePage = (pageName) => (req, res) => {
    const role = getResolvedRole(req);
    const page = consolePages[pageName] || consolePages.overview;

    res.render("consolePage", { role, page, team: getSelectedTeam(req) });
}

module.exports = {
    homeController,
    loginController,
    signupController,
    logoutController,
    teamSelectController,
    selectTeamController,
    updateController,
    deleteController,
    mainController,
    overviewController: renderConsolePage("overview"),
    tasksController: renderConsolePage("tasks"),
    projectsController: renderConsolePage("projects"),
    permissionsController: renderConsolePage("permissions"),
    membersController: renderConsolePage("members"),
    auditController: renderConsolePage("audit"),
    notesController: renderConsolePage("notes"),
    settingsController: renderConsolePage("settings"),
};










