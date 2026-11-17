# G4C: grouped sentence and dialogue infrastructure

This batch adds ownership and role scopes for the four B1–B10 groups, source comparison, full-context recording/review screens and a draft-only group importer. It builds on G1/M1, G2, G3 and G4A/G4B/M2. The commit contains synthetic fixtures only. The workbook-derived alternatives, source files, images, local reports and application database are not part of this release.

## Behavior

- `/curriculum/groups` lists available groups. Teachers/admins can open group details and explicitly select a source alternative; no alternative is preselected. Raw source and editorial notes are restricted to the preview detail API. Learner attempt projections include the spoken context, without raw source, editorial notes or internal source-item IDs.
- Groups cover B1–B3, B4–B6, B7–B8 and B9–B10. C/F represents sentence alternatives; H/G and H/H represent dialogue alternatives. Group activities use separate ownership links and do not increase the word-activity totals in lesson cards.
- An assignment can include all turns or one existing speaker. The activity version and selected task IDs are pinned when assigning. Starting a class attempt checks the stored scope against that version; a missing or changed scope fails rather than expanding the assignment.
- Full dialogue context remains visible when recording or reviewing a single role and when resubmitting only requested targets. Recording storage, retries, feedback history and class permissions reuse G4A/G4B. The G1-compatible session recovery hook is unchanged in this batch.
- Missing speakers require an explicit blocked marker. Any blocked unit prevents assigning the alternative. The importer checks source/package/activity/group identity, ordered task-to-unit-to-item binding, separate contextual item IDs and the complete expected alternative set.
- D07 remains unresolved. All group alternatives and class attempts remain drafts/previews, with no official score, stars or completion. D08 self-study review remains deferred. Keep `CURRICULUM_AI_WORKER_ENABLED=false`.
- There are no verified full-sentence/dialogue samples in this batch. The initial importer accepts no playable media or asset references. Adding approved samples or changing the alternative set requires a separately reviewed content workflow. Camera capture limits remain the G4A trial defaults, not approved pedagogical durations.

## M3 deployment prerequisites

Migration: `database/migrations/20261109_curriculum_m3.sql`. It adds only:

1. `curriculum_learning_group`: source group identity and draft status.
2. `curriculum_group_activity`: ownership of a sentence/dialogue alternative.
3. `curriculum_group_practice_scope`: immutable assignment speaker/task scope.

Verify M1 and M2 first, including existing foreign-key types and collations. See `M1_SCHEMA_ROLLOUT.md` and `G4AB_CLASS_PRACTICE_ROLLOUT.md`. M3 is required before importing groups or assigning group practice. Existing G4A/G4B paths continue to work without M3; group list is empty and group detail returns 503 until it is available.

Before applying M3 to any application database:

1. Confirm target host/schema, migration journal and current schema. Compare `SHOW CREATE TABLE` with M3 and prepare the schema diff.
2. Back up the database and private recording storage, verify restoration, and capture baseline version hashes and historical rows. Coordinate writers for a consistent baseline.
3. Apply the reviewed SQL through the normal migration process and record its checksum/result. MySQL DDL is not atomic across all statements. `IF NOT EXISTS` does not repair an incorrectly shaped table: after a partial failure, inspect the schema and prepare a new diff before continuing.
4. Verify all three tables, keys and foreign keys, and confirm existing content/history is unchanged. Deploy matching backend/frontend code. Applying M3 alone does not create groups, assign work, import content or publish anything.
5. Exercise assignment, role-scoped recording, review and resubmission on staging with synthetic users and data. Check that no official completion, AI job or publication change was created.

## Import and rollback contract

`curriculumGroupImport.service.js` provides `validate(bundle)`, `groupState(connection)`, `plan(bundle, contentState, groupState)`, `apply(connection, bundle, reviewedPlan)` and `rollback(connection, report)`. The content state comes from the committed G3B `readState(connection)`. Use a dedicated database connection for mutations. There is no auto-run importer or production apply CLI in this commit.

The initial package is schema version 1, draft G4C, with four groups and 16 separately identified F/G/H alternatives. Every contextual item must bind to exactly one source unit. `validate` checks structure and provenance consistency, not customer approval or correctness of sign language.

For a future authorized import, validate the exact external package, capture state, generate the diff, review its checksum and back up the confirmed target before calling `apply`. Re-read the state if anything changes. The importer shares the `curriculum_content_import` advisory lock with G3, runs writes in a transaction, detects stale plans, preserves old content/groups/history and returns a checksummed report. Keep that report with the backup and migration journal. A checksum is an integrity check, not a signature or substitute for approval.

Rollback verifies the report and refuses content/group drift since import. When safe, it deactivates only newly inserted activities and archives their draft versions. It retains items, ownership/scope links, clips, attempts and reviews. It never restores an old dump over newer work or drops M3 tables. For a code rollback, stop new group assignments and retain the tables/data for historical access; an older frontend may not render the new full-context view.

## Verification

Use the disposable MySQL/MinIO environment and marker URLs documented in `G4AB_CLASS_PRACTICE_ROLLOUT.md`. Run from the repository root:

```text
node --test backend/tests/*.test.js
```

The new tests use synthetic G3/G4C source packages. They cover M3 replay, failed/parallel import, stale plans, alternatives/role validation, unchanged word-activity counts, missing or tampered assignment scope, retained context on resubmission, rollback drift checks and preserved history. Existing G1–G4B tests check compatibility without M3.

From `frontend`, after dependency and Playwright Chromium installation:

```text
npx next build --webpack
npx tsc --noEmit
npm run test:curriculum:g4c
```

The browser suite includes the committed G1/G2/G4AB regressions and intercepted-API group tests on port 33131, including a narrow viewport. It neither logs into the application database nor validates physical camera/device behavior. Set `NODE_PATH` to backend `node_modules` if needed by the compiler fixtures. No G5 progress/editor/performance features are included.
