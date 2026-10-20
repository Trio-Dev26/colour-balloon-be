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
- Domains: `auth/` (JWT strategy, roles/admin-only guards), `catalog/` (fixed levels + categories), `curriculum/modules`, `curriculum/units`, `curriculum/lessons`, `curriculum/lesson-files` (`curriculum/shared/codes.ts` builds codes).
- `src/prisma/code-sequence.ts`: `nextCodeNumber(tx, scope)` gives never-reused code numbers; call it inside the insert's transaction.
- `src/app.setup.ts`: global ValidationPipe (whitelist + transform), cookies, CORS; shared by main.ts and e2e tests.
- Models: User, Role, Level, Category, Module (ModuleStatus enum), Unit, Lesson, LessonFile (LessonFileGroup enum), CodeSequence.
- Lesson files: presigned upload straight to storage; see "Frontend contract" below.
- Soft delete (PRD FR-CUR-012): modules, units and lessons have `deletedAt` (deleting a parent also marks its children); every read adds `NOT_DELETED` (`curriculum/shared/soft-delete.ts`) and deletes only set it. Module titles are unique among live rows only (partial indexes, `partialIndexes` preview feature).

## Frontend contract: lessons and lesson files
All routes are admin-only (auth cookies). Errors are Nest's `{ statusCode, message, error }`; `message` is a string, or a string array for body validation errors.

### Lessons (`src/curriculum/lessons`)
| Route | Body / query | Notes |
|---|---|---|
| `GET /admin/lessons` | `?unitId&moduleId&search&page&limit` (limit ≤ 100) | `{ items, total, page, limit }`; with `unitId`, items are in unlock order (`sequence`) |
| `GET /admin/lessons/:id` | | Includes `unit { id, code, sequence, titles, module { id, code, titles, status, level, category } }` for the detail chips |
| `POST /admin/lessons` | `{ unitId, titleEn, titleMy, descriptionEn, descriptionMy }` (descriptions = rich-text JSON) | Gets the next code (`L001`…) and goes last in the unit |
| `PATCH /admin/lessons/:id` | any create field | A new `unitId` moves it to the end of that unit: 409 unless both modules are Draft (D28) |
| `PATCH /admin/lessons/reorder` | `{ unitId, lessonIds }`, every lesson of the unit exactly once | 409 unless the module is Draft (D28) |
| `DELETE /admin/lessons/:id` | | 204; 409 unless the module is Draft (D18, until progress is tracked) |

Use `lesson.unit.module.status !== 'DRAFT'` to disable Move / Reorder / Delete. Editing text and adding lessons work in any status.

### Lesson files (`src/curriculum/lesson-files`)
Four groups per lesson (FR-FILE-001). Allowed types are checked against the file's real bytes (D19):

| `group` | Figma | Allowed |
|---|---|---|
| `STUDENT_VIEW` | Student materials, view | PDF, MP4/WebM video, audio, JPG/PNG/WebP |
| `STUDENT_DOWNLOAD` | Student materials, downloadable | PDF, audio, JPG/PNG/WebP (no video) |
| `TEACHER_VIEW` | Teacher guide, Teacher Materials | same as STUDENT_VIEW |
| `TEACHER_DOWNLOAD` | Teacher guide, Downloadable Resources | same as STUDENT_DOWNLOAD |

Max 200 MB per file. No Word or PowerPoint anywhere. The regexes live in `lesson-file.constants.ts`; mirror them on the client for instant feedback.

**Upload: 3 requests per file.** The file body never goes through the API or the dashboard's `/api` rewrite (that rewrite caps bodies at ~21 MB).
1. `POST /admin/lessons/:lessonId/files/upload-url`, body `{ group, fileName, contentType: file.type, size: file.size }`.
   - Returns **200** `{ uploadUrl, key, expiresIn: 900 }`.
   - Returns 400 if the type isn't allowed for the group or the size is over 200 MB. Nothing is saved yet.
2. `PUT uploadUrl` with the raw `File` as the body and header `Content-Type: <same contentType as step 1>`. Expect 200.
   - Use **plain `axios.put`** (or XHR), not the shared `axiosApi`:
     - the URL points at storage, not `/api`;
     - it must send no cookies;
     - it needs `timeout: 0`, because a 200 MB upload outlives a 60 s timeout.
   - `onUploadProgress` drives the progress bar.
   - A 403 here means the URL expired (it must *start* within 15 min), the Content-Type differs, or the URL was altered.
3. `POST /admin/lessons/:lessonId/files`, body `{ key, group, fileName, captionEn?, captionMy? }`.
   - Returns **201** with a `LessonFile`.
   - The API re-checks the stored object: the key belongs to this lesson, it was uploaded, it isn't empty, it's ≤ 200 MB, and its real type is allowed. On failure it deletes the object and returns 400 with the reason as `message` (show it as "Failed: …").
   - Returns 409 if the key is already registered.

**`LessonFile`** = `{ id, group, sequence, fileName, contentType, sizeBytes, captionEn, captionMy, url, lessonId, createdAt, updatedAt }`.
- `sequence` is the position inside its group, starting at 1.
- `contentType` is detected from the file's bytes. Pick the viewer from it: `video/*` → `<video>`, `audio/*` → `<audio>`, `image/*` → `<img>`, `application/pdf` → iframe or new tab.
- `url` is a signed preview link valid for **1 hour**. Don't store it; refetch the list.

**Other routes** (all under `/admin/lessons/:lessonId/files`):

| Route | Body | Result |
|---|---|---|
| `GET` | | All files, by group (STUDENT_VIEW, STUDENT_DOWNLOAD, TEACHER_VIEW, TEACHER_DOWNLOAD), then `sequence`; split them by `group` on the client |
| `PATCH /reorder` | `{ group, fileIds }`, every file of that group exactly once | 200 with the group's files in the new order; 400 on a mismatch |
| `PATCH /:fileId` | `{ captionEn?, captionMy? }`; `null` clears one | 200 `LessonFile` |
| `DELETE /:fileId` | | 204; removes the row and the stored object |

- Unknown lesson or file returns 404.
- Files can be changed in any module status (D28 allows editing files in Published modules).
- Tab badges: count the files whose `group` starts with `STUDENT` or `TEACHER`.

**Storage CORS:** the browser PUTs to `STORAGE_ENDPOINT` directly. MinIO allows any origin by default. Production R2/Spaces need a bucket CORS rule allowing `PUT` and the `Content-Type` header from the dashboard's origin.
