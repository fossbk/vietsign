const test = require("node:test");
const assert = require("node:assert/strict");

const dbPath = require.resolve("../src/db");
const executedQueries = [];

const connection = {
  beginTransaction: async () => executedQueries.push("BEGIN"),
  commit: async () => executedQueries.push("COMMIT"),
  rollback: async () => executedQueries.push("ROLLBACK"),
  release: () => executedQueries.push("RELEASE"),
  execute: async (query, params = []) => {
    const normalized = query.replace(/\s+/g, " ").trim();
    executedQueries.push({ query: normalized, params });

    if (normalized.startsWith("INSERT INTO curriculum_game_progress")) {
      return [{ insertId: 44 }];
    }
    if (normalized.startsWith("INSERT INTO curriculum_ai_job")) {
      return [{ insertId: 55 }];
    }
    return [{ affectedRows: 1 }];
  },
};

const mockDb = {
  execute: async (query, params = []) => {
    const normalized = query.replace(/\s+/g, " ").trim();
    executedQueries.push({ query: normalized, params });

    if (normalized.startsWith("SELECT activity_id, game_type")) {
      return [[{ activity_id: 20, game_type: "VideoPracticeRecorder" }]];
    }
    if (normalized.startsWith("SELECT user_id FROM user")) {
      return [[{ user_id: 7 }]];
    }
    if (normalized.startsWith("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA")) {
      return [[]];
    }
    return [{ affectedRows: 1 }];
  },
  getConnection: async () => connection,
};

require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: mockDb };

const queueService = require("../src/features/curriculum/services/curriculumAiQueue.service");
const curriculumService = require("../src/features/curriculum/services/curriculum.services");

test("video practice submission queues AI without marking completion", async () => {
  executedQueries.length = 0;

  const result = await curriculumService.submitGameProgress(7, 20, {
    score: 100,
    stars: 3,
    isCompleted: true,
    submissionVideoUrl: "/uploads/curriculum-practice/practice.webm",
    targetText: "Chữ A",
  });

  assert.equal(result.progressId, 44);
  assert.equal(result.aiJobId, 55);
  assert.equal(result.aiStatus, "queued");
  assert.ok(
    executedQueries.some(
      (entry) => typeof entry === "object" && entry.query.includes("INSERT INTO curriculum_ai_job") && entry.params[3] === "/uploads/curriculum-practice/practice.webm",
    ),
  );

  const progressInsert = executedQueries.find(
    (entry) => typeof entry === "object" && entry.query.startsWith("INSERT INTO curriculum_game_progress"),
  );
  assert.equal(progressInsert.params[2], "VideoPracticeRecorder");
  assert.equal(progressInsert.params[3], 0);
  assert.equal(progressInsert.params[4], 0);
  assert.equal(progressInsert.params[7], "/uploads/curriculum-practice/practice.webm");
  assert.equal(progressInsert.params[6], 0);
});

test("video practice submission requires a stored video path", async () => {
  await assert.rejects(
    () => curriculumService.submitGameProgress(7, 20, {}),
    (error) => error.status === 400 && /Video/.test(error.message),
  );
});

test("AI queue helpers reject unsafe paths and calculate bounded scores", () => {
  assert.equal(queueService.parseStoredVideoUrl("/uploads/curriculum-practice/video.webm"), "curriculum-practice/video.webm");
  assert.throws(() => queueService.parseStoredVideoUrl("https://example.com/video.webm"), /invalid/i);
  assert.throws(() => queueService.parseStoredVideoUrl("/uploads/others/../video.webm"), /invalid/i);
  assert.throws(() => queueService.parseStoredVideoUrl("/uploads/curriculum-practice/%2e%2e"), /invalid/i);
  assert.equal(queueService.calculateAiScore({ is_match: true }), 100);
  assert.equal(queueService.calculateAiScore({ is_match: false, confidence: 0.99 }), 0);
  assert.equal(queueService.calculateAiScore({ confidence: 1.5 }), 100);
  assert.equal(queueService.calculateStars(95), 3);
  assert.equal(queueService.calculateStars(80), 2);
  assert.equal(queueService.calculateStars(50), 1);
  assert.equal(queueService.calculateStars(0), 0);
});
