# API Endpoint Requirement Audit

Source document: `CC Backend Recruitment Task.docx`

Updated: 2026-07-15

## Summary

The backend now exposes the required collaboration features through explicit JSON REST endpoints under the active `/v1/api` prefix. The older generic action endpoint still exists for the EJS action UI, but it is no longer the only way to verify team, project, task, comment, and activity behavior.

The strongest remaining gaps are no longer the API endpoint surface itself. The main remaining work is documentation polish, production deployment evidence, HTTPS/domain setup, and hardening items such as rate limiting and complete public deployment notes.

## Present Endpoints

### Authentication

```text
POST   /v1/api/auth/signup
POST   /v1/api/auth/login
POST   /v1/api/auth/refresh
POST   /v1/api/auth/logout
PATCH  /v1/api/auth/update
POST   /v1/api/auth/update
DELETE /v1/api/auth/delete
POST   /v1/api/auth/delete
```

Implemented auth capabilities include signup, login, logout, password hashing, JWT cookie authentication, refresh-token rotation, user update, and user delete.

### REST Teams

```text
POST  /v1/api/teams
GET   /v1/api/teams/:teamId
POST  /v1/api/teams/:teamId/join
GET   /v1/api/teams/:teamId/members
POST  /v1/api/teams/:teamId/invitations
PATCH /v1/api/teams/:teamId/members/:userId/role
```

### REST Projects

```text
GET    /v1/api/teams/:teamId/projects
POST   /v1/api/teams/:teamId/projects
GET    /v1/api/projects/:projectId
PATCH  /v1/api/projects/:projectId
DELETE /v1/api/projects/:projectId
```

### REST Tasks

```text
GET    /v1/api/teams/:teamId/tasks?projectId=&status=&priority=&search=&page=&limit=
POST   /v1/api/projects/:projectId/tasks
GET    /v1/api/tasks/:taskId
PATCH  /v1/api/tasks/:taskId
DELETE /v1/api/tasks/:taskId
POST   /v1/api/tasks/:taskId/assignees
```

Task listing supports title search, status filter, priority filter, and pagination with:

```json
{
  "page": 1,
  "limit": 20,
  "total": 0,
  "pages": 0
}
```

### REST Comments

```text
GET  /v1/api/tasks/:taskId/comments
POST /v1/api/tasks/:taskId/comments
```

### REST Activity And Health

```text
GET /v1/api/teams/:teamId/activity
GET /health
```

Health success response:

```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2026-07-15T00:00:00.000Z"
}
```

### Generic Action API

```text
GET  /v1/api/content/actions?action=<action>
POST /v1/api/content/actions
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

These routes remain useful for the EJS UI, but the REST routes above are now the primary API surface for requirement verification.

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
| Signup | Present | `POST /v1/api/auth/signup` |
| Login | Present | `POST /v1/api/auth/login` |
| Logout | Present | `POST /v1/api/auth/logout` |
| Refresh tokens | Present | `POST /v1/api/auth/refresh` plus middleware fallback |
| Create team | Present | `POST /v1/api/teams` |
| Join team | Present | `POST /v1/api/teams/:teamId/join` using invitation token |
| Invite users to team | Present | `POST /v1/api/teams/:teamId/invitations` |
| View team members | Present | `GET /v1/api/teams/:teamId/members` |
| View member roles | Present | Included in team members response |
| Change member roles | Present | `PATCH /v1/api/teams/:teamId/members/:userId/role` |
| Create project | Present | `POST /v1/api/teams/:teamId/projects` |
| Edit/update project | Present | `PATCH /v1/api/projects/:projectId` |
| Delete project | Present | `DELETE /v1/api/projects/:projectId` soft-deletes/archives |
| View projects | Present | `GET /v1/api/teams/:teamId/projects` and `GET /v1/api/projects/:projectId` |
| Create task | Present | `POST /v1/api/projects/:projectId/tasks` |
| Assign task | Present | `POST /v1/api/tasks/:taskId/assignees` |
| Update assigned task | Present | `PATCH /v1/api/tasks/:taskId` |
| Delete task | Present | `DELETE /v1/api/tasks/:taskId` soft-deletes |
| View tasks | Present | `GET /v1/api/teams/:teamId/tasks` |
| Add comments | Present | `POST /v1/api/tasks/:taskId/comments` |
| View comments | Present | `GET /v1/api/tasks/:taskId/comments` |
| Activity log | Present | Services write logs; `GET /v1/api/teams/:teamId/activity` reads logs |
| Search tasks by title | Present | `search` query on task list |
| Filter tasks by status | Present | `status` query on task list |
| Filter tasks by priority | Present | `priority` query on task list |
| Pagination | Present | `page` and `limit` query on task list |
| Health endpoint | Present | `GET /health` |
| Dockerfile | Present | `Dockerfile.backend`, `Dockerfile.nginx`, `Dockerfile.postgres` |
| docker-compose.yml | Present | Found at project root |
| NGINX config | Present | `nginx.conf` and `Dockerfile.nginx` |
| README | Present but needs refresh | `docs/README.md` still mentions some now-completed gaps |
| API documentation | Present but needs refresh | `docs/API.md` still documents older `/api` paths |
| ENGINEERING_DECISIONS.md | Present but needs refresh | Some future-improvement items are now implemented |

## Response And Error Shape

REST success responses use:

```json
{
  "message": "Success message",
  "data": {}
}
```

Paginated list responses use:

```json
{
  "message": "Found 1 task(s).",
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  }
}
```

REST errors use:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "field is required"
}
```

Common status codes:

```text
200 read/update/action success
201 created resources
204 successful soft-delete/archive
400 validation failures
401 missing or invalid authentication
403 insufficient authorization
404 missing records
409 conflict such as duplicate membership or used invitation
503 failed health check
```

## Remaining API-Related Notes

- `DELETE` routes return `204`, but the underlying services soft-delete/archive projects and tasks rather than hard-delete them.
- The REST API uses `loginToken` identity and service-level membership checks; it does not require `roleToken` because the target team is explicit in the REST URL or owning resource.
- The EJS action routes still use `roleToken` for selected-team console behavior.
- Validation is internal middleware rather than Zod/Joi/express-validator, matching the current no-new-dependency approach.

## Main Finding

The earlier endpoint-surface gap is now mostly closed. The codebase has explicit REST endpoints for the major recruitment requirements, including join-team, member listing, project listing, comment listing, task search/filter/pagination, activity logs, and health checks.

The next high-value work is to update `docs/API.md`, `docs/README.md`, and `docs/ENGINEERING_DECISIONS.md` so the formal deliverables match the implementation.
