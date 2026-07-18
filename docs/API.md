# API Documentation

This document describes the current backend route surface for the CC Backend Recruitment Task submission. The active API prefix is `/v1/api`, with `GET /health` mounted at the application root. The project also includes EJS-rendered pages and form-driven action routes for manual workflow testing.

## Response Shapes

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

REST validation and API errors use:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "field is required"
}
```

Some auth-controller errors currently return only `{ "message": "..." }`, because auth routes predate the REST response helper.

Common status codes:

- `200` for read, update, refresh, and action success.
- `201` for created resources.
- `204` for successful project/task soft-delete responses.
- `400` for validation failures.
- `401` for missing or invalid authentication.
- `403` for insufficient team authorization.
- `404` for missing records.
- `409` for conflicts such as duplicate users, already-joined memberships, or non-pending invitations.
- `503` for failed health checks.

## Authentication Routes

All auth API routes are mounted under `/v1/api/auth`.

### `POST /v1/api/auth/signup`

Creates a local user account.

Body:

```json
{
  "name": "User Name",
  "email": "user@example.com",
  "password": "Password123!"
}
```

Current behavior:

- Checks for an existing user by name or email.
- Hashes the password before storage.
- Creates the user in PostgreSQL.
- Redirects to `/login` on success.

### `POST /v1/api/auth/login`

Authenticates a user.

Body:

```json
{
  "name": "User Name",
  "password": "Password123!"
}
```

Current behavior:

- Finds the user by `name`.
- Verifies the password hash.
- Sets `loginToken` and `refreshToken` cookies.
- Stores only a SHA-256 hash of the refresh token.
- Redirects to `/team-select` on success.

### `POST /v1/api/auth/refresh`

Rotates the refresh token and issues a new short-lived `loginToken`.

Current behavior:

- Reads the `refreshToken` cookie.
- Verifies the JWT.
- Looks up the hashed token in PostgreSQL.
- Revokes the presented token.
- Creates a replacement refresh token in the same family.
- Detects reuse of revoked refresh tokens and revokes the full token family.

### `POST /v1/api/auth/logout`

Logs the user out.

Current behavior:

- Revokes the presented refresh-token family when possible.
- Updates logout metadata when a valid login token is available.
- Clears `loginToken`, `roleToken`, and `refreshToken`.
- Redirects to `/login`.

### `PATCH /v1/api/auth/update`

Updates the authenticated user's account details.

Auth:

- Requires `loginToken`; expired access tokens can be refreshed through `refreshToken` by `authenticateUser`.

Body fields:

- `name`
- `email`
- `password`
- `newPassword`
- `avatarUrl`

### `POST /v1/api/auth/update`

Form-compatible version of the update route with the same auth and controller behavior.

### `DELETE /v1/api/auth/delete`

Deletes the authenticated user after password confirmation.

Auth:

- Requires `loginToken`; expired access tokens can be refreshed through `refreshToken` by `authenticateUser`.

### `POST /v1/api/auth/delete`

Form-compatible version of the delete-user route.

## REST Team Routes

All routes in this section require `authenticateUser`. REST authorization is resource-based: services verify membership using the target team or the owning team of the target resource. REST routes do not require `roleToken`.

### `POST /v1/api/teams`

Creates a team.

Body:

```json
{
  "name": "Team A",
  "description": "Optional description"
}
```

Current behavior:

- Creates a team.
- Creates an owner `TeamMembership` for the creator.
- Logs `team.created`.
- Returns `201`.

### `GET /v1/api/teams/:teamId`

Returns a team after confirming the user belongs to it.

### `POST /v1/api/teams/:teamId/join`

Joins a team using an invitation token.

Body:

```json
{
  "token": "raw-invitation-token"
}
```

Current behavior:

- Hashes the presented invitation token.
- Confirms the invitation exists, belongs to the team, is pending, and is not expired.
- Rejects already-joined users.
- Creates a membership using the invitation role.
- Marks the invitation accepted.
- Logs `team.joined`.
- Returns `201`.

### `GET /v1/api/teams/:teamId/members`

Lists team members and their roles after confirming the requester is a team member.

### `POST /v1/api/teams/:teamId/invitations`

Creates a team invitation.

Body:

```json
{
  "email": "new.member@example.com",
  "role": "member"
}
```

Allowed roles:

- `maintainer`
- `member`
- `viewer`

Permission:

- Owner or Maintainer.

Current response includes the raw invitation token once. The database stores the token hash.

### `PATCH /v1/api/teams/:teamId/members/:userId/role`

Changes a team member role.

Body:

```json
{
  "role": "viewer"
}
```

Allowed target roles:

- `maintainer`
- `member`
- `viewer`

Permission:

- Owner only.

## REST Project Routes

### `GET /v1/api/teams/:teamId/projects`

Lists non-deleted projects for the team after confirming team membership.

### `POST /v1/api/teams/:teamId/projects`

Creates a project in the team.

Body:

```json
{
  "name": "Project A",
  "description": "Optional description",
  "dueDate": "2026-08-01"
}
```

Permission:

- Owner or Maintainer.

### `GET /v1/api/projects/:projectId`

Returns a project after confirming the user belongs to the owning team.

### `PATCH /v1/api/projects/:projectId`

Updates mutable project fields.

Body fields:

- `name`
- `description`
- `status`
- `dueDate`

Allowed statuses:

- `active`
- `on_hold`
- `completed`
- `archived`

Permission:

- Owner or Maintainer.

### `DELETE /v1/api/projects/:projectId`

Soft-deletes and archives a project.

Permission:

- Owner or Maintainer.

Response:

- `204 No Content`.

## REST Task Routes

### `GET /v1/api/teams/:teamId/tasks`

Lists visible non-deleted tasks for a team.

Supported query parameters:

- `projectId`
- `status`
- `priority`
- `search`
- `page`
- `limit`

Allowed statuses:

- `todo`
- `in_progress`
- `blocked`
- `review`
- `done`

Allowed priorities:

- `low`
- `medium`
- `high`
- `urgent`

Current behavior:

- Confirms the requester belongs to the target team or the project-owning team.
- Supports case-insensitive title search through `search`.
- Supports pagination when `page` and `limit` are present.
- Defaults for route validation are `page = 1` and `limit = 20`, with limit clamped to `100`.

### `POST /v1/api/projects/:projectId/tasks`

Creates a task under a project.

Body:

```json
{
  "title": "Task A",
  "description": "Optional description",
  "status": "todo",
  "priority": "medium",
  "dueDate": "2026-08-01"
}
```

Permission:

- Owner, Maintainer, or Member.

### `GET /v1/api/tasks/:taskId`

Returns a task after confirming the user belongs to the owning team.

### `PATCH /v1/api/tasks/:taskId`

Updates task status, description, and due date.

Body fields:

- `status`
- `description`
- `dueDate`

Permission:

- Assigned users may update assigned tasks.
- Maintainer-level users may update through the REST `updateTaskService` path.

### `DELETE /v1/api/tasks/:taskId`

Soft-deletes a task.

Permission:

- Owner or Maintainer.

Response:

- `204 No Content`.

### `POST /v1/api/tasks/:taskId/assignees`

Assigns a task to a team member.

Body:

```json
{
  "assigneeId": "user-id"
}
```

Permission:

- Owner or Maintainer.

## REST Comment Routes

### `GET /v1/api/tasks/:taskId/comments`

Lists non-deleted comments for a task after confirming access through the task's owning team.

### `POST /v1/api/tasks/:taskId/comments`

Creates a task comment.

Body:

```json
{
  "content": "Looks good."
}
```

Permission:

- Any team member role, including Viewer.

## REST Activity And Health Routes

### `GET /v1/api/teams/:teamId/activity`

Lists activity log entries for a team after confirming membership.

### `GET /health`

Checks database health through Prisma.

Success response:

```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2026-07-17T00:00:00.000Z"
}
```

Failure response:

```json
{
  "code": "DATABASE_UNAVAILABLE",
  "message": "Database health check failed"
}
```

## UI Routes

These routes support the optional EJS frontend.

Public or login routes:

- `GET /`
- `GET /home`
- `GET /login`
- `GET /signup`
- `GET /logout`

Team selection routes:

- `GET /team-select`
- `POST /team-select`

Dashboard routes requiring both `loginToken` and `roleToken`:

- `GET /main`
- `GET /overview`
- `GET /tasks`
- `GET /projects`
- `GET /permissions`
- `GET /members`
- `GET /audit`
- `GET /notes`
- `GET /settings`
- `GET /update`
- `GET /delete`

## EJS Action Routes

Active mounted routes:

```text
GET  /v1/api/content/actions?action=<actionName>
POST /v1/api/content/actions
```

Auth:

- Requires `loginToken`.
- Requires `roleToken` for team-scoped actions.
- `createTeam` requires only `loginToken` because a user may not have a team yet.

Supported action names:

- `createTeam`
- `inviteMembers`
- `changeRoles`
- `createProject`
- `editProject`
- `updateProject`
- `deleteProject`
- `createTask`
- `viewTasks`
- `updateAssignedTask`
- `assignTask`
- `deleteTask`
- `comment`

Known UI wiring note:

- Some EJS templates currently still contain old `/api/...` form actions or links. The active Express mounts are `/v1/api/...`, so those templates need rewiring before the EJS action UI can be treated as fully aligned with the route table.

## Role Permission Matrix

| Feature | Owner | Maintainer | Member | Viewer |
| :--- | :---: | :---: | :---: | :---: |
| View Team | Yes | Yes | Yes | Yes |
| Invite Members | Yes | Yes | No | No |
| Change Roles | Yes | No | No | No |
| Create Project | Yes | Yes | No | No |
| Edit Project | Yes | Yes | No | No |
| Delete Project | Yes | Yes | No | No |
| Create Task | Yes | Yes | Yes | No |
| Assign Task | Yes | Yes | No | No |
| Update Assigned Task | Assigned or maintainer-level through REST | Assigned or maintainer-level through REST | Assigned only | No |
| Delete Task | Yes | Yes | No | No |
| View Tasks | Yes | Yes | Yes | Yes |
| Comment | Yes | Yes | Yes | Yes |
