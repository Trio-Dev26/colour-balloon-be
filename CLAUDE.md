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
- Domains: `auth/` (JWT strategy, roles/admin-only guards), `catalog/` (fixed levels + categories), `curriculum/modules`, `curriculum/units`, `curriculum/lessons`, `curriculum/lesson-files`, `curriculum/questions`, `curriculum/quizzes` (`curriculum/shared/codes.ts` builds codes).
- `src/prisma/code-sequence.ts`: `nextCodeNumber(tx, scope)` gives never-reused code numbers; call it inside the insert's transaction.
- `src/app.setup.ts`: global ValidationPipe (whitelist + transform), cookies, CORS; shared by main.ts and e2e tests.
- Models: User, Role, Level, Category, Module (ModuleStatus enum), Unit, Lesson, LessonFile (LessonFileGroup enum), Question (QuestionType enum), QuestionMedia, Quiz (QuizType enum), QuizQuestion, CodeSequence.
- Lesson files: presigned upload straight to storage; see "Frontend contract" below.
- Soft delete (PRD FR-CUR-012): modules, units, lessons, questions and quizzes have `deletedAt` (deleting a parent also marks its children); every read adds `NOT_DELETED` (`curriculum/shared/soft-delete.ts`) and deletes only set it. Module titles are unique among live rows only (partial indexes, `partialIndexes` preview feature).

## Frontend contract: lessons, lesson files, questions and quizzes
All routes are admin-only (auth cookies). Errors are Nest's `{ statusCode, message, error }`; `message` is a string, or a string array for body validation errors.

### Lessons (`src/curriculum/lessons`)
| Route | Body / query | Notes |
|---|---|---|
| `GET /admin/lessons` | `?unitId&moduleId&search&page&limit` (limit ≤ 100) | `{ items, total, page, limit }`; with `unitId`, items are in unlock order (`sequence`) |
| `GET /admin/lessons/:id` | | Includes `unit { id, code, sequence, titles, module { id, code, titles, status, level, category } }` for the detail chips |
| `POST /admin/lessons` | `{ unitId, titleEn, titleMy, descriptionEn, descriptionMy }` (descriptions = rich-text JSON) | Gets the next code (`L001`…) and goes last in the unit |
| `PATCH /admin/lessons/:id` | any create field | A new `unitId` moves it to the end of that unit: 409 unless both modules are Draft (D28) |
| `PATCH /admin/lessons/reorder` | `{ unitId, lessonIds }`, every lesson of the unit exactly once | 409 unless the module is Draft (D28) |
| `DELETE /admin/lessons/:id` | | 204 in any module status (D18; the "no student started it" check comes with progress tracking) |

Every lesson response also has `fileCounts: { student, teacher }`: its files whose `group` starts with `STUDENT` / `TEACHER` (the lesson tables' file columns).

Use `lesson.unit.module.status !== 'DRAFT'` to disable Move / Reorder. Editing, adding and deleting work in any status (units too).

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

### Questions (`src/curriculum/questions`)
Single language. Every question belongs to one unit for good (D16, D28). Code `QN001`….

| Route | Body / query | Notes |
|---|---|---|
| `GET /admin/questions` | `?moduleId&unitId&type&search&page&limit` | `{ items, total, page, limit }`; search matches the code and `promptText`; no `media` in list items |
| `GET /admin/questions/:id` | | Adds `media: [{ id, contentType, url }]` (signed, 1 h): every image the prompt and answers use, looked up by id |
| `POST /admin/questions/media` | multipart `file` (JPG/PNG ≤ 20 MB, checked by bytes) | 201 `{ id, contentType, sizeBytes, url }`. Upload while the form is open; the image belongs to no question until one is saved with its id |
| `POST /admin/questions` | `{ unitId, type, prompt, promptMediaIds?, answers, explanation?, points }` | `prompt`/`explanation` = TipTap JSON; `points` 1–100; at most 5 prompt images |
| `PATCH /admin/questions/:id` | any create field except `unitId` | A new `type` needs `answers` of that type. Images left out of the new prompt/answers are deleted |
| `DELETE /admin/questions/:id` | | 204; **409** while it is in any quiz (D18), message lists the quiz codes |

`answers` per `type` (Decision Log D22, D23). Every option, side and step needs `text` and/or `mediaId` (an id from `POST /admin/questions/media`):

| `type` | `answers` | Rules |
|---|---|---|
| `MULTIPLE_CHOICE` | `{ options: [{ id?, text?, mediaId?, correct }] }` | 2–20 options, exactly one `correct: true` |
| `TRUE_FALSE` | `{ correct: true \| false }` | |
| `FILL_BLANK` | `{ blanks: [{ accepted: ["ကာ", …] }] }` | Type `___` in the prompt for each blank; one entry per blank, 1–20 accepted answers each. Text only |
| `MATCHING` | `{ pairs: [{ id?, left: { text?, mediaId? }, right: { text?, mediaId? } }] }` | 2–20 pairs; students see the right side shuffled |
| `SEQUENCE` | `{ steps: [{ id?, text?, mediaId? }] }` | 2–20 steps in the correct order |

- Options, pairs and steps get an `id` when saved. Send it back when editing so it stays the same (attempts will refer to it).
- A 400 lists every problem at once in `message` (e.g. `answers.options[1] needs text or an image`).
- `promptText` is the prompt as plain text; use it for lists and search.
- Response: `{ id, code, type, prompt, promptText, promptMediaIds, answers, explanation, points, unitId, unit { id, code, titles, module { id, code, titles, status } }, quizzes: [{ id, code }], media?, createdAt, updatedAt }`. Disable Delete while `quizzes` isn't empty.

### Quizzes (`src/curriculum/quizzes`)
Code `QZ001`…. Two types (D16, D20):

| | `UNIT_QUIZ` | `CHAPTER_END_TEST` |
|---|---|---|
| Create with | `unitId` (module implied) | `moduleId`, no `unitId` |
| How many | any per unit | one per module: a second returns **409** |
| `required` | `true` (default) or `false`; Required ones block unit completion (D5) | always `true`; `false` returns 400 |
| Questions from | its unit only | any unit of its module |

| Route | Body / query | Notes |
|---|---|---|
| `GET /admin/quizzes` | `?moduleId&unitId&type&search&page&limit` | Unit quizzes first (by unit order), then the Chapter End Test |
| `GET /admin/quizzes/:id` | | |
| `POST /admin/quizzes` | `{ type, unitId?, moduleId?, required?, passPercent, titleEn, titleMy, descriptionEn?, descriptionMy? }` | `passPercent` 1–100; descriptions optional TipTap JSON. Starts with no questions |
| `PATCH /admin/quizzes/:id` | titles, descriptions, `passPercent`, `required` | Type, module and unit never change (D28) |
| `PUT /admin/quizzes/:id/questions` | `{ questionIds }`, the **whole ordered list**, each once | Add, remove and reorder all save this list. 400 for unknown questions or ones outside the unit/module |
| `DELETE /admin/quizzes/:id` | | 204 in any status (D18; the "no attempts" check comes with attempts) |

Response: `{ id, code, type, moduleId, module { id, code, titles, status }, unitId, unit | null, required, passPercent, titleEn, titleMy, descriptionEn, descriptionMy, questionCount, totalPoints, questions: [{ id, code, type, promptText, points, sequence }], createdAt, updatedAt }`.
- `totalPoints` is always the sum of the question points (D21); show it live, never as an input. Pass = score ≥ `passPercent`% of it.
- Attempts are not stored (D24: unit quiz unlimited, Chapter End Test 3 per 24 h).
- Deleting a question or unit drops its questions from quizzes and totals. Moving a unit (Draft only) takes its unit quizzes along and removes its questions from the old module's Chapter End Test (D28).
