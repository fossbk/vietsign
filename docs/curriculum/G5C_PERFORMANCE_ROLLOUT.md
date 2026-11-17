# G5C: scoped lesson reads and acceptance

This batch builds on G1–G5B. It scopes lesson-detail reads to the requested lesson and prevents duplicate in-flight detail requests in the catalog. It adds isolated regression/acceptance tests and the [operations guide](G5C_OPERATIONS.md). It adds no migration, import, publication, official AI scoring or deployment action. Customer data, media, approval decisions, backups and local measurement reports remain outside the commit.

## Behavior and preservation

Previously, lesson detail computed all lessons and all word activity states, found the requested lesson, then queried that lesson's states again. It now filters by lesson code in SQL, reads that lesson's states once and uses the same states for counts and activities. Empty/unknown codes return null, and the HTTP controller continues to return 404. The response shape stays unchanged.

Role checks, content checksums, current published-version summaries and asset readiness still run per request. No shared result cache is introduced. Students still receive no draft-version IDs or preview permission. Role or media-approval changes take effect on the next read. Group activities remain excluded from word-lesson counts. A published viewing completion remains “viewed”, with no skill score or stars.

The frontend tracks pending requests per lesson in the mounted catalog instance. Closing/reopening the same lesson shares the pending request; another lesson can load independently. Both success and failure release the guard. Errors retain an explicit retry action. Remounting starts a fresh request. This does not alter G5A's per-account catalog memory or pinned attempts, and does not make a global/account-shared cache.

## Measured evidence

Measurement date: 17 November 2026. Disposable MySQL 8, synthetic fixtures with ten lessons, 68 word activities, 16 C/H alternatives and class/review/editor history. One warm-up per method, then 20 pairs with alternating old/new execution order. The reference is G5B's all-lesson projection followed by a per-lesson state read. Catalog and learning overview are unchanged controls. Timings measure service calls; they exclude HTTP, browser rendering, camera capture and cold compilation. The backend suite was running on the same machine, so timings are observations, not release thresholds.

| Case | Queries before → after | Returned rows before → after | Median ms before → after | p95 ms before → after |
|---|---:|---:|---:|---:|
| B1 detail, admin | 5 → 3 | 86 → 8 | 4.34 → 2.16 | 4.82 → 2.53 |
| B10 detail, admin | 5 → 3 | 87 → 9 | 4.43 → 2.07 | 5.23 → 2.50 |
| Catalog, admin (control) | 3 → 3 | 79 → 79 | 3.61 → 3.56 | 3.92 → 4.00 |
| Class overview, student (control) | 22 → 22 | 201 → 201 | 13.73 → 13.75 | 15.55 → 15.54 |

Returned rows count rows delivered to the service, not internal rows scanned by MySQL. Query count falls by 40% for the measured draft lesson details. Published assets can add validation queries, so “3 queries” is not a universal budget. All 40 response hashes per case match after excluding the overview's generated timestamp. Every table's rows and schema match before/after the measurement. The test log emits `G5C_MEASUREMENT` with raw samples and output hashes; keep run artifacts outside Git. Median uses the mean of the middle pair; p95 uses nearest rank.

The unchanged controls show no attributable optimization. These measurements are not a concurrent-user load test, a production SLA or evidence that media delivery is fast enough on all devices. Evaluate representative history sizes, database plans, network/media delivery and peak concurrency in staging before setting release performance targets.

## Reproducing and assessing acceptance

Use the disposable environment and marker URLs in [G5B rollout](G5B_DRAFT_EDITOR_ROLLOUT.md): MySQL on loopback 33129, MinIO on 33130, browser frontend on 33131, isolated editor API on 33132. Never point the tests at the application database. The tests seed only committed synthetic fixtures and create random databases. No local customer workbook, source package or media export is needed.

From the repository root, with backend dependencies installed:

```text
node --test backend/tests/*.test.js
```

For just the repeatable comparison and stitched class/editor acceptance:

```text
node --test backend/tests/curriculum-g5c.integration.test.js
```

From `frontend`, with Playwright Chromium installed:

```text
npx next build --webpack
npx tsc --noEmit
npm run test:curriculum:g5c
```

Set `NODE_PATH` to backend `node_modules` when using shared dependencies in an isolated checkout. This suite includes G1/G2/G4AB/G4C/G5A/G5B regressions and G5C keyboard, slow-response, retry, independent-request and remount scenarios at desktop 1280×900, tablet 820×1180 and phone 390×844 viewports. G5B uses its real isolated API/MySQL; other browser scenarios intercept API responses. Backend integration checks real SQL, permissions, scoped versions and MinIO flows. The stitched G5C flow uses synthetic upload rows to exercise assignment → submission → review → draft edit → scoped retake → resume; it does not claim physical capture in that test.

Regression tests cover all B1–B10 codes and the four C/H groups, preserving blocked D07 alternatives and D08 self-study behavior. G5C directly compares old/new lesson responses for admin/teacher/student roles, checks live role/media changes and current-version completion, and verifies that a class retake keeps the original version/role after an editor creates a new draft. Immutable parent rows, answers and review history remain unchanged; derived parent state may correctly indicate a linked resubmission.

Verification on 17 November 2026: 136 backend tests and 56 browser tests passed; webpack build, TypeScript and changed-file ESLint passed. The final exact-code guard was rechecked with the five G5C backend tests. A G5A browser test originally reloaded before its asynchronous IndexedDB deletion completed; it now waits for the discard control to disappear, and all six G5A scenarios passed again. The initial build encountered a `next/font` loader error; an unchanged build retry passed without mocking fonts or changing dependencies. Existing multiple-lockfile, browser-baseline and unconfigured-Supabase notices remain. These are technical fixture results, not customer content or physical-device acceptance.

## Rollout and rollback

Review this code diff and deploy matching backend/frontend through the normal release process after verifying G1–G5B prerequisites. G5C itself needs no SQL, seed or data rewrite. If M1–M4 are absent, use their separate guides with a target-specific schema diff, backup and preservation checks. Do not rerun source imports to overwrite editor versions.

In staging, verify opening/closing a slow lesson, retrying a failed read, switching accounts, class continuation, and an existing assignment after an editorial update. Observe latency/error rates against an equivalent workload. No content approval, AI enablement or production release follows automatically from a technical pass.

Rollback matching application code to G5B if needed. Retain all versions, attempts, clips, audit rows and browser recording drafts; there is no G5C database change to reverse. Physical-device acceptance, content approval and production deployment remain separate decisions.
