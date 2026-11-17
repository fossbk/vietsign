# G5A: resume, learning progress and catalog memory

This batch adds a read model for B1–B10 and the four C/H groups, a resume panel, per-assignment/lesson/group progress, and browser catalog memory. It builds on the committed G1–G4C runtime. It requires no new migration, content import or rewrite of existing history. No customer source packages, media, local reports, editor or publication workflow are included.

## Behavior

- Resume prioritizes class revision requests, open resubmissions, in-progress class work and new class assignments, before unfinished personal work. Superseded resubmission branches are not recommended. A later independent trial does not hide an older actionable revision request.
- Links open the exact saved attempt/version. Class assignment versions and speaker/task scopes remain pinned. A personal activity with a newer draft retains the existing attempt until the learner explicitly starts a new version.
- With no browser attempt state, the activity/class entry first queries the server for an existing attempt. The GET does not create an attempt. An explicitly opened attempt URL never starts a replacement.
- In-flight answers/finalizations retain the G1-compatible session keys and canonical attempt state from G4AB. Resume does not switch away from pending work. A locally saved unsent recording also keeps the original attempt, even when the server recommends another class branch.
- The catalog lists unsent recording drafts found in IndexedDB, including after session keys are cleared. Each candidate is checked through the owner-only attempt API before a link is shown. Other users' drafts stay inaccessible. Local blobs remain device/browser-specific and are never copied into sessionStorage or another attempt.
- Progress distinguishes not started, in progress, ready to submit, viewed, submitted, pending review, needs revision, reviewed, completed and draft practice. Counts use the actual snapshot, including a single assigned role or a one-target resubmission. Next-target hints do not expose labels for scored questions.
- Activity/group totals count unique activities/alternatives, rather than attempts, classes, roles or resubmissions. A source set with 68 word activities and 16 group alternatives has 84 distinct entries. D07 alternatives are not a list of officially required completions.
- Official completion reads only server results for the current published version after readiness checks. Old-version, legacy-unverified and preview results cannot complete a new version. A completed published viewing activity still displays “Đã xem”; it is not evidence of assessed sign-language skill and creates no skill score/stars.
- Catalog filters, explicitly open/closed lessons and scroll positions are stored per account and per filter in the current tab. New or invalid memory starts with no lesson expanded. Corrupt or denied catalog storage falls back to defaults without blocking navigation.

## API and preservation

All routes require authentication and derive ownership from the authenticated user:

```text
GET /curriculum/learning-overview
GET /curriculum/activities/:activityId/current-attempt
GET /curriculum/class-practices/:practiceId/current-attempt
```

The activity endpoint returns the selected existing attempt or null. The class endpoint additionally checks that the user is a student with access to that assignment. Foreign owner IDs in query parameters do not alter the result. A teacher's personal overview does not treat students' work as the teacher's progress.

Reads aggregate existing M1 attempts/events, M2 class assignments/reviews/resubmission links, and M3 group scopes. They do not rebuild or insert summaries or update versions/results. When M2/M3 are absent, the corresponding class/group data is omitted; use the full G4C prerequisites for the complete experience.

No D07/D08 decisions are resolved. Class reviews remain draft judgments; self-study recordings remain pending D08 assignment. Keep `CURRICULUM_AI_WORKER_ENABLED=false`. No content is published by enabling this UI.

## Rollout

Deploy matching backend/frontend from this commit after verifying the G1–G4C prerequisites. There is no G5A SQL or import to run. Follow the separate M1/M2/M3 rollout guides if those schema changes have not already been applied; any such database change still requires target verification, reviewed diff and backup.

Before release, use staging accounts to verify an unfinished personal activity, an assigned role, a revision request, a local recording draft, a version update and returning to the catalog. Inspect response times with representative history sizes. This phase reads historical attempts/events and computes projections; performance work and operational measurements belong to a later batch, so no production latency guarantee is inferred from fixture tests.

For code rollback, roll backend/frontend back together. Retain browser draft storage and all database history. The existing G1 session keys remain readable by the G4AB/G4C hook; new catalog keys can be ignored by older code. Do not delete recordings or reset attempts to undo the UI change.

## Reproducing checks

Use disposable MySQL/MinIO and the marker URLs in `G4AB_CLASS_PRACTICE_ROLLOUT.md`. From the repository root:

```text
node --test backend/tests/*.test.js
```

G5A integration fixtures reuse the committed synthetic G3/G4C packages. They verify owner isolation, unchanged versions and history including M2/M3 rows during repeated reads, class priority, current resubmission selection, correct scoped denominators and current-version completion. Published content in these tests is synthetic and isolated from the application database.

From `frontend`, with dependencies and Playwright Chromium installed:

```text
npx next build --webpack
npx tsc --noEmit
npm run test:curriculum:g5a
```

The browser suite includes G1/G2/G4AB/G4C regression and G5A tests using intercepted APIs, IndexedDB and a fake camera on port 33131. Existing mocks provide the new read-only overview/current-attempt contracts. The suite does not log into application accounts or validate physical cameras/mobile devices. Set `NODE_PATH` to backend `node_modules` if the compiler fixtures require it.

G5B draft editing, G5C performance/operations and production deployment remain separate work.
