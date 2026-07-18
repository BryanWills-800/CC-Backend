# Engineering Decisions

This document is written for the CC Backend Recruitment Task. It explains the project structure, database design, authentication, authorization, tradeoffs, deployment shape, and remaining improvement areas.

## 1. Project Structure

The project uses Express.js because the assignment focuses on backend fundamentals: routing, middleware, authentication, authorization, database access, and CRUD behavior. Express keeps the framework layer small and makes the architecture easy to inspect.

The backend is organized by responsibility:

```text
routes -> controllers -> services/renderers -> repositories -> Prisma/PostgreSQL
```

Important folders:

- `backend/src/routes` defines HTTP endpoints.
- `backend/src/controllers` extracts request input and formats HTTP responses.
- `backend/src/actions` defines EJS action form metadata, dynamic form options, and action registration.
- `backend/src/renderers` contains the generic EJS action-form renderer.
- `backend/src/services/actions` contains mutation/domain business rules, authorization checks, validation, and activity logging.
- `backend/src/services/queries` contains REST read/query services grouped by domain.
- `backend/src/db` contains Prisma connection and repository helpers.
- `backend/src/middlewares` contains authentication, selected-team role authorization, and REST validation middleware.
- `backend/src/tests` contains Jest and Supertest coverage.

This structure was chosen so business logic does not live in route files or EJS templates. Controllers remain thin, while services are responsible for domain behavior. REST read paths use domain query services so `restApiController.js` does not directly orchestrate repository reads or read authorization checks.

## 2. Database Design

The project uses PostgreSQL with Prisma.

Main entities:

- `User` stores identity, password hash, account metadata, and refresh-token relations.
- `Team` represents an organization/workspace.
- `TeamMembership` connects users to teams and stores the user's role in that team.
- `Project` belongs to a team.
- `Task` belongs to a project and team, and can be assigned to multiple users.
- `Comment` belongs to a task, project, team, and author.
- `TeamInvitation` stores invite records and hashed invitation tokens.
- `ActivityLog` tracks important events.
- `RefreshToken` stores hashed refresh tokens for rotation and replay protection.

A user does not have one global role. Roles are stored in `TeamMembership`, because the same user may be an owner in one team and a viewer or member in another.

Indexes in the Prisma schema support common lookups such as team membership, project status, task status, task priority, activity history, refresh-token lookup, and token-family revocation.

## 3. Authentication

The project uses JWT cookies.

There are three auth-related cookies:

- `loginToken` is the short-lived access token that proves user identity.
- `refreshToken` is a one-time-use refresh token stored as a raw JWT only in the browser cookie; the database stores only its SHA-256 hash.
- `roleToken` proves which team context and role the user selected for EJS dashboard/action routes.

This split exists because a user can log in before choosing a team. `/team-select` only requires identity auth. Team-scoped EJS dashboard routes require both identity and selected-team role context.

Refresh-token rotation is implemented so a successful refresh revokes the current refresh token, stores a replacement in the same family, and links the old token to the new one. Reusing a revoked refresh token is treated as replay and revokes the token family.

Passwords are hashed before storage. Raw passwords and raw refresh tokens are not stored in the database.

## 4. Authorization

Authorization is based on team roles from `TeamMembership`:

- Owner
- Maintainer
- Member
- Viewer

Middleware responsibilities:

- `authenticateUser` verifies login identity and can rotate a valid `refreshToken` when `loginToken` is expired.
- `authorizeUserRole` verifies selected team role context from `roleToken` for EJS dashboard/action routes.

Service responsibilities:

- Confirm that the user belongs to the target team.
- Confirm that the user's role is allowed for the requested operation.
- Prevent unauthorized project, task, invite, comment, and role-management actions.

REST routes do not rely on `roleToken`; they derive authorization from the explicit team/resource ID in the route and service-level membership checks. This keeps REST APIs usable by a separated frontend/backend system while preserving service-layer RBAC.

## 5. API And UI Decisions

The backend exposes conventional JSON REST endpoints under `/v1/api` for teams, projects, tasks, comments, activity, and auth. These endpoints are the primary API surface for requirement verification.

The optional EJS UI remains useful for manual exploration, but it is not the only backend interface. EJS action handling is organized as:

```text
contentRoutes -> actionController -> actionRegistry -> actionFormRenderer -> domain service
```

This replaced the older multi-registration action flow and keeps action metadata in one registry.

REST read handling is organized as:

```text
restApiRoutes -> restApiController -> domain query service -> queryAccess -> prismaRepositories
```

This keeps read authorization and repository calls grouped by domain instead of inside the REST controller.

Known caveat: some EJS templates still contain old `/api/...` links, while the active Express mounts are `/v1/api/...`. The route table and REST documentation reflect the active mounts.

## 6. Tradeoffs

JWT cookies were used as the core backend authentication strategy. OAuth is not implemented.

PostgreSQL was chosen for the final data model because the assignment has strongly relational data: users, teams, memberships, projects, tasks, comments, invitations, activity logs, and refresh tokens.

The current UI uses EJS forms. The assignment says frontend is optional, so the EJS screens exist mainly to exercise backend behavior manually. A production system could consume the `/v1/api` JSON endpoints from a separate frontend.

Redis, background jobs, WebSockets, fuzzy search, and email delivery were skipped or left for future work because the main priority was clean backend structure, RBAC, database modeling, and verifiable REST coverage.

## 7. Deployment Decisions

The repository includes Docker support for:

- PostgreSQL database through `Dockerfile.postgres` and the `postgres` Compose service.
- Backend service through `Dockerfile.backend` and the `backend` Compose service.
- NGINX reverse proxy through `Dockerfile.nginx`, `nginx.conf`, and the `nginx` Compose service.

The backend includes `GET /health`, which performs a Prisma database health check and returns `503` when the database check fails.

Before an actual public production deployment, the project still needs:

- Production secrets outside the repository.
- Domain/subdomain setup.
- HTTPS through a production TLS setup such as Let's Encrypt.
- Public deployment evidence and environment-specific deployment notes.
- Authentication rate limiting.

## 8. Future Improvements

Given more time, the highest-value improvements are:

- Rewire remaining EJS templates that still post or link to old `/api/...` paths.
- Add authentication rate limiting and brute-force protection.
- Centralize auth-controller error responses into the same `{ code, message }` shape used by REST helpers.
- Add invitation email delivery instead of returning invitation tokens only through the API response.
- Add production deployment documentation with exact hosting, domain, HTTPS, and secret-management steps.
- Add background jobs for invitation emails and due-date reminders.
- Add WebSocket updates for live task changes.
- Add Redis caching only if team/project/task lists become large enough to justify it.
