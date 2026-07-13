# Prisma Model Copy Notes

This folder is a Prisma/PostgreSQL-oriented copy of `backend/src/models`.

- Active runtime code still uses the original Mongoose models in `backend/src/models`.
- The JavaScript files here export Prisma model metadata instead of Mongoose schemas.
- `schema.prisma` is a draft Prisma schema mapping of the original MongoDB model family.
- `prisma.config.js` provides the Prisma 7 datasource URL configuration. It reads `DATABASE_URL` directly.
- `schema-linkage-audit.md` and `user-login-details.md` are copied reference reports and are not runtime Prisma modules.
## Local PostgreSQL With Docker

From the repository root:

```powershell
npm run postgres:up
```

The default local connection string is:

```text
postgresql://postgres:local_postgres_password@localhost:5432/rafc?schema=public
```

Copy `.env.example` into your local `.env` and change the password before using anything beyond local experiments.

Useful Prisma commands for this copied model family:

```powershell
npm run prisma:modelcopy:validate
npm run prisma:modelcopy:generate
npm run prisma:modelcopy:push
```