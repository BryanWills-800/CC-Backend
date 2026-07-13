# API Documentation

This document describes the backend routes for the CC Backend Recruitment Task submission. The current project includes EJS-rendered pages and form-driven action routes, so not every endpoint is a pure JSON REST endpoint. The underlying behavior is still organized through route, controller, service, repository, and Prisma layers.

## Authentication Routes

### `POST /api/auth/signup`

Creates a local user account.

Body:

```json
{
  "name": "User Name",
  "email": "user@example.com",
  "password": "Password123!"
}
```

Expected behavior:

- Validates required fields in the controller/service flow.
- Hashes the password before storage.
- Creates the user in PostgreSQL.

### `POST /api/auth/login`

Authenticates a user.

Body:

```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

Expected behavior:

- Verifies the password hash.
- Creates a `loginToken` cookie.
- Redirects the user to `/team-select`.

### `POST /api/auth/logout`

Logs the user out.

Expected behavior:

- Clears `loginToken`.
- Clears `roleToken`.
- Updates logout metadata where applicable.

### `PATCH /api/auth/update`

Updates the authenticated user's account details.

Auth:

- Requires `loginToken`.

### `POST /api/auth/update`

Form-compatible version of the update route.

Auth:

- Requires `loginToken`.

### `DELETE /api/auth/delete`

Deletes the authenticated user.

Auth:

- Requires `loginToken`.

### `POST /api/auth/delete`

Form-compatible version of the delete-user route.

Auth:

- Requires `loginToken`.

## UI Routes

These routes support the optional EJS frontend used to exercise the backend.

- `GET /home`
- `GET /login`
- `GET /signup`

### `GET /team-select`

Shows teams that the authenticated user belongs to.

Auth:

- Requires `loginToken`.

### `POST /team-select`

Selects the active team context.

Auth:

- Requires `loginToken`.

Expected behavior:

- Confirms that the user belongs to the selected team.
- Sets `roleToken` with `teamId`, `teamName`, and role.

### Dashboard Routes

These routes require both identity and selected team context:

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

Auth:

- Requires `loginToken`.
- Requires `roleToken`.

## Action Routes

### `GET /api/content/actions?action=<actionName>`

Renders the action form for the selected action.

Auth:

- Requires `loginToken`.
- Requires `roleToken` for team-scoped actions.
- `createTeam` requires only `loginToken` because a user may not have a team yet.

### `POST /api/content/actions`

Executes an action.

Auth:

- Requires `loginToken`.
- Requires `roleToken` for team-scoped actions.
- `createTeam` requires only `loginToken`.

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

## Action Details

### `createTeam`

Fields:

- `name`
- `description`

Behavior:

- Creates a team.
- Creates an owner `TeamMembership` for the creator.
- Logs `team.created`.

### `inviteMembers`

Fields:

- `teamId`
- `email`
- `role`

Allowed roles:

- `maintainer`
- `member`
- `viewer`

Expected permission:

- Owner or Maintainer.

### `changeRoles`

Fields:

- `teamId`
- `memberUserId`
- `role`

Allowed target roles:

- `maintainer`
- `member`
- `viewer`

Expected permission:

- Owner only.

### `createProject`

Fields:

- `teamId`
- `name`
- `description`
- `dueDate`

Expected permission:

- Owner or Maintainer.

### `updateProject`

Fields:

- `projectId`
- `name`
- `description`
- `status`
- `dueDate`

Expected permission:

- Owner or Maintainer.

### `deleteProject`

Fields:

- `projectId`

Expected permission:

- Owner or Maintainer.

### `createTask`

Fields:

- `projectId`
- `title`
- `description`
- `status`
- `priority`
- `dueDate`

Expected permission:

- Owner, Maintainer, or Member.

### `viewTasks`

Fields:

- `teamId`
- `projectId`
- `status`

Expected permission:

- Any team member role.

### `assignTask`

Fields:

- `taskId`
- `assigneeId`

Expected permission:

- Owner or Maintainer.

### `updateAssignedTask`

Fields:

- `taskId`
- `status`
- `description`
- `dueDate`

Expected permission:

- Assigned user, or a higher-permission team role according to service checks.

### `deleteTask`

Fields:

- `taskId`

Expected permission:

- Owner or Maintainer.

### `comment`

Fields:

- `taskId`
- `content`

Expected permission:

- Any team member role, including Viewer.

## Role Permission Matrix

| Feature | Owner | Maintainer | Member | Viewer |
| :---: | :---: | :---: | :---: | :---: |
| View Team | ✓ | ✓ | ✓ | ✓ |
| Invite Members | ✓ | ✓ | ✗ | ✗ |
| Change Roles | ✓ | ✗ | ✗ | ✗ |
| Create Project | ✓ | ✓ | ✗ | ✗ |
| Edit Project | ✓ | ✓ | ✗ | ✗ |
| Delete Project | ✓ | ✓ | ✗ | ✗ |
| Create Task | ✓ | ✓ | ✓ | ✗ |
| Assign Task | ✓ | ✓ | ✗ | ✗ |
| Update Assigned Task | ✓ | ✓ | ✓ | ✗ |
| Delete Task | ✓ | ✓ | ✗ | ✗ |
| View Tasks | ✓ | ✓ | ✓ | ✓ |
| Comment | ✓ | ✓ | ✓ | ✓ |

## Error Behavior

The current application returns errors either as JSON middleware responses or as rendered action-form errors.

Common status codes:

- `400` for validation failures
- `401` for missing or invalid authentication
- `403` for insufficient authorization
- `404` for missing records
- `500` for unexpected failures

Example structured error target from the assignment:

```json
{
  "success": false,
  "message": "Validation Failed",
  "errors": {
    "email": ["Invalid email format."]
  }
}
```

The project has service-level validation and status codes, but a fully centralized structured error system is a recommended follow-up.
