# Engineering Decisions

This document is written for the CC Backend Recruitment Task. It explains the project structure, database design, authentication, authorization, problems faced, tradeoffs, and future improvements.

## 1. Project Structure

The project uses Express.js because the assignment focuses on backend fundamentals: routing, middleware, authentication, authorization, database access, and CRUD behavior. Express keeps the framework layer small and makes the architecture easy to inspect.

The backend is organized by responsibility:

```text
routes -> controllers -> renderers -> services -> repositories -> database
```

Important folders:

- `backend/src/routes` defines HTTP endpoints.
- `backend/src/controllers` extracts request input and chooses the response flow.
- `backend/src/renderers` builds EJS action views for form-based workflows.
- `backend/src/services/actions` contains business rules, authorization checks, validation, and activity logging.
- `backend/src/db` contains Prisma connection and repository helpers.
- `backend/src/middlewares` contains authentication and role authorization middleware.
- `backend/src/tests` contains unit and integration-style tests.

This structure was chosen so business logic does not live in route files or EJS templates. Controllers remain thin, while services are responsible for domain behavior.

## 2. Database Design

The project uses PostgreSQL with Prisma.

Main entities:

- `User` stores identity and password hash data.
- `Team` represents an organization/workspace.
- `TeamMembership` connects users to teams and stores the user's role in that team.
- `Project` belongs to a team.
- `Task` belongs to a project and team.
- `Comment` belongs to a task, project, team, and author.
- `TeamInvitation` stores invite records.
- `ActivityLog` tracks important events.

A user does not have one global role. Roles are stored in `TeamMembership`, because the same user may be an owner in one team and a viewer or member in another.

Indexes in the Prisma schema support common lookups such as team membership, project status, task status, task priority, activity history, and token lookup.

## 3. Authentication

The project uses JWT cookies.

There are two cookies:

- `loginToken` proves the user is authenticated.
- `roleToken` proves which team context and role the user selected.

This split exists because a user can log in before choosing a team. `/team-select` only requires `loginToken`. Team-scoped routes require both `loginToken` and `roleToken`.

Passwords are hashed before storage. Raw passwords are not stored.

## 4. Authorization

Authorization is based on team roles from `TeamMembership`:

- Owner
- Maintainer
- Member
- Viewer

Middleware responsibilities:

- `authenticateUser` verifies login identity.
- `authorizeUserRole` verifies selected team role context.

Service responsibilities:

- Confirm that the user belongs to the target team.
- Confirm that the user's role is allowed for the requested operation.
- Prevent unauthorized project, task, invite, and role-management actions.

This keeps route-level authorization and business-rule authorization separate.

## 5. Tradeoffs

JWT cookies were used as the core backend authentication strategy. OAuth is planned to be added later.

PostgreSQL was chosen for the final data model because the assignment has strongly relational data: users, teams, memberships, projects, tasks, comments, invitations, and activity logs.

The current UI uses EJS forms. The assignment says frontend is optional, so the EJS screens exist mainly to exercise backend behavior manually. A future production system could expose cleaner JSON REST endpoints for a separate frontend.

Redis, background jobs, WebSockets, and fuzzy search were skipped or left for future work because the main priority was clean backend structure, RBAC, and database modeling.

## 6. Deployment Decisions

The repository includes Docker support for:

- Backend service
- PostgreSQL database
- NGINX reverse proxy

This matches the deployment requirement that the repository include Docker and Compose support. The NGINX file represents the reverse-proxy layer expected in a VPS or cloud deployment.

Before an actual public deployment, the project still needs:

- Production secrets
- Domain/subdomain setup
- HTTPS through Let's Encrypt
- Environment-specific deployment documentation
- A health endpoint for service checks

## 7. Future Improvements

Given more time, these are some options:

- A complete team invitation acceptance and join-team flow
- Task title search, priority filter, and pagination
- A centralized error-handling middleware with consistent response shapes
- API versioning such as `/api/v1`
- Rate limiting for authentication routes
- A health endpoint for deployment checks
- More complete JSON API routes alongside the EJS action workflow
- Background jobs for invitation emails and due-date reminders
- WebSocket updates for live task changes
- Redis caching for frequently accessed team/project/task lists
- Cleanup of legacy Mongo/Mongoose files after the Prisma migration is fully settled
