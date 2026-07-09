# Iteration 1 Auth Flow Changes

## Intent

This change makes the Iteration 1 identity flow testable and closer to the July 4 Notion backend specification. The relevant spec requirements are `AUTH-01` signup/login/logout, `AUTH-02` secure password hashing and protected authentication behavior, and `AUTH-03` a selected JWT or session authentication strategy.

The project already used JWTs stored in an HTTP-only cookie, so the implementation keeps that existing pattern instead of introducing sessions, refresh tokens, OAuth, or a new architecture layer.

## Files Changed

- `src/controllers/authController.js`
- `src/routes/authRoutes.js`
- `src/routes/uiRoutes.js`
- `src/views/main.ejs`
- `src/tests/auth.test.js`
- `package.json`
- `package-lock.json`
- `.gitignore`
- `auth-flow-notes/auth-flow-changes.md`

## Auth Cookie Changes

The login cookie previously used `secure: true` all the time. That is secure for HTTPS production, but browsers do not store Secure cookies over plain `http://localhost`, so local login could redirect to `/main` without the browser keeping the token.

A shared cookie option helper was added:

- `httpOnly: true` keeps browser JavaScript from reading the JWT.
- `sameSite: "strict"` reduces cross-site request risk for this simple server-rendered flow.
- `path: "/"` makes the cookie available to protected routes and makes clearing it reliable.
- `secure: process.env.NODE_ENV === "production"` keeps production HTTPS cookies secure while allowing localhost testing.
- Login adds `maxAge: 3600000`, matching the one-hour JWT expiry.

The same base options are now used for `res.cookie("token", ...)` and `res.clearCookie("token", ...)`, because clearing a cookie is most reliable when path and security options match how the cookie was created.

## Logout Changes

Logout previously depended on a valid token and returned an error when no token was present. That made the UI flow brittle, because a user with an expired, missing, or stale cookie could not reliably clear their auth state.

The new logout behavior is:

1. Read `req.cookies.token` when available.
2. If the token is valid, update the user with `isActive: false` and `lastLogoutAt`.
3. If the token is missing or invalid, do not block logout.
4. Always clear the cookie.
5. Redirect to `/login`.

This makes logout idempotent from a user-experience point of view: pressing logout should safely end the local auth state even if the server can no longer verify the JWT.

## Update And Delete User Changes

Update and delete previously accepted `userId` from the request body. That is unsafe because a caller could try to submit another user's ID.

Both handlers now derive `userId` from `req.user`, which is populated by `verifyToken` after validating the JWT. This keeps the mutation tied to the authenticated user instead of trusting client input.

Update still requires the current password before changing profile fields or password. Delete still requires the current password before deleting the authenticated user. Delete also clears the auth cookie and redirects to `/login`.

## Route Changes

`src/routes/authRoutes.js` now protects update and delete with `verifyToken`:

- `PATCH /api/auth/update`
- `POST /api/auth/update`
- `DELETE /api/auth/delete`
- `POST /api/auth/delete`

The POST aliases were added because plain HTML forms cannot submit PATCH or DELETE without extra client-side code or method override middleware. This keeps the app simple and aligned with its existing Express/EJS style.

`POST /api/auth/logout` remains the real logout endpoint.

## UI Route Changes

`src/routes/uiRoutes.js` previously tried to render `logout`, `update`, and `delete` pages, but the matching `src/views/logout.ejs`, `src/views/update.ejs`, and `src/views/delete.ejs` files do not exist. Those routes would fail at runtime.

The broken renders were replaced with redirects:

- `GET /logout` redirects to `/login`.
- `GET /update` redirects to `/main`.
- `GET /delete` redirects to `/main`.

This avoids adding new views and keeps the file count low.

## Main Page UI Change

`src/views/main.ejs` now includes a small logout form:

- form method: `POST`
- form action: `/api/auth/logout`

This makes logout testable from the rendered app without adding JavaScript or a new frontend pattern.

## Node.js Module And Design Choices

The implementation uses existing modules already present in the app:

- `express` for routing and handlers.
- `cookie-parser` so route handlers and middleware can read `req.cookies.token`.
- `jsonwebtoken` for signing and verifying JWT auth tokens.
- `bcryptjs` for password comparison and hashing.
- `mongoose` models for user persistence.
- `ejs` and `express-ejs-layouts` for server-rendered views.

The new test dependencies are development-only:

- `jest` provides the test runner, assertions, and module mocking.
- `supertest` exercises Express routes without starting a real HTTP server.

The tests mock the User model and bcrypt behavior. That avoids a real MongoDB dependency and keeps the auth tests focused on controller and route behavior, which is the goal of this Iteration 1 fix.

## Test Coverage Added

`src/tests/auth.test.js` covers:

- localhost login cookie does not include `Secure`.
- production login cookie includes `Secure`.
- logout clears the cookie and redirects when there is no token.
- logout clears stale/invalid token state without failing.
- valid logout updates `isActive` and `lastLogoutAt`.
- update uses JWT user ID and ignores body `userId`.
- update validates the current password.
- delete uses JWT user ID, validates the current password, deletes the user, clears the cookie, and redirects.
- POST aliases for update/delete work through the route layer.

## Things Intentionally Not Changed

- No new auth architecture was introduced.
- No refresh-token flow was added.
- No OAuth flow was added.
- No new update/delete EJS views were added because the request was to keep files minimal.
- No team/RBAC feature work was included because this is scoped to making Iteration 1 auth testable.

## Reasoning

This is the smallest useful fix because it repairs the actual blockers in the current code:

1. localhost could not keep the login cookie because `secure: true` was unconditional.
2. logout could fail instead of clearing auth state.
3. update/delete trusted a body `userId` instead of the authenticated token identity.
4. missing EJS views made some UI routes broken.
5. no test framework existed to prove the auth behavior.

The result keeps the current CommonJS Express structure, uses the existing JWT-cookie strategy, and adds targeted tests without requiring a live database.
## Debug Update: Why Signup And Auth Were Failing

After testing the live app on `http://localhost:4000`, two separate problems were found.

### 1. Local auth cookie was using production behavior

`.env` had:

```env
NODE_ENV=production
```

Because the auth cookie helper uses `secure: process.env.NODE_ENV === "production"`, local login responses were setting a `Secure` cookie on plain HTTP. Browsers do not store `Secure` cookies from `http://localhost`, so login could redirect to `/main` while the browser still had no usable token.

Local `.env` is now set to:

```env
NODE_ENV=development
```

Production should still use `NODE_ENV=production` behind HTTPS.

### 2. MongoDB had a stale unique `username_1` index

The current `User` model uses `name` and `email`, but the local `RBAC.users` collection still had an old unique index:

```js
{ key: { username: 1 }, name: "username_1", unique: true }
```

Since new users no longer have a `username` field, MongoDB treated every new signup as `username: null`. The first insert could succeed, but later inserts failed with:

```text
E11000 duplicate key error collection: RBAC.users index: username_1 dup key: { username: null }
```

The stale index was dropped from the local database. `src/config/dbConnect.js` now also checks for and drops that specific obsolete index on startup, while preserving the real unique `email_1` index.

### Verification After Fix

- Signup now returns `302 Found` with `Location: /login`.
- MongoDB `RBAC.users` count increased after signup.
- Login now returns `302 Found` with `Location: /main`.
- Local login cookie includes `HttpOnly` and `SameSite=Strict` but does not include `Secure`.
- `npm test` passes: 1 suite, 8 tests.

## Additional Test Coverage Added

More tests were added after the signup/index issue was found, so the suite now covers the behavior that failed in practice.

### Signup tests

- Successful signup hashes the password, saves the user, and redirects to `/login`.
- Duplicate name or email returns `409` and does not save another user.
- Mongo duplicate-key errors with code `11000` are mapped to `409` instead of leaking as a generic `500`.

### Route protection tests

- Update rejects a missing auth token before controller/database lookup.
- Delete rejects an invalid auth token before controller/database lookup.

### Database cleanup tests

- Startup cleanup drops only the stale `username_1` index when it exists.
- Startup cleanup does nothing when only valid indexes remain.

### Current test result

```text
Test Suites: 2 passed, 2 total
Tests:       15 passed, 15 total
```
