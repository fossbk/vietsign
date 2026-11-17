# G4A/G4B: recording drafts and class review

This batch adds recording per target, local draft recovery, explicit replacement with retained clips, class assignments pinned to a content version, append-only teacher feedback and scoped resubmissions. It depends on the G1/M1 runtime, G2 games and G3 import tooling. It contains synthetic tests, not the B1–B10 source packages or their media. No content is imported or published by deploying this code.

## Scope and current limits

- A teacher (or administrator) assigns a validated G3A/G3B recording version for B1–B10 from `/grading/curriculum`. The API checks class ownership and pins a specific version. Students enter assignments through `/curriculum`.
- Class attempts remain preview attempts. Review verdicts do not create official scores, stars or completions. AI processing stays disabled; retain `CURRICULUM_AI_WORKER_ENABLED=false`.
- Self-study recordings retain the `waiting_D08` review state. This batch does not resolve D08, publish learning content, or implement the G4C sentence/dialogue groups and D07 alternatives.
- Saved recordings use IndexedDB on the same browser/device. Recovery across devices is available only for acknowledged uploads/answers, not unsent local blobs. Do not clear site storage when recovering a draft. Recording needs camera permission and HTTPS or localhost; there is no promise of recovery for an interrupted live capture.
- Starting a new attempt or finalizing is blocked while a saved local recording remains unsent. A lost answer response is retried with the same event ID, including when opening the canonical attempt URL. The existing G1 session keys remain supported.
- Teachers must still belong to the exact assigned class, and the learner must be active in it, to view submitted clips. Tickets expire after five minutes and permissions are checked again when streaming. Uploaded recordings remain in the private practice bucket; never make that bucket public.
- A changed review creates a new review row. Resubmission includes only targets currently marked for revision, preserves the original content version, and links to the original attempt. A later change to the requested targets prevents writing to a stale resubmission.

## M2 rollout procedure

Migration: `database/migrations/20261109_curriculum_m2.sql`. This commit does not execute it against an application database.

1. Confirm the intended database host/name, MySQL version and migration journal. Confirm M1 and both of its prerequisite migrations are applied (see `M1_SCHEMA_ROLLOUT.md`). Check the real `user`, `class_room`, `class_teacher` and `class_student` schema and ID types against the application's queries and foreign keys.
2. Record `SHOW CREATE TABLE` for existing curriculum/class/user tables and compare the four proposed tables with the actual schema. Produce a schema diff; M2 should add only `curriculum_class_practice`, `curriculum_attempt_class`, `curriculum_item_review` and `curriculum_resubmission` with their indexes, constraints and foreign keys.
3. Back up the target database and private recording storage; verify that the backup can be restored. Preserve a baseline of content version hashes and historical attempt/answer/progress rows. Coordinate writers while collecting a consistent baseline and applying DDL.
4. Apply the reviewed M2 SQL through the normal migration process, then record its checksum/result. MySQL DDL is not one atomic transaction across the four statements. `IF NOT EXISTS` permits replay only for a matching existing schema; it does not repair an incorrect or partial table. If interrupted, inspect the actual schema and prepare a new diff before continuing.
5. Compare `SHOW CREATE TABLE` and indexes for all four tables against M2. Confirm old versions, attempts, answers and results are unchanged. Deploy the matching backend/frontend together after M2 is available. The old recording path can run without M2, but class/review endpoints return 503 until all four tables exist.
6. On staging, use synthetic accounts and content to verify teacher assignment, student capture/upload/replace/finalize, exact-class video access, review, and a scoped resubmission. Check that no AI jobs, publication changes or official completions were created. Do not interpret a successful technical test as customer content approval.

For code rollback, stop new assignments/reviews and restore the prior compatible application release. Retain M2 tables and recording objects for history; do not drop them or reverse historical writes. Review any restore plan against newer writes before restoring a database backup.

## Reproducing checks

Use disposable MySQL and MinIO instances only. Backend tests create randomly named databases and remove them; the URL marker is a safety check, not an application database to reuse. Tests use the fixed credentials `g1testadmin` / `g1-fixture-only` for disposable MinIO. Set:

```text
CURRICULUM_TEST_DB_URL=mysql://<test-user>:<test-password>@127.0.0.1:<test-port>/curriculum_g1_test
CURRICULUM_TEST_MINIO_PORT=<disposable-minio-port>
CURRICULUM_M1_SCHEMA_TEST_URL=mysql://<test-user>:<test-password>@127.0.0.1:<test-port>/curriculum_m1_schema_test
```

From the repository root, with backend dependencies installed:

```text
node --test backend/tests/*.test.js
```

The G4A integration test exercises recording without M2; G4B applies M2 twice, checks preservation and concurrent review/resubmission behavior, SQL failures and video ACL revocation. Both use ten synthetic source configurations; workbook content is intentionally excluded.

From `frontend`, install dependencies and Playwright Chromium, then run:

```text
npx next build --webpack
npx tsc --noEmit
npm run test:curriculum:g4ab
```

The browser suite includes G1/G2 regression and G4A/G4B contracts with intercepted APIs and a fake camera on port 33131. It does not use local application accounts or verify production camera/device compatibility. Backend integration tests separately exercise real database/storage behavior. When backend dependencies are not resolvable from the frontend process, set `NODE_PATH` to the absolute backend `node_modules` directory for the G2 compiler fixtures.
