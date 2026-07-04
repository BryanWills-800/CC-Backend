# Specification-Driven SDLC

## Collaborative Project & Task Management Backend

**Source baseline**

- `CC Backend Recruitment Task.docx`
- `Backend Learning Resources.docx`

**Purpose:** convert the recruitment specification into an implementation-ready lifecycle with explicit scope, traceability, quality gates, deployment controls, and evaluation evidence.

**Status labels**

- **Required** — stated by the recruitment task.
- **Recommended** — strongly supported by the evaluation criteria or learning guidance.
- **Optional** — identified as a brownie point, bonus, or optional feature.
- **Inferred** — a proposed engineering decision needed to make the specification executable.

---

## 1. Delivery principles

1. Complete and verify the core backend before bonus work.
2. Enforce authorization at every protected endpoint; UI restrictions are not security controls.
3. Keep domain, application, persistence, and transport concerns separable.
4. Record significant choices and tradeoffs as they are made, not at the end.
5. Produce evidence for every requirement: endpoint, test, documentation, or deployed behavior.
6. Prefer a small maintainable design over premature microservices or optional infrastructure.

Recommended reference implementation: a modular monolith, relational database, REST API, and containerized deployment. The specification permits other justified choices.

---

## 2. Requirements baseline

| ID | Requirement | Priority | Acceptance evidence |
|---|---|---:|---|
| AUTH-01 | Signup, login, and logout | Required | API contract and successful/negative tests |
| AUTH-02 | Secure password hashing, validation, and authentication | Required | Hash configuration, validation tests, protected-route tests |
| AUTH-03 | JWT or session authentication | Required choice | ADR explaining strategy and security controls |
| TEAM-01 | Create, join, invite to, and inspect a team | Required | Team and membership API tests |
| TEAM-02 | Team creator becomes Owner | Required | Transactional creation test |
| RBAC-01 | Owner, Maintainer, Member, and Viewer roles | Required | Permission matrix and parameterized authorization tests |
| RBAC-02 | Only Owners modify member roles | Required | Positive and negative endpoint tests |
| PROJ-01 | Team-scoped project CRUD | Required | Owner/Maintainer CRUD; all-member read tests |
| TASK-01 | Project-scoped task CRUD | Required | Role and ownership tests |
| TASK-02 | A task supports multiple assignees | Required | Join-table persistence and API tests |
| COMM-01 | Task comments include content, author, and creation time | Required | Comment API and persistence tests |
| COMM-02 | All team roles, including Viewer, may comment | Required | Viewer comment test |
| AUDIT-01 | Record important project, task, comment, and membership events | Required baseline | Immutable activity-event queries and tests |
| QUERY-01 | Search tasks by title | Required | Search tests |
| QUERY-02 | Filter tasks by status and priority | Required | Filter combination tests |
| QUERY-03 | Pagination | Required | Boundary and stable-order tests |
| ERR-01 | Correct HTTP status codes, validation errors, and structured errors | Required | Contract tests |
| OPS-01 | Dockerfile and `docker-compose.yml` for backend and database | Required | Clean-machine container startup |
| OPS-02 | Linux deployment with NGINX reverse proxy | Required | Public routing and process evidence |
| OPS-03 | Custom domain or subdomain | Required | DNS resolution evidence |
| OPS-04 | HTTPS using Let's Encrypt | Required | Valid certificate and redirect evidence |
| DOC-01 | README with setup, local run, and repository structure | Required | Repository review |
| DOC-02 | API documentation | Required | OpenAPI, Postman, Bruno, or equivalent |
| DOC-03 | `ENGINEERING_DECISIONS.md` | Required | Seven requested decision sections completed |
| OPT-01 | OAuth, refresh tokens, fuzzy search, rate limiting, versioning | Optional | Separate stories and tests |
| OPT-02 | Health endpoint | Optional | `/health` smoke test |
| OPT-03 | Jobs, real-time updates, caching, expanded testing | Optional | Separate architecture and operational evidence |

### Resolved ambiguities

- **Viewer comments:** the comments section and permission matrix explicitly allow Viewer comments. This overrides the narrower “view tasks only” wording in the task subsection.
- **Activity log:** it appears in the Phase 1 body and again as recommended bonus work. Treat basic activity events as core; advanced querying, retention, and analytics remain optional.
- **Join team:** the mechanism is unspecified. Default to invitation-token acceptance; document any open-join alternative.
- **Project/task fields:** the specification intentionally leaves them open. Proposed fields are listed below and must be confirmed in the API contract.
- **Testing:** listed as a bonus feature, but automated verification is an SDLC quality control. A small risk-based suite is therefore a release gate; very broad coverage remains optional.

---

## 3. Domain and data design

### Proposed core entities

- **User:** id, name, email, password hash, status, timestamps.
- **Team:** id, name, slug, created_by, timestamps.
- **Membership:** team_id, user_id, role, joined_at; unique `(team_id, user_id)`.
- **Invitation:** team_id, email, role, token hash, inviter, expiry, accepted_at.
- **Project:** team_id, name, description, status, timestamps, created_by.
- **Task:** project_id, title, description, status, priority, due_at, created_by, timestamps.
- **TaskAssignee:** task_id, user_id, assigned_by, assigned_at; unique `(task_id, user_id)`.
- **Comment:** task_id, author_id, content, created_at, updated_at.
- **ActivityEvent:** team_id, actor_id, action, subject_type, subject_id, metadata, created_at.
- **RefreshToken** if refresh-token authentication is selected.

### Integrity and indexing

- Foreign keys enforce team → project → task ownership.
- Membership and assignee uniqueness constraints prevent duplicates.
- Index task filters using project/team scope plus status, priority, and stable pagination key.
- Index normalized task title only if query evidence justifies it.
- Never trust a client-provided team ID without verifying membership and resource ancestry.
- Record audit events in the same transaction as the state change when practical.

---

## 4. Authorization model

| Capability | Owner | Maintainer | Member | Viewer |
|---|:---:|:---:|:---:|:---:|
| View team, projects, and tasks | Yes | Yes | Yes | Yes |
| Invite members | Yes | Yes | No | No |
| Change roles | Yes | No | No | No |
| Create/edit/delete projects | Yes | Yes | No | No |
| Create tasks | Yes | Yes | Yes | No |
| Assign tasks | Yes | Yes | No | No |
| Update assigned tasks | Yes | Yes | Yes | No |
| Delete tasks | Yes | Yes | No | No |
| Comment | Yes | Yes | Yes | Yes |

Authorization is evaluated in this order:

1. Authenticate the caller.
2. Resolve the resource and its team.
3. Verify active team membership.
4. Evaluate the role/capability rule.
5. Apply resource-level conditions, such as “Member may update only an assigned task.”
6. Perform the mutation and write the activity event.

Negative tests must cover cross-team ID substitution, role escalation, unassigned task updates, unauthorized deletion, and invitation misuse.

---

## 5. Target architecture

### Core

`Client → HTTPS/NGINX → Backend REST API → Relational Database`

- NGINX terminates TLS and reverse proxies to the backend.
- The backend is one independently deployable modular application.
- Modules include identity, teams/memberships, projects, tasks, comments, activity, and shared policy/error infrastructure.
- PostgreSQL is the recommended relational store because the domain is relationship-heavy; another database is acceptable with a documented rationale.

### Optional extensions

- OAuth provider for federated sign-in.
- Redis for cache, throttling, or queue infrastructure only when justified.
- Background worker for invitations, reminders, summaries, or cleanup.
- WebSocket/SSE channel for live updates.

Optional components must not become dependencies of the core delivery unless their failure behavior and operational cost are addressed.

Editable diagrams: [architecture and SDLC lifecycle in FigJam](https://www.figma.com/board/12ttumIM3O7ilyKggJSRBI).

---

## 6. Lifecycle, gates, and artifacts

| Stage | Key work | Exit gate | Main artifacts |
|---|---|---|---|
| Discover | Parse scope, classify required/optional work, resolve ambiguities | Requirements have IDs, priority, and acceptance evidence | Baseline, assumptions, traceability matrix |
| Design | Define domain, API, RBAC, error contract, architecture, deployment | Security and data-design review complete | ERD, OpenAPI draft, ADRs, threat notes |
| Plan | Slice vertical increments and identify dependencies | Stories are small, testable, and ordered core-first | Backlog, iteration goals, risk register |
| Build | Implement migrations, use cases, endpoints, policies, docs | Code review and local checks pass | Source, migrations, API docs |
| Verify | Run functional, integration, security, and container tests | Required acceptance evidence passes | Test report, authorization matrix |
| Release | Build immutable image, deploy staging, migrate, smoke test | Release checklist and rollback plan pass | Image tag, changelog, deployment record |
| Operate | Monitor health, logs, errors, certificate, and database | Production behavior is observable | Health/log evidence, incident notes |
| Improve | Review problems, tradeoffs, and future work | Decisions and backlog updated | Retrospective, `ENGINEERING_DECISIONS.md` |

### Change control

Any changed requirement updates its acceptance criteria, API/schema impact, tests, documentation, and traceability row before implementation is considered complete.

---

## 7. Incremental delivery plan

### Iteration 0 — Foundation

- Repository structure, configuration, database connection, migrations.
- Error envelope, request validation, logging baseline, API version prefix.
- Docker development environment.
- Initial OpenAPI and engineering-decision log.

**Gate:** application and database start from a clean checkout; migration and smoke checks pass.

### Iteration 1 — Identity and teams

- Signup/login/logout and selected authentication strategy.
- Team creation, invitation acceptance, membership listing, roles.
- Owner assignment and role-change authorization.

**Gate:** authentication and team-boundary negative tests pass.

### Iteration 2 — Projects and tasks

- Project CRUD and role rules.
- Task fields, CRUD, multi-assignee model, assigned-member update rule.
- Core activity events.

**Gate:** permission matrix is executable and all rows pass.

### Iteration 3 — Collaboration and queries

- Comments for all roles.
- Activity-log retrieval if exposed.
- Search, status/priority filtering, pagination, stable ordering.
- Structured validation and error-contract completion.

**Gate:** API contract, query combinations, and cross-team tests pass.

### Iteration 4 — Hardening and public deployment

- Production container image and Compose stack.
- Linux host, NGINX, DNS, Let's Encrypt, secrets, migration procedure.
- Staging smoke test, production release, rollback rehearsal.
- README, API documentation, and engineering-decision document finalized.

**Gate:** clean deployment, public HTTPS validation, and submission audit pass.

### Bonus lane

OAuth, refresh tokens, fuzzy search, rate limiting, health endpoint, jobs, real-time delivery, and caching enter the backlog only after the core release gate.

---

## 8. Verification strategy

### Minimum release-gate suite

- Unit tests for validation, policy decisions, and state transitions.
- Integration tests for persistence, constraints, and transactions.
- API tests for happy paths, validation, status codes, and error schema.
- Parameterized RBAC tests across every capability and role.
- Negative security tests for IDOR/cross-team access and privilege escalation.
- Authentication tests for expired, missing, invalid, revoked, or logged-out credentials.
- Query tests for filters, search, pagination boundaries, and deterministic ordering.
- Migration test against an empty database.
- Container startup and dependency-readiness test.
- Staging smoke test through NGINX and HTTPS.

### Quality gates

- Formatting, lint, type/static checks as supported by the chosen stack.
- No hard-coded secrets or committed environment files.
- Dependency vulnerability review with documented exceptions.
- Code review confirms policy checks occur before state changes.
- API documentation and implementation remain synchronized.

---

## 9. DevSecOps and deployment

### Required deployment path

1. Build a versioned backend image.
2. Start backend and database through Compose.
3. Apply migrations using a controlled one-shot command.
4. Configure NGINX for reverse proxying, request limits, and HTTPS redirect.
5. Point the domain/subdomain to the host.
6. Obtain and renew a Let's Encrypt certificate.
7. Store secrets outside source control and restrict file/process permissions.
8. Run smoke tests through the public URL.
9. Retain the prior image/configuration and document rollback.

### Operational baseline

- Structured request and error logs without passwords, tokens, or sensitive payloads.
- Correlation/request ID.
- Service and database readiness signal; `/health` is recommended.
- Disk, memory, process, database connectivity, certificate-expiry, and error-rate checks.
- Backup/restore procedure for persistent data.

---

## 10. Traceability and Definition of Done

### Traceability record

Each requirement row should link:

`Requirement ID → story → endpoint/use case → schema/migration → test → documentation → deployment evidence`

Example:

`RBAC-02 → Only Owner changes roles → PATCH /teams/{teamId}/members/{userId} → Membership.role → authorization tests → OpenAPI + README → staging test result`

### Definition of Done

A required item is done only when:

- Acceptance criteria are met.
- Authorization and tenant boundaries are tested.
- Validation and error behavior are documented.
- Migrations are reversible or have a documented recovery plan.
- Automated tests pass.
- API documentation is current.
- Relevant activity events are emitted.
- Container and staging smoke checks pass when deployment-sensitive.
- Tradeoffs or deviations are recorded.
- No unresolved high-severity defect remains.

---

## 11. Submission evidence

- Working repository and APIs.
- README: prerequisites, setup, environment variables, local execution, Docker execution, migrations, tests, repository structure, and deployment notes.
- API documentation and example requests.
- `ENGINEERING_DECISIONS.md` covering project structure, database design, authentication, authorization, problems faced, tradeoffs, and future improvements.
- Dockerfile and `docker-compose.yml`.
- NGINX configuration.
- Public custom-domain HTTPS URL.
- Test command and result summary.
- Permission matrix and requirement traceability.
- Known limitations and optional work clearly separated.

---

## 12. Candidate enablement path

Use the supplied learning resources just in time:

1. HTTP, REST, and database fundamentals before Iteration 0.
2. Chosen framework basics before Iteration 1.
3. CRUD and relational modeling before Iteration 2.
4. Authentication and RBAC before protected endpoint work.
5. Filtering and pagination before Iteration 3.
6. Docker, Linux, NGINX, DNS, and HTTPS before Iteration 4.
7. Prefer official documentation for framework, database, authentication, Docker, NGINX, and deployment behavior.

This learning path supports delivery; it does not change the acceptance baseline.

