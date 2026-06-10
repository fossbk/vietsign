# VietSign Codebase Notes

Last read: 2026-06-09

Purpose: quick map for future tasks so we do not need to re-scan the whole repo.

## 1. Repo overview

This is a monorepo for VietSign/VietSignSchool.

- `frontend/`: Next.js App Router app, React 19, TypeScript, Ant Design, Tailwind, Redux Toolkit, React Query.
- `backend/`: Node.js CommonJS Express API, MySQL via `mysql2/promise`, JWT auth, MinIO uploads, Swagger docs.
- `database/`: MySQL schema/data dumps plus migrations.
- `k8s/`: Kubernetes manifests/configmaps/secrets.
- `docker-compose.yml`: local DB + backend + frontend + MinIO.
- root `package.json`: mainly Husky setup, not the app runner.

Important existing docs:

- `frontend/ARCHITECTURE.md`: large architecture proposal/current notes, but terminal output shows mojibake/encoding issues. Treat as a useful idea doc, not source of truth.
- `frontend/project-style-guide.md`, `frontend/role_access_rights.md`, `frontend/docs/*`.

## 2. Local run shape

Docker compose services:

- MySQL container `vietsign_db`: container port `3306`, host port `3308`, database `vietsignschool`.
- Backend container `vietsign_backend`: internal `PORT=5000`, exposed as `http://localhost:8080`.
- Frontend container `vietsign_frontend`: `http://localhost:3000`.
- MinIO: API `9000`, console `9001`, bucket default `vietsign`.

Frontend scripts:

- `cd frontend && npm run dev`: Next dev on `0.0.0.0:3000`.
- `cd frontend && npm run build`
- `cd frontend && npm run lint`

Backend scripts:

- `cd backend && npm run dev`: nodemon `src/index.js`.
- `cd backend && npm start`: node `src/index.js`.

No real test suite is configured yet. Both root and backend `npm test` are placeholder failing commands.

## 3. Backend entrypoint and routing

Backend entrypoint: `backend/src/index.js`.

Global middleware:

- `cors()` allows all origins.
- `express.json()` and `express.urlencoded()`.
- Swagger UI at `/api-docs`.

Mounted route prefixes:

- `/auth` -> `backend/src/routes/auth.routes.js`
- `/users` and `/user` -> `backend/src/routes/user.routes.js`
- `/organizations` -> `backend/src/routes/organization.routes.js`
- `/organization-managers` -> `backend/src/routes/organizationManager.routes.js`
- `/teaching-management` -> `backend/src/features/teaching-management/index.js`
- `/learn` -> `backend/src/features/learn`
- `/ai-practice` -> `backend/src/features/ai-practice/routes/aiPractice.routes.js`
- `/upload` -> `backend/src/routes/upload.routes.js`
- `/me` -> auth-protected current token payload

File serving/proxy routes:

- `/uploads/<objectKey>` streams local `backend/uploads` first, then MinIO object.
- `/upload/<bucket>/<objectKey>` legacy MinIO-style URL compatibility.
- `/<bucketName>/<objectKey>` legacy compatibility when public URL used backend domain.

## 4. Backend auth

Auth files:

- Routes: `backend/src/routes/auth.routes.js`
- Controller: `backend/src/controllers/auth.controller.js`
- Middleware: `backend/src/middleware/auth.middleware.js`

Endpoints:

- `POST /auth/login`
- `POST /auth/register`
- Protected requests need `Authorization: Bearer <jwt>`.

Current behavior/caveats:

- JWT payload currently includes `{ user_id, email }`.
- `JWT_SECRET` is required.
- Password comparison is currently plain text: `password === user.password`. `bcrypt` is imported but not used.
- Register currently inserts password as provided, not hashed.
- Auth middleware returns 401 on missing/invalid/expired token.

## 5. Backend database

DB connection: `backend/src/db.js`.

Env:

- `DB_HOST`
- `DB_PORT`, default `3307` in code, Docker uses `3306` inside container and exposes `3308`.
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`

Main schema file: `database/vietsignschool.sql`.

Important table groups:

- Users/auth/permissions: `user`, `role`, `permissions`, `role_permissions`, `user_permissions`, `password_reset_tokens`, `token`.
- Organizations: `organization`, `organization_manager`.
- Classes/study: `class_room`, `class_student`, `class_teacher`, `lesson`, `part`, `part_image`, `part_video`.
- Progress/views: `class_learning_progress`, `part_view`, `vocabulary_view`, `user_statistic`, `user_log`.
- Teaching content: `topic`, `vocabulary`, `vocabulary_image`, `vocabulary_video`, `question`, `answer`.
- Exams: `exam`, `question_exam_mapping`, `vocabulary_exam_mapping`, `video_exam_mapping`, `user_exam_mapping`, `question_exam_user_mapping`, `exam_attempt`.
- Learn/self-study: `learn_category`, `learn_item`, `learn_item_lesson`, `learn_item_vocabulary`, `user_learn_progress`, `user_vocabulary_progress`.
- Messaging/tools: `conversation`, `message`, `contact`, `friend_ship`, `group_member`, `tool`, `tool_chatbox_ai`, `tool_game`, `tool_notification`.
- AI practice migration/table: `database/migrations/20260325_add_ai_practice_attempt.sql` and runtime `CREATE TABLE IF NOT EXISTS ai_practice_attempt` in `aiPractice.service.js`.

## 6. Backend feature modules

Teaching management aggregator: `backend/src/features/teaching-management/index.js`.

Mounted under `/teaching-management`:

- `/classrooms` -> classroom CRUD, my classes, students in class.
- `/lessons` -> lesson CRUD/statistics/parts.
- `/vocabularies` -> vocabulary CRUD plus image/video handling.
- `/topics` -> topic CRUD/search/statistics/by classroom/by creator.
- `/questions` -> question CRUD/search/statistics/by classroom/by creator.
- `/exams` -> exam CRUD/statistics/type, submissions, results, review, mark practice.
- `/progress` -> progress/statistics endpoints.

Learn module:

- Mounted under `/learn`.
- Uses `learn_category`, `learn_item`, `learn_item_lesson`, `learn_item_vocabulary`, progress tables.
- Common endpoints include `/categories`, `/items`, `/items/:itemId`, `/items/:itemId/lessons`, `/lessons/:lessonId/steps`, `/progress`, `/topics`, `/search`.

AI practice:

- Routes: `backend/src/features/ai-practice/routes/aiPractice.routes.js`
- Controller: `backend/src/features/ai-practice/controllers/aiPractice.controller.js`
- Service: `backend/src/features/ai-practice/services/aiPractice.service.js`
- Endpoints:
  - `POST /ai-practice/predict`
  - `POST /ai-practice/predict-model3`
  - `GET /ai-practice/history`
- Multipart field is `file`; auth required.
- Allowed modes: `match`, `spell`, `free`.
- Allowed MIME types: jpeg, png, webp, mp4, webm, mov.
- Model env:
  - `AI_MODEL_BASE_URL`, default `https://vietsign.ibme.edu.vn/vsl-api`, endpoint `/predict`.
  - `AI_MODEL3_BASE_URL`, default `http://localhost:30081` in service, Docker compose overrides to remote m3 API by default.
  - `AI_MODEL_TIMEOUT_MS`, retry/count/delay, max file size.
- Model3 converts videos to mp4 using `backend/src/utils/videoConverter.js` before forwarding; ffmpeg availability may matter.

Uploads/MinIO:

- Upload route: `POST /upload`, field `file`, optional folder.
- Valid folders: `exam`, `question`, `avatar`, `Data_FSL`, `others`.
- Backend stores in MinIO and returns relative `/uploads/<folder>/<file>` path.
- Prefer saving relative paths in DB. Frontend normalizes only for display.

Organization scope:

- `backend/src/middleware/orgScope.middleware.js` uses recursive CTE to check child organizations.
- Global `SUPER_ADMIN`/`ADMIN` in `user.code` bypasses org scope.
- Organization managers with `SUPER_ADMIN` or `CENTER_ADMIN` role can access their org tree.

## 7. Frontend structure

Frontend root layout: `frontend/src/app/layout.tsx`.

Providers in root:

- `StoreProvider` from Redux
- `QueryProvider` from React Query
- `ThemeProvider`
- `Script src="/config.js"` loaded before interactive; runtime env can come from `frontend/public/config.js`.

Major route groups/files under `frontend/src/app`:

- Public/home: `/`, `/home`
- Auth: `/login`, `/register`, `/forgot-password`, `/reset-password` through `(auth)` group.
- Learning: `/learn`, `/learn/[id]`, `/learn/[id]/[lessonId]`, `/learn/[id]/[lessonId]/[stepId]`
- Study/classroom: `/study`, `/study/[id]`, `/study/[id]/[lessonId]`, `/study/[id]/[lessonId]/[stepId]`, `/study/[id]/exam/[examId]`
- Practice: `/practice`, `/practice/word`, `/practice/spelling`, `/practice/sentence`, `/practice/ai`
- Games: `/games`, `/games/[id]`
- Exams: `/take-exam`, `/take-exam/[id]`
- Dictionary/vocab: `/vocabularies`, `/vocabularies/[id]`
- User pages: `/messages`, `/notifications`, `/settings/*`, `/daily-signs`, `/tools`
- Management: `/dashboard`, `/users-management`, `/organizations-management`, `/classes-management`, `/learning-management`, `/dictionary-management`, `/questions-management`, `/exams-management`, `/games-management`, `/grading-management`, `/tools-management`, `/permissions-management`, `/statistics`.

Frontend source organization:

- `src/app`: Next routes. Many page files import feature components.
- `src/features`: feature UI modules (`auth`, `learn`, `study`, `practice`, `games`, `management/*`, etc.).
- `src/shared`: shared layout/components/hooks/utils/types.
- `src/core`: config, providers, Redux store, base API client, external setup.
- `src/domain`: TS domain entities/enums/interfaces.
- `src/data`: mock/static datasets still used by several services/features.
- `src/services`: API-facing services and mappers.
- `src/utils/handsigns`: handpose/fingerpose sign definitions A-Z.
- `public`: images, study assets, hand sign SVGs/webp, runtime `config.js`.

Path aliases in `frontend/tsconfig.json`:

- `@/*` -> `src/*`
- `@/features/*`, `@/shared/*`, `@/core/*`, `@/domain/*`, `@/data/*`, `@/services/*`

## 8. Frontend API client and env

API config: `frontend/src/core/config/api.ts`.

Runtime env lookup:

- Browser first: `window.ENV` from `/config.js`.
- Then `process.env`.

Base URLs:

- `API_BASE_URL = NEXT_PUBLIC_API_ROOT || "http://localhost:8080"`
- `API_BASE_URL_NODE = NEXT_PUBLIC_API_ROOT_NODE || "http://localhost:8080"`

HTTP client: `frontend/src/core/services/api/http.tsx`.

- Axios baseURL is `API_BASE_URL_NODE || API_BASE_URL`.
- Request interceptor adds `Authorization: Bearer <access_token>` from `localStorage`.
- 401 response (except login) dispatches Redux logout and redirects to `/`.
- Development bypass token `mock_token_bypass_api` suppresses redirect warning but still rejects.

Important mismatch/caveat:

- `API_ENDPOINTS.PERMISSION` currently points to `/api/...`, but backend entrypoint does not mount an `/api` router in the scanned code. Permission service may be mock, stale, or expecting another gateway.
- `API_ENDPOINTS.USER` uses `/user/...`; backend also mounts `/users`, same router.

## 9. Frontend state/auth

Redux store: `frontend/src/core/store/store.ts`.

- Single reducer currently: `admin`.
- `injectStore(store)` lets axios response interceptor dispatch logout.

Admin/auth slice: `frontend/src/core/store/slices/adminSlice.ts`.

- Reads `user` and `access_token` from localStorage.
- `login` stores user only; token storage is handled elsewhere by auth flow.
- `logout` removes `access_token`, `refresh_token`, `user`.

## 10. Frontend services of interest

Service folder: `frontend/src/services`.

Common services:

- `userService.ts`: user CRUD/mapping, imports static data helpers.
- `organizationService.ts`: organization CRUD/mapping.
- `classService.ts`: classroom/class management.
- `lessonService.ts`: lesson API mapping.
- `topicService.ts`: topic API mapping.
- `dictionaryService.ts`: vocabulary/dictionary API mapping and file URL normalization.
- `questionService.ts`: questions and media handling.
- `examService.ts`: exams/submissions/results mapping.
- `learnService.ts`: self-study `/learn` API.
- `aiPracticeService.ts`: calls `/ai-practice/predict` and `/ai-practice/predict-model3`.
- `uploadService.ts`: calls `/upload`; keeps saved DB paths relative and has `normalizeFileUrl` for rendering.
- `vietnamLocationsApi.ts`: external provinces API `https://provinces.open-api.vn/api/v2`.
- `notificationService.ts`, `mailService.ts`: still mock/TODO or backend-placeholder in places.

Upload path rule:

- `uploadFile()` should return relative path for DB.
- `normalizeFileUrl()` should be used only when rendering image/video URLs.

## 11. Frontend AI/sign practice

Practice UI:

- Main feature: `frontend/src/features/practice/components/*`.
- AI free practice page component: `AiPractice.tsx`.
- Shared hook logic likely in `frontend/src/features/practice/components/shared.tsx`.
- Hand drawing: `drawHand.ts`.
- Assets: `frontend/src/features/practice/assets/handimage`, duplicated under `frontend/public/handimage`.

AI service:

- `frontend/src/services/aiPracticeService.ts`.
- Sends multipart `file`; optional `mode`, `target_text`, `vocabulary_id`, `topic_id`.
- Model3 endpoint returns `top_k` with labels/probabilities.

Handsign definitions:

- `frontend/src/utils/handsigns/*Sign.ts` plus `index.ts`.
- Uses TensorFlow handpose/fingerpose packages from frontend dependencies.

## 12. Styling/UI conventions observed

Frontend uses a mix of:

- Tailwind utility classes.
- Ant Design components/icons.
- Lucide icons.
- Feature-local large page components.

Global styles:

- `frontend/src/app/globals.css`
- Tailwind config: `frontend/tailwind.config.js`

Some source comments/strings show mojibake in terminal. The app likely contains Vietnamese text encoded in a way that displays poorly through the current PowerShell output. Be careful when editing text-heavy Vietnamese files; preserve existing encoding and avoid unnecessary text rewrites.

## 13. Docker/k8s/deployment notes

Docker compose:

- Frontend Dockerfile local: `frontend/Dockerfile.local`.
- Backend Dockerfile: `backend/Dockerfile`.
- DB initialized from `./database:/docker-entrypoint-initdb.d` only on first volume creation.

k8s manifests:

- `k8s/frontend-configmap.yaml`, `backend-configmap.yaml`, `common-config.yaml`, `secret.yaml`.
- Deployment manifests for frontend/backend/mysql/minio.

Runtime frontend config:

- `frontend/public/config.js` defines `window.ENV` with API roots and Supabase values.
- This mirrors configmap style runtime config.

## 14. Risky/important implementation details

- Backend auth passwords are plain text right now. Do not silently switch to hashing unless task includes migration/backward compatibility.
- Most backend routes require `authRequired`; vocabulary list/detail routes may be public in route file.
- Backend has no `/api` prefix for main routes, despite some frontend constants mentioning `/api`.
- Uploads should be saved as relative `/uploads/...` paths; normalizing to absolute too early can create duplicated base paths.
- AI practice history table can be created at runtime by service, but migration file also exists.
- Model3 video preprocessing depends on ffmpeg behavior through `videoConverter.js`.
- Existing worktree may have generated/duplicated hand image assets in multiple places; avoid cleaning unless explicitly asked.
- There is no test safety net, so use focused lint/build/manual checks for touched areas.

## 15. Quick task lookup

Auth/login/register:

- Backend: `backend/src/controllers/auth.controller.js`, `backend/src/routes/auth.routes.js`, `backend/src/middleware/auth.middleware.js`
- Frontend: `frontend/src/features/auth/components/*`, `frontend/src/services/authServiceSupabase.ts`, `frontend/src/core/store/slices/adminSlice.ts`

API/base URL/token bugs:

- `frontend/src/core/config/api.ts`
- `frontend/src/core/services/api/http.tsx`
- `frontend/public/config.js`

Upload/media URL bugs:

- Backend: `backend/src/routes/upload.routes.js`, `backend/src/index.js`, `backend/src/utils/minio.js`
- Frontend: `frontend/src/services/uploadService.ts`

Class/lesson/topic/vocabulary/question/exam management:

- Backend routes/controllers/services under `backend/src/features/teaching-management`
- Frontend services under `frontend/src/services`
- Frontend UI under `frontend/src/features/management/*` and matching `frontend/src/app/*-management`

Self-study learn:

- Backend: `backend/src/features/learn`
- Frontend: `frontend/src/features/learn`, `frontend/src/services/learnService.ts`, routes under `frontend/src/app/learn`

Study classroom flow:

- Frontend: `frontend/src/features/study`, shared step components under `frontend/src/shared/components/common/step`
- Backend: teaching-management classrooms/lessons/progress/exams.

Practice/AI:

- Backend: `backend/src/features/ai-practice`, `backend/src/utils/videoConverter.js`
- Frontend: `frontend/src/features/practice`, `frontend/src/services/aiPracticeService.ts`, `frontend/src/utils/handsigns`

Database/schema:

- Main: `database/vietsignschool.sql`
- Clean dump: `database/vietsign_clean_from_volume.sql`
- Migrations: `database/migrations/*`

