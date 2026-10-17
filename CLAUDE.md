# colour-balloon-be

NestJS 11 API for the Colour Balloons LMS. Prisma 7 + PostgreSQL 16 (docker), JWT auth with httpOnly cookies, Swagger.

## Run
- DB + pgAdmin: `docker compose up -d` (Postgres :5432, pgAdmin :5050). Env: copy `.env.example` → `.env`.
- API: `npm run start:dev` (PORT=3001; CORS_ORIGIN lists the frontends).
- Checks: `npm run lint:check`, `npm test`, `npm run test:e2e`, `npm run build`.

## Prisma (config file is `prisma7.config.ts`, not the default name)
Every Prisma CLI command needs `--config prisma7.config.ts`:
- Apply migrations: `npx prisma migrate deploy --config prisma7.config.ts`
- New migration: `npx prisma migrate dev --name <name> --config prisma7.config.ts`
- Seed (admin user + roles): `npx prisma db seed --config prisma7.config.ts` (builds, then runs `dist/prisma/seed.js`). Prisma 7 never seeds automatically after reset.
- Client generates into `generated/prisma/` (import from `generated/prisma/client`).
- Levels and categories are NOT in seed.ts: `src/catalog/catalog.seeder.ts` upserts them from `catalog.data.ts` on app boot.

## Layout
- `src/<domain>/`: `*.controller.ts` → `*.service.ts` → `*.repository.ts` (only repositories touch Prisma), `dto/`, `*.constants.ts`.
- Domains: `auth/` (JWT strategy, roles/admin-only guards), `catalog/` (fixed levels + categories), `curriculum/modules`, `curriculum/units` (`curriculum/shared/codes.ts` builds codes).
- `src/prisma/code-sequence.ts`: `nextCodeNumber(tx, scope)` gives never-reused code numbers; call it inside the insert's transaction.
- `src/app.setup.ts`: global ValidationPipe (whitelist + transform), cookies, CORS; shared by main.ts and e2e tests.
- Models: User, Role, Level, Category, Module (ModuleStatus enum), Unit, CodeSequence.
- Soft delete (PRD FR-CUR-012): modules and units have `deletedAt`; every read adds `NOT_DELETED` (`curriculum/shared/soft-delete.ts`) and deletes only set it. Module titles are unique among live rows only (partial indexes, `partialIndexes` preview feature).
