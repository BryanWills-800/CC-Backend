# Collaborative Project and Task Management Backend

This repository is a backend submission for the CC Backend Recruitment Task. This project has a basic backend structure, database design, authentication, authorization, CRUD workflows and deployment preparation.

## Requirement Scope

The task asks for a backend that supports:

- User signup, login, and logout
- Team creation, invitation, membership, and role management
- Team-scoped projects
- Project-scoped tasks with multi-user assignment
- Comments on tasks
- Activity logs for important events
- RBAC for Owner, Maintainer, Member, and Viewer roles
- Filtering/search behavior for tasks where implemented
- Docker-based local deployment with PostgreSQL and NGINX
- Documentation for setup, APIs, and engineering decisions

## Tech Stack

- Node.js
- Express.js
- EJS for the lightweight frontend
- Prisma ORM
- PostgreSQL
- JWT cookies for authentication and selected-team authorization context
- Jest and Supertest for tests (tests are individual files and are not connected)
- Docker Compose for local service orchestration
- NGINX reverse proxy configuration

## Repository Structure

```text
backend/src/index.js                   Express app entry point
backend/src/routes                     Route definitions
backend/src/controllers                HTTP request controllers
backend/src/renderers                  EJS action-form renderers
backend/src/services/actions           Business logic for team/project/task actions
backend/src/db                         Prisma connection and repository helpers
backend/src/db/prisma/schema.prisma    PostgreSQL schema
backend/src/middlewares                Authentication and authorization middleware
backend/src/views                      EJS views
backend/src/tests                      Jest test suite
docs/API.md                            API and route documentation
docs/ENGINEERING_DECISIONS.md          Required engineering decisions document
```

## Environment Variables

Create `backend/.env` for local development.

```env
PORT=4001

# Some Random String for JWT Secret
JWT_SECRET=replace_with_a_strong_secret

DATABASE_URL=postgresql://postgres:local_postgres_password@localhost:5432/rafc?schema=public
```

In Docker Compose the optional root-level environment values:

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=local_postgres_password
POSTGRES_DB=rafc
POSTGRES_PORT=5432
PORT=4001
NGINX_PORT=8080
```

## Local Setup

Install dependencies:

```powershell
npm install
```

Start PostgreSQL:

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

Default local URL:

```text
http://localhost:4001
```

## Docker Setup

Run the local container stack:

```powershell
docker compose up --build
```

The Compose stack includes:

- PostgreSQL database
- Express backend
- NGINX reverse proxy

## Main Application Flow

1. Open `/signup` and create a user.
2. Log in from `/login`.
3. Use `/team-select` to choose an active team context.
4. Use `/main` and the action console routes for team, project, task, invite, comment, and role workflows.

The optional EJS frontend exists to exercise backend flows more easily. The backend service and RBAC behavior are the focus of the task.

## Tests

Run the test suite:

```powershell
npm test -- --runInBand
```

The test suite covers authentication, middleware behavior, action controller dispatching, team/project/task services, shared helpers, and role-related behavior.

## Current Implementation Notes

Implemented or partially implemented areas include:

- Signup, login, logout, update, and delete-user flows
- Two-token auth model using `loginToken` and `roleToken`
- Team creation with automatic owner membership
- Team invites and role changes
- Project create, update, edit, and soft-delete workflows
- Task create, view, assign, update-assigned-task, and soft-delete workflows
- Task comments
- Activity logging through the service layer
- Dockerfiles and Docker Compose for backend, database, and NGINX

Known areas to improve before a production-style deployment:

- Add a complete invitation acceptance or join-team flow
- Add task title search, priority filtering, and pagination where missing
- Add a health endpoint
- Replace local fallback secrets
- Complete public deployment, domain, and HTTPS configuration
- Remove legacy Mongo/Mongoose leftovers after the Prisma migration is finalized
