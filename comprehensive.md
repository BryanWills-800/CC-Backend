# RAFC / CC-Backend Frontend Design Brief

## Purpose

This document is intended to be appended into Google Stitch or another frontend design tool so generated frontend concepts conform to the internal architecture and product philosophy of this Express/EJS backend.

The frontend should not feel like a generic SaaS dashboard. It should visually express the system's real infrastructure:

- Role-based access control.
- Action-driven workflows.
- Service-layer business logic.
- MongoDB-backed project, task, team, invitation, comment, and audit models.
- A consistent Action -> Renderer -> Service -> Model flow.

## Product Identity

This app is a backend-first RBAC command console. The interface should make permissions, available actions, and service outcomes clear without feeling noisy.

Recommended product feel:

- Clean SaaS console.
- Command center dashboard.
- Minimal, calm, and information-rich.
- Practical for EJS/CSS implementation.
- No unrelated analytics, marketing hero sections, or fake vanity metrics.

Avoid:

- Generic purple SaaS style.
- Decorative chart dashboards that do not map to backend models.
- Complex visual systems that require React-only component architecture.
- Fake AI/productivity copy.
- Frontend-only features that imply backend behavior that does not exist.

## Current Frontend Stack

The current UI is server-rendered with:

- Express.js
- EJS templates
- Shared CSS in `backend/src/public/css/style.css`
- Authenticated routes using cookie-based JWT middleware

Design output should remain practical for server-rendered EJS:

- Normal HTML forms.
- Native inputs, selects, textareas, and buttons.
- Simple cards, panels, rails, grids, and notes areas.
- No dependency on SPA-only behavior unless explicitly planned later.

## Architectural Philosophy

The core pattern is:

```text
Action -> Controller/Switch -> Renderer -> Service -> MongoDB Model -> Audit Log
```

The controller should stay thin. It decides which action was requested and delegates to an action renderer.

Renderers should:

- Extract request input.
- Choose the right form or response view.
- Call services.
- Render success and error states.

Services should:

- Normalize input.
- Validate required fields.
- Enforce business rules.
- Check authorization.
- Create, update, delete, or query MongoDB documents.
- Write audit logs where relevant.

Frontend design should reinforce this structure. A user should feel they are selecting a system action, filling an action-specific form, and receiving a service result.

## Action Family

The dashboard is centered around role-based actions. These actions should feel like one family, not separate mini-apps.

Known action values:

- `viewTasks`
- `comment`
- `createTask`
- `updateAssignedTask`
- `inviteMembers`
- `createProject`
- `editProject`
- `updateProject`
- `deleteProject`
- `assignTask`
- `deleteTask`
- `changeRoles`

`createProject` is not a standalone feature from a design perspective. It should appear as one integrated action in the same shared action workflow as the rest.

## Recommended Dashboard Layout

Use a mix of command center and clean SaaS console.

Recommended structure:

- Left rail: product name, current role, navigation, auth state.
- Main panel: role-based action groups.
- Action cards: clear labels, short descriptions, and optional service/model metadata.
- Shared form panel: appears for the selected action.
- Notes panel: explains service rules, allowed roles, and audit behavior.

Good dashboard labels:

- Dashboard
- Role Context
- Available Actions
- Action Workflow
- Service Notes
- Audit Context
- Submit Action

## Role Philosophy

The app uses role concepts in two places:

1. Team-level roles, used for real authorization.
2. User-level role, experimental, useful for future dashboard selection or default role context.

Team membership roles:

- `owner`
- `maintainer`
- `member`
- `viewer`

Dashboard/UI roles:

- `admin`
- `maintainer`
- `member`
- `viewer`

`owner` maps visually to `admin` for dashboard button access.

Design implication:

- Do not make role display look like a decorative badge only.
- Role should feel operational and consequential.
- Actions should visually communicate that permissions are scoped.

## Domain Models To Reflect In UI

The UI should use language aligned with the backend models.

### User

Represents an authenticated account.

Relevant fields:

- name
- email
- avatarUrl
- authProvider
- role
- isActive
- lastLoginAt
- lastLogoutAt

### Team

Represents a collaborative workspace.

Relevant fields:

- name
- description
- slug
- createdBy
- isArchived

### TeamMembership

Represents a user's role inside a team.

Relevant fields:

- team
- user
- role
- joinedAt
- invitedBy

### TeamInvitation

Represents an invitation to join a team.

Relevant fields:

- team
- email
- role
- status
- expiresAt
- acceptedAt

### Project

Represents team-scoped project work.

Relevant fields:

- team
- name
- description
- status
- createdBy
- updatedBy
- dueDate
- isDeleted

Project statuses:

- active
- on_hold
- completed
- archived

### Task

Represents project-scoped work.

Relevant fields:

- team
- project
- title
- description
- status
- priority
- assignedTo
- createdBy
- updatedBy
- dueDate
- completedAt
- isDeleted

Task statuses:

- todo
- in_progress
- blocked
- review
- done

Task priorities:

- low
- medium
- high
- urgent

### Comment

Represents task discussion.

Relevant fields:

- team
- project
- task
- content
- author
- editedAt
- isDeleted

### ActivityLog

Represents audit history.

Relevant actions:

- team.created
- team.joined
- team.member_invited
- team.member_role_updated
- project.created
- project.updated
- project.deleted
- task.created
- task.updated
- task.assigned
- task.deleted
- comment.created
- comment.updated
- comment.deleted

Design implication:

- Audit context should be present but not dominant.
- A small service notes or audit notes panel is useful.
- Avoid turning audit into fake analytics charts.

## Shared Action Form Design

Every action should use the same form language.

Recommended anatomy:

- Title: the action name.
- Description: one concise sentence explaining what the action does.
- Fields: plain form controls mapped to backend input.
- Error message: visible and clear.
- Success message: visible and calm.
- Submit action button.
- Service notes panel.

Create Project fields:

- Team ID
- Due date
- Project name
- Description

Create Task fields:

- Project ID
- Task title
- Description
- Status
- Priority
- Due date

Invite Members fields:

- Team ID
- Email
- Role

Assign Task fields:

- Task ID
- Assignee user ID

Change Roles fields:

- Team ID
- Member user ID
- New role

Comment fields:

- Task ID
- Comment

## Visual Direction

Recommended palette:

- Deep charcoal app background.
- Slate panels.
- Crisp white or near-white form fields.
- Blue primary action accents.
- Green success/service accents.
- Red only for destructive or error states.

Recommended components:

- Left navigation rail.
- Role context panel.
- Grouped action cards.
- Shared action form panel.
- Service notes side panel.
- Audit context micro-panel.

Typography:

- Clear, modern, functional.
- Strong headings.
- Muted labels.
- Readable form text.
- Avoid decorative or playful type.

Density:

- Information-rich but not crowded.
- Prefer grouped panels over dense tables.
- Avoid unnecessary cards inside cards.

## Copy Rules

Use backend-aligned copy.

Good:

- Create Project
- Assign Task
- Invite Member
- Change Role
- Service Notes
- Audit Context
- Required authorization
- Writes activity log

Avoid:

- Growth metrics
- Revenue dashboards
- Marketing claims
- AI assistant claims
- Fake analytics
- Fake real-time system health unless implemented

## Implementation Constraints For Design Tools

The design should be easy to recreate in EJS/CSS.

Prefer:

- CSS grid.
- Flexbox.
- Native form controls.
- Simple iconography.
- Shared panel classes.
- Reusable action form template.

Avoid:

- Heavy charts.
- Canvas-only layouts.
- Complex drag-and-drop.
- Deep nested modals.
- Microinteractions that require large frontend state machinery.

## High-Level Design Goal

The frontend should communicate:

```text
This is a secure, role-aware backend command console where each visible action maps to a real service and database workflow.
```

The design should make the architecture easier to understand, not hide it.

