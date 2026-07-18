# Collaborative Project and Task Management Backend

This repository is a backend submission for the CC Backend Recruitment Task. It uses Express, Prisma, PostgreSQL, cookie-based JWT authentication, team-scoped RBAC, REST APIs, and a lightweight EJS UI for manual workflow testing.

## Requirement Scope

The implemented backend supports:

- User signup, login, refresh-token rotation, logout, update, and delete flows.
- Team creation, invitation, invitation-token join, membership listing, and role changes.
- Team-scoped projects with create, read, update, edit-form, and soft-delete/archive behavior.
- Project/team-scoped tasks with create, list, assign, update, and soft-delete behavior.
- Task comments.
- Activity logs for team, project, task, role, invite, and comment events.
- RBAC for `owner`, `maintainer`, `member`, and `viewer` roles.
- Task search, status filter, priority filter, and pagination on the REST task list.
- Docker-based local deployment with PostgreSQL, backend, and NGINX services.
- Documentation for setup, APIs, architecture, and engineering decisions.

## Tech Stack

- Node.js and Express.js.
- EJS for the optional server-rendered UI.
- Prisma ORM with PostgreSQL.
- JWT cookies for identity, refresh-token rotation, and selected-team role context.
- Jest and Supertest for tests.
- Docker Compose for local PostgreSQL, backend, and NGINX orchestration.

## Repository Structure

```text
backend/src/index.js                    Express app entry point and route mounts
backend/src/routes                      Auth, REST, UI, and EJS action routes
backend/src/controllers                 HTTP controllers
backend/src/actions                     EJS action forms, dynamic options, and registry
backend/src/renderers                   Generic EJS action-form renderer
backend/src/services/actions            Mutation/domain services and service authorization
backend/src/services/queries            REST read/query services by domain
backend/src/db                          Prisma connection and repository helpers
backend/src/db/prisma/schema.prisma     PostgreSQL schema
backend/src/middlewares                 Authentication, role authorization, and API validation
backend/src/views                       EJS views
backend/src/tests                       Jest test suite
docs/API.md                             API and route documentation
docs/ENGINEERING_DECISIONS.md           Engineering decisions document
docs/ACTION_WORKFLOW_FILES.md           Action and REST query workflow file map
```

## Environment Variables

Create `backend/.env` for local development.

```env
PORT=4001
JWT_SECRET=replace_with_a_strong_secret
DATABASE_URL=postgresql://postgres:local_postgres_password@localhost:5432/rafc?schema=public
```

Optional Docker Compose environment values can be placed in a root `.env` file:

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=local_postgres_password
POSTGRES_DB=rafc
POSTGRES_PORT=5432
PORT=4001
NGINX_PORT=8080
JWT_SECRET=replace_with_a_strong_secret
```

## Local Setup

Install dependencies:

```powershell
npm install
```

Start PostgreSQL through Docker Compose:

```powershell
npm run postgres:up
```

Validate and apply the Prisma schema:

```powershell
npm run prisma:modelcopy:validate
npm run prisma:modelcopy:generate
npm run prisma:modelcopy:push
```

Start the Express backend:

```powershell
node backend/src/index.js
```

Default local URL when `PORT=4001` is configured:

```text
http://localhost:4001
```

If `PORT` is not configured, `backend/src/index.js` falls back to port `3000`.

## Docker Setup

Run the local container stack:

```powershell
docker compose up --build
```

The Compose stack includes:

- `postgres`, built from `Dockerfile.postgres`.
- `backend`, built from `Dockerfile.backend`.
- `nginx`, built from `Dockerfile.nginx` and `nginx.conf`.

By default, NGINX publishes on `http://localhost:8080` and proxies to the backend container.

## Main Application Flow

1. Open `/signup` and create a user.
2. Log in from `/login`.
3. Use `/team-select` to choose an active team context.
4. Use `/main` and the action console pages for team, project, task, invite, comment, and role workflows.

The EJS frontend is optional and exists to exercise backend flows. The formal JSON API surface is mounted under `/v1/api`.

## Tests

Run the test suite:

```powershell
npm test -- --runInBand
```

The current suite covers authentication, refresh-token rotation, middleware behavior, REST routes, EJS action dispatch, domain services, query services, shared helpers, Prisma repository helpers, and role-related behavior.

## Current Implementation Notes

Implemented areas include:

- Signup, login, refresh, logout, update, and delete-user flows.
- `loginToken`, `refreshToken`, and `roleToken` cookie model.
- One-time-use refresh-token rotation with hashed token storage.
- Team creation with automatic owner membership.
- Team invitations, invitation-token join, member listing, and role changes.
- Project create, read, update, edit, and soft-delete/archive workflows.
- Task create, list, search, filter, paginate, assign, update, and soft-delete workflows.
- Task comments.
- Activity logging through the service layer.
- Conventional REST endpoints under `/v1/api`.
- EJS action workflow using action forms, dynamic options, registry metadata, and a generic renderer.
- REST read/query services split by domain under `backend/src/services/queries`.
- Dockerfiles and Docker Compose for backend, database, and NGINX.
- `GET /health` backed by a Prisma database health check.

## Known Gaps And Caveats

- Public production deployment, domain setup, and HTTPS/Let's Encrypt evidence are not included in this repository.
- Authentication rate limiting is not implemented yet.
- Some EJS templates still contain old `/api/...` form/link paths, while the active Express mounts are `/v1/api/...`; those templates should be rewired before relying on the EJS UI end-to-end.
- The Prisma script names still use `modelcopy` wording for historical reasons, but they point to the active schema under `backend/src/db/prisma`.
