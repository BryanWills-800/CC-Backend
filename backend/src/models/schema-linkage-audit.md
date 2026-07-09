# Models Schema Linkage Audit

## Overview
This audit maps the relational links between schemas in `backend/src/models`. The codebase uses Mongoose `ObjectId` references for most relationships, with a few polymorphic or token-style fields that are intentionally not fully joined to a single model.

## Relationship Map

### `User`
- Central identity model.
- Referenced by:
  - `Team.createdBy`
  - `Project.createdBy`
  - `Project.updatedBy`
  - `Task.createdBy`
  - `Task.updatedBy`
  - `Task.assignedTo[]`
  - `Comment.author`
  - `TeamMembership.user`
  - `TeamMembership.invitedBy`
  - `TeamInvitation.invitedBy`
  - `ActivityLog.actor`
  - `RefreshToken.user`
  - `Token.userId`

### `Team`
- Root container for workspaces.
- References `User` through `createdBy`.
- Is referenced by:
  - `Project.team`
  - `Task.team`
  - `Comment.team`
  - `TeamMembership.team`
  - `TeamInvitation.team`
  - `ActivityLog.team`

### `Project`
- Belongs to one `Team`.
- Created and optionally updated by `User`.
- Is referenced by:
  - `Task.project`
  - `Comment.project`

### `Task`
- Belongs to one `Team` and one `Project`.
- Created/updated by `User`.
- May be assigned to multiple `User` records through `assignedTo[]`.
- Is referenced by:
  - `Comment.task`

### `Comment`
- Belongs to one `Team`, one `Project`, one `Task`, and one `User` author.
- Functions as the leaf content model in the task discussion chain.

### `TeamMembership`
- Joins `Team` and `User`.
- Stores role membership for a user inside a team.
- Optional `invitedBy` also points to `User`.
- This is the clearest many-to-many bridge in the model set.

### `TeamInvitation`
- Joins `Team` and invitee email, with `invitedBy` pointing to `User`.
- The invitee is tracked by email rather than by `User` reference until the invitation is accepted.

### `ActivityLog`
- Tracks a `Team` plus an `actor` `User`.
- `entityType` and `entityId` form a polymorphic link:
  - `entityType` can be `team`, `project`, `task`, `comment`, or `user`
  - `entityId` is a generic `ObjectId` and does not declare a Mongoose `ref`
- This is intentionally flexible, but it is not a hard relational join.

### `RefreshToken`
- Points to one `User`.
- Token data is stored by hash, with revocation and expiry metadata.

### `Token`
- Also points to one `User`, via `userId`.
- Represents a separate token store from `RefreshToken`.
- This schema overlaps conceptually with `RefreshToken`, but it is a distinct persistence shape.

## Order of Creation
To avoid bootstrap crashes or missing-reference failures, the safest creation order is:

1. `User`
2. `Team`
3. `TeamMembership`
4. `TeamInvitation`
5. `Project`
6. `Task`
7. `Comment`
8. `ActivityLog`
9. `RefreshToken`
10. `Token`

This order follows the dependency graph from the least dependent root records to the more nested records:
- `User` must exist before any ownership, author, actor, inviter, or token linkage can be stored.
- `Team` must exist before memberships, invitations, projects, tasks, comments, or logs can attach to it.
- `TeamMembership` and `TeamInvitation` sit before project/task/comment activity because they establish access and onboarding for the team.
- `Project` should exist before `Task`, and `Task` should exist before `Comment`.
- `ActivityLog` is best written after the primary entity exists, because it captures the created or changed record through `entityType` and `entityId`.

## Consistency Notes

- The model set is generally consistent about naming foreign keys after the target relation (`team`, `project`, `user`, `createdBy`, `updatedBy`, `invitedBy`).
- `Token.userId` is the main naming outlier. Most other user links use `user`, `createdBy`, or `actor`, so this field is semantically clear but stylistically different.
- `ActivityLog.entityId` is a polymorphic pointer, so it cannot be populated like the other direct references without additional application logic.
- `TeamMembership` is the most important join table in the schema set because it bridges team access and role assignment.
- `TeamInvitation` is partially relational: it links to a team and inviter, but the invitee is email-based until acceptance.

## Summary
- Strong direct relationships: `Team`, `Project`, `Task`, `Comment`, and `TeamMembership` form the core graph.
- User is the hub entity across nearly every schema.
- The only deliberately loose relationship is `ActivityLog.entityId`, which is generic by design.
- The only notable naming inconsistency is `Token.userId` versus the otherwise more common `user` naming pattern.

