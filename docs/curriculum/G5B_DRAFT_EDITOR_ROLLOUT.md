# G5B: draft editing, version diff and change history

This batch adds `/curriculum/editor` and its authenticated API for B1–B10 and the four C/H groups. It builds on G1–G5A and the M1/M2/M3 schema. It contains runtime code, M4, synthetic tests and this operational guide. Customer workbooks, content packages, images, local approval decisions and reports are separate. Deploying this code does not populate or publish any lesson.

## Editing and access

- Administrators and super administrators can save. Teachers can inspect, compare and preview. Students cannot access the editor API. The server reads the current role from the user table and rechecks it under a lock when saving; a role in browser storage or a token claim does not grant write access.
- The catalog links to the editor for staff. The list can filter activity level and search codes/titles. The detail page shows the current draft, historical versions, missing media, unresolved decisions and the change ledger.
- Titles, instructions and supported game parameters can be proposed in a draft. The editor protects source provenance, IDs, activity/task/round structure, canonical words/sentences/turns/speakers, decision lists and approval status. Game parameters still pass the runtime/import structural validator. Changes to answer keys or thresholds remain proposals and do not approve D05 or publish a score policy.
- Media binding selects existing assets for the slot's item and role, with a playable URL. It cannot register/upload assets, turn lookup links into playable media, change verification or approve an item. A label with multiple possible meanings is insufficient to bind a missing slot. Marking a slot missing does not delete the asset or change historical versions.
- Every candidate stays `draft` with `ai_enabled=false`. D07/D08 and all other unresolved decisions remain unchanged. `canPublish` is always false in this phase. Keep `CURRICULUM_AI_WORKER_ENABLED=false`.
- Preview uses the existing media/compound renderers. It can display full dialogue context and an explicit role, but does not create an assignment, attempt, recording or result. The unassigned student preview stays locked. It is a presentation preview, not a full game simulation or a physical camera test.

## Review, save and restore

```text
GET  /curriculum/editor
GET  /curriculum/editor/activities/:activityId?versionId=...
POST /curriculum/editor/activities/:activityId/review
POST /curriculum/editor/activities/:activityId/versions
```

Before saving, supply a reason and review the before/after diff. The review token expires after 20 minutes and binds the actor, activity, request, base version/hash, proposed content, diff and media context. Editing again invalidates the UI's review. Inputs are read-only during review/save, so the visible proposal cannot diverge from an in-flight request.

Saving locks and rechecks the current draft and media context, then inserts one version and one audit entry in a transaction. Failure to insert the ledger entry rolls back the new version. The ledger records the actor, reason, base/new/restored version IDs, hashes, diff and validation report. A repeated request from the same actor with the same normalized body returns the original result, including after a lost response. Reusing its ID for a different body returns 409.

If another editor changes the head, or media context changes after review, saving returns 409. The browser retains the unsaved proposal; explicitly reload and review a fresh diff. With a network error, retry the same save before reloading. There is no automatic merge or browser-persistent storage for unsaved editorial text; copy that text before leaving/reloading the page.

Restore also requires a reviewed reason/diff and inserts a new draft. It never edits or deletes the selected historical version. Legacy versions without a standardized v2 source package cannot be restored. All existing attempts, assignments, scoped dialogue roles, clips, feedback and results retain their pinned versions. A teacher's new assignment can use the new draft; existing assignments continue to use the old snapshot.

## M4 rollout

Migration: `database/migrations/20261109_curriculum_m4.sql`. No application database is changed by this commit or by the test suite.

1. Confirm the target host/database, MySQL version and migration journal. Verify the M1 prerequisites, M2 and M3 using their rollout guides. The editor joins the M3 group tables; it is not intended to run on a pre-M3 schema.
2. Record `SHOW CREATE TABLE` for the existing user and curriculum tables. Compare the proposed M4 table with the actual schema, including BIGINT foreign-key types, indexes, character sets and collations. The reviewed schema diff must add only `curriculum_editor_change`, with no content updates/deletes or changes to existing tables.
3. Back up the target database, verify restore capability, and record a consistent baseline of version hashes and attempt/class/review history. Coordinate writers while taking the baseline and applying the reviewed DDL.
4. Apply M4 through the normal migration process and record its SQL checksum/result. MySQL DDL cannot be treated as a rollback-safe content transaction. `IF NOT EXISTS` permits replay only when the existing table matches; it does not repair an incorrect table. Inspect any partial or unexpected state and prepare a fresh diff before continuing.
5. Compare `SHOW CREATE TABLE curriculum_editor_change`, indexes and foreign keys against M4, then verify that old content and history match the baseline. Deploy matching backend/frontend. Before M4 exists, the editor can read on an M3 schema, advertises migration required, and refuses save with 503.
6. In staging, verify admin save/retry/conflict/restore, teacher read-only access and student denial. Verify that an existing personal attempt and class assignment still open their original versions; a scoped dialogue keeps its original role. Confirm zero publication changes, AI jobs or official completions from editing or previewing.

Do not rerun G3/G4C source imports to overwrite editor revisions. Those import tools deliberately reject source drift; any content reconciliation needs a separate reviewed plan. The local preservation/checker scripts and customer source packages are not part of this release.

For code rollback, stop new editorial writes and return backend/frontend together to the previous compatible release. Keep M4 and every appended version/audit row. Do not delete ledger entries or rewrite versions to undo an edit; use a new reviewed draft. Review intervening writes before any database restore.

## Reproducing checks

Install backend/frontend dependencies and Playwright Chromium. Use disposable MySQL/MinIO only, following `G4AB_CLASS_PRACTICE_ROLLOUT.md`. The editor browser backend requires MySQL at loopback port **33129** and this marker URL:

```text
CURRICULUM_TEST_DB_URL=mysql://<test-user>:<test-password>@127.0.0.1:33129/curriculum_g1_test
CURRICULUM_TEST_MINIO_PORT=33130
CURRICULUM_M1_SCHEMA_TEST_URL=mysql://<test-user>:<test-password>@127.0.0.1:33129/curriculum_m1_schema_test
```

The two marker databases are test guards, not application database names. The tests create randomly named disposable databases. Set `NODE_PATH` to backend `node_modules` if using a detached checkout with shared dependencies.

From the repository root:

```text
node --test backend/tests/*.test.js
```

From `frontend`:

```text
npx next build --webpack
npx tsc --noEmit
npm run test:curriculum:g5b
```

The browser configuration starts the frontend on 33131 and an isolated real editor API on 33132, refusing to reuse existing servers. The helper seeds only committed synthetic G3/G4C/recording fixtures, emits temporary fixture credentials under `frontend/test-results`, and drops its random database on normal termination. After an interrupted run, remove the owned disposable test container, never an application container/database. G1–G5A regression scenarios intercept their APIs; G5B scenarios use the isolated real API/MySQL and test lost responses, conflicts, permissions, restore, media validation and a narrow viewport. They do not validate a physical phone/camera or customer content.

G5C performance measurements, full operational acceptance and production deployment remain separate work.
