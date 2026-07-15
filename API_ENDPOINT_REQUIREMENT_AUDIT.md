# API Endpoint Requirement Audit

Source document: `CC Backend Recruitment Task.docx`

## Summary

The backend implements many of the required capabilities, especially authentication, RBAC-backed action services, projects, tasks, comments, and refresh-token auth. However, not every requirement is exposed as a clear REST API endpoint yet.

Most business operations currently go through a generic action endpoint:

```text
GET  /api/content/actions?action=<action>
POST /api/content/actions
```

That can work functionally, but the recruitment document asks for REST APIs. For evaluation, explicit resource endpoints would make the implementation much easier to verify.

## Present Endpoints

### Authentication

```text
POST   /api/auth/signup
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
PATCH  /api/auth/update
POST   /api/auth/update
DELETE /api/auth/delete
POST   /api/auth/delete
```

Implemented auth capabilities include:

- Signup
- Login
- Logout
- Password hashing
- JWT authentication
- Refresh-token implementation
- User update
- User delete

### Generic Action API

```text
GET  /api/content/actions?action=<action>
POST /api/content/actions
```

Supported action names:

```text
createTeam
inviteMembers
changeRoles
createProject
editProject
updateProject
deleteProject
createTask
assignTask
updateAssignedTask
deleteTask
viewTasks
comment
```

These actions cover a large part of the required behavior, but they are not REST-style resource routes.

### UI Routes

```text
GET  /
GET  /home
GET  /login
GET  /signup
GET  /logout
GET  /team-select
POST /team-select
GET  /main
GET  /overview
GET  /tasks
GET  /projects
GET  /permissions
GET  /members
GET  /audit
GET  /notes
GET  /settings
GET  /update
GET  /delete
```

## Requirement Coverage

| Requirement | Status | Notes |
|---|---:|---|
| Signup | Present | `POST /api/auth/signup` |
| Login | Present | `POST /api/auth/login` |
| Logout | Present | `POST /api/auth/logout` |
| Refresh tokens | Present | `POST /api/auth/refresh` plus middleware fallback |
| Create team | Present | Action: `createTeam` |
| Join team | Missing | No explicit `joinTeam` endpoint/action found |
| Invite users to team | Present | Action: `inviteMembers` |
| View team members | Missing / indirect | Repository supports member loading, but no clear API endpoint/action |
| View member roles | Missing / indirect | Same as above |
| Change member roles | Present | Action: `changeRoles` |
| Create project | Present | Action: `createProject` |
| Edit/update project | Present | Actions: `editProject`, `updateProject` |
| Delete project | Present | Action: `deleteProject` |
| View projects | Missing / indirect | Project option loading exists, but no clear API endpoint/action |
| Create task | Present | Action: `createTask` |
| Assign task | Present | Action: `assignTask` |
| Update assigned task | Present | Action: `updateAssignedTask` |
| Delete task | Present | Action: `deleteTask` |
| View tasks | Present | Action: `viewTasks` |
| Add comments | Present | Action: `comment` |
| View comments | Missing | No clear `viewComments` endpoint/action found |
| Activity log | Present internally | Services write activity logs |
| Search tasks by title | Missing | `viewTasks` does not appear to support title search |
| Filter tasks by status | Present | `viewTasks` supports `status` |
| Filter tasks by priority | Missing | Priority exists on tasks but is not supported by `viewTasks` |
| Pagination | Missing | No pagination support found in task listing |
| Health endpoint | Missing | Optional in document, but `GET /health` not present |
| Dockerfile | Present | `Dockerfile.backend`, `Dockerfile.nginx`, `Dockerfile.postgres` |
| docker-compose.yml | Present | Found at project root |
| NGINX config | Present | `nginx.conf` and `Dockerfile.nginx` |
| README | Present | `docs/README.md` |
| ENGINEERING_DECISIONS.md | Present | `docs/ENGINEERING_DECISIONS.md` |

## Missing Or Recommended REST API Endpoints

To better match the requirements document, add explicit API routes like these:

### Teams

```text
POST   /api/teams
GET    /api/teams/:teamId
POST   /api/teams/:teamId/join
GET    /api/teams/:teamId/members
POST   /api/teams/:teamId/invitations
PATCH  /api/teams/:teamId/members/:userId/role
```

### Projects

```text
GET    /api/projects?teamId=<teamId>
POST   /api/projects
GET    /api/projects/:projectId
PATCH  /api/projects/:projectId
DELETE /api/projects/:projectId
```

### Tasks

```text
GET    /api/tasks?teamId=<teamId>&projectId=<projectId>&status=<status>&priority=<priority>&search=<title>&page=<page>&limit=<limit>
POST   /api/tasks
GET    /api/tasks/:taskId
PATCH  /api/tasks/:taskId
DELETE /api/tasks/:taskId
POST   /api/tasks/:taskId/assignees
```

### Comments

```text
GET    /api/tasks/:taskId/comments
POST   /api/tasks/:taskId/comments
```

### Activity Log

```text
GET    /api/teams/:teamId/activity
```

### Health

```text
GET    /health
```

Example response:

```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2026-01-01T12:00:00Z"
}
```

## Main Finding

The service layer already contains much of the required business logic, but the API surface is incomplete for a REST API submission. The biggest gaps are read/list endpoints, join-team flow, comment listing, task search/filter/pagination, and a health endpoint.

Recommended next step: add REST route/controller files that call the existing service layer, rather than rewriting the business logic.