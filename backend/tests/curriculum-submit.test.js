const test = require("node:test");
const assert = require("node:assert");
const path = require("node:path");

// ============================================================================
// IN-MEMORY DATABASE MOCK (Simulating MySQL 8.0 & mysql2/promise)
// ============================================================================

const tables = {
  user: [{ user_id: 1, is_deleted: 0, code: "STUDENT" }],
  curriculum_activity: [{ activity_id: 10, game_type: "FlipCardViewer", is_active: 1 }],
  curriculum_game_progress: [],
  curriculum_user_activity_summary: [],
};

let nextProgressId = 1;
let nextSummaryId = 1;

function resetDb() {
  tables.curriculum_game_progress = [];
  tables.curriculum_user_activity_summary = [];
  nextProgressId = 1;
  nextSummaryId = 1;
}

// Mock DB pool matching mysql2/promise interface
const mockConnection = {
  inTransaction: false,
  async beginTransaction() {
    this.inTransaction = true;
  },
  async commit() {
    this.inTransaction = false;
  },
  async rollback() {
    this.inTransaction = false;
  },
  release() {},
  async execute(sql, params = []) {
    return executeSql(sql, params);
  },
};

const mockDb = {
  async execute(sql, params = []) {
    return executeSql(sql, params);
  },
  async query(sql, params = []) {
    return executeSql(sql, params);
  },
  async getConnection() {
    return mockConnection;
  },
};

function executeSql(sql, params) {
  const normalized = sql.replace(/\s+/g, " ").trim();

  // 1. SELECT activity_id, game_type FROM curriculum_activity WHERE activity_id = ?
  if (normalized.includes("FROM curriculum_activity WHERE activity_id = ?")) {
    const actId = params[0];
    const rows = tables.curriculum_activity.filter((a) => a.activity_id === actId);
    return [rows];
  }

  // 2. SELECT user_id FROM user WHERE user_id = ? AND is_deleted = 0
  if (normalized.includes("FROM user WHERE user_id = ?")) {
    const uId = params[0];
    const rows = tables.user.filter((u) => u.user_id === uId && u.is_deleted === 0);
    return [rows];
  }

  // 3. INSERT INTO curriculum_game_progress
  if (normalized.startsWith("INSERT INTO curriculum_game_progress")) {
    const [
      activity_id,
      user_id,
      game_type,
      score,
      stars,
      duration_seconds,
      is_completed,
      submission_video_url,
      game_result_details,
    ] = params;

    const newRow = {
      progress_id: nextProgressId++,
      activity_id,
      user_id,
      game_type,
      score,
      stars,
      duration_seconds,
      is_completed,
      submission_video_url,
      teacher_feedback: null,
      game_result_details,
      played_at: new Date(),
    };
    tables.curriculum_game_progress.push(newRow);
    return [{ insertId: newRow.progress_id }];
  }

  // 4. INSERT INTO curriculum_user_activity_summary ... ON DUPLICATE KEY UPDATE
  if (normalized.startsWith("INSERT INTO curriculum_user_activity_summary")) {
    const [user_id, activity_id, score, stars, progress_id, is_completed] = params;

    const existingIndex = tables.curriculum_user_activity_summary.findIndex(
      (s) => s.user_id === user_id && s.activity_id === activity_id,
    );

    if (existingIndex === -1) {
      // First insert
      const newSummary = {
        summary_id: nextSummaryId++,
        user_id,
        activity_id,
        best_score: score,
        best_stars: stars,
        total_attempts: 1,
        last_progress_id: progress_id,
        is_completed: is_completed ? 1 : 0,
        last_played_at: new Date(),
      };
      tables.curriculum_user_activity_summary.push(newSummary);
      return [{ insertId: newSummary.summary_id, affectedRows: 1 }];
    } else {
      // ON DUPLICATE KEY UPDATE:
      // best_score = GREATEST(best_score, VALUES(best_score))
      // best_stars = GREATEST(best_stars, VALUES(best_stars))
      // total_attempts = total_attempts + 1
      // last_progress_id = VALUES(last_progress_id)
      // is_completed = GREATEST(is_completed, VALUES(is_completed))
      const row = tables.curriculum_user_activity_summary[existingIndex];
      row.best_score = Math.max(Number(row.best_score), Number(score));
      row.best_stars = Math.max(Number(row.best_stars), Number(stars));
      row.total_attempts += 1;
      row.last_progress_id = progress_id;
      row.is_completed = row.is_completed || is_completed ? 1 : 0;
      row.last_played_at = new Date();
      return [{ insertId: row.summary_id, affectedRows: 2 }];
    }
  }

  // Fallback for other queries
  return [[]];
}

// Inject mock db into Node require cache before importing curriculum.services
const dbPath = path.resolve(__dirname, "../src/db.js");
require.cache[require.resolve(dbPath)] = {
  id: require.resolve(dbPath),
  filename: require.resolve(dbPath),
  loaded: true,
  exports: mockDb,
};

// Now import the service under test
const svc = require("../src/features/curriculum/services/curriculum.services");

// ============================================================================
// TEST SUITE: submitGameProgress (Endpoint Logic)
// ============================================================================

test("POST /curriculum/activities/:activityId/submit - 3 submission test cases", async (t) => {
  resetDb();
  const userId = 1;
  const activityId = 10;

  // --------------------------------------------------------------------------
  // CASE 1: Nộp bài lần đầu cho 1 activity
  // --------------------------------------------------------------------------
  await t.test("Trường hợp 1: Nộp bài lần đầu tiên (Score: 70, Stars: 2)", async () => {
    const payload1 = {
      score: 70,
      stars: 2,
      durationSeconds: 45,
      isCompleted: false,
      gameResultDetails: { moves: 10, correctPairs: 4 },
    };

    const result1 = await svc.submitGameProgress(userId, activityId, payload1);

    // Xác nhận kết quả trả về
    assert.strictEqual(result1.score, 70);
    assert.strictEqual(result1.stars, 2);
    assert.strictEqual(result1.isCompleted, 0);
    assert.strictEqual(result1.gameType, "FlipCardViewer");

    // Xác nhận curriculum_game_progress có ĐÚNG 1 dòng
    assert.strictEqual(tables.curriculum_game_progress.length, 1);
    const history1 = tables.curriculum_game_progress[0];
    assert.strictEqual(history1.progress_id, 1);
    assert.strictEqual(history1.user_id, userId);
    assert.strictEqual(history1.activity_id, activityId);
    assert.strictEqual(history1.score, 70);
    assert.strictEqual(history1.stars, 2);

    // Xác nhận curriculum_user_activity_summary có ĐÚNG 1 dòng với total_attempts = 1
    assert.strictEqual(tables.curriculum_user_activity_summary.length, 1);
    const summary1 = tables.curriculum_user_activity_summary[0];
    assert.strictEqual(summary1.user_id, userId);
    assert.strictEqual(summary1.activity_id, activityId);
    assert.strictEqual(summary1.total_attempts, 1);
    assert.strictEqual(summary1.best_score, 70);
    assert.strictEqual(summary1.best_stars, 2);
    assert.strictEqual(summary1.is_completed, 0);
    assert.strictEqual(summary1.last_progress_id, 1);
  });

  // --------------------------------------------------------------------------
  // CASE 2: Nộp bài lần 2 cùng activity với score CAO HƠN lần 1
  // --------------------------------------------------------------------------
  await t.test("Trường hợp 2: Nộp bài lần 2 với score CAO HƠN (Score: 95, Stars: 3)", async () => {
    const payload2 = {
      score: 95,
      stars: 3,
      durationSeconds: 30,
      isCompleted: true,
      gameResultDetails: { moves: 6, correctPairs: 6 },
    };

    const result2 = await svc.submitGameProgress(userId, activityId, payload2);

    assert.strictEqual(result2.score, 95);
    assert.strictEqual(result2.stars, 3);
    assert.strictEqual(result2.isCompleted, 1);

    // Xác nhận curriculum_game_progress có ĐÚNG 2 dòng (lịch sử giữ cả 2 lần)
    assert.strictEqual(tables.curriculum_game_progress.length, 2);
    assert.strictEqual(tables.curriculum_game_progress[0].score, 70); // Lần 1 vẫn còn
    assert.strictEqual(tables.curriculum_game_progress[1].score, 95); // Lần 2 lưu mới
    assert.strictEqual(tables.curriculum_game_progress[1].progress_id, 2);

    // Xác nhận curriculum_user_activity_summary CHỈ CÓ 1 DÒNG
    assert.strictEqual(tables.curriculum_user_activity_summary.length, 1);
    const summary2 = tables.curriculum_user_activity_summary[0];
    assert.strictEqual(summary2.total_attempts, 2, "total_attempts phải tăng lên 2");
    assert.strictEqual(summary2.best_score, 95, "best_score phải cập nhật lên 95");
    assert.strictEqual(summary2.best_stars, 3, "best_stars phải cập nhật lên 3");
    assert.strictEqual(summary2.is_completed, 1, "is_completed phải là 1 (hoàn thành)");
    assert.strictEqual(summary2.last_progress_id, 2, "last_progress_id trỏ về lần nộp 2");
  });

  // --------------------------------------------------------------------------
  // CASE 3: Nộp bài lần 3 với score THẤP HƠN lần 2
  // --------------------------------------------------------------------------
  await t.test("Trường hợp 3: Nộp bài lần 3 với score THẤP HƠN (Score: 60, Stars: 1)", async () => {
    const payload3 = {
      score: 60,
      stars: 1,
      durationSeconds: 50,
      isCompleted: false,
      gameResultDetails: { moves: 12, correctPairs: 3 },
    };

    const result3 = await svc.submitGameProgress(userId, activityId, payload3);

    assert.strictEqual(result3.score, 60);

    // Xác nhận curriculum_game_progress có ĐÚNG 3 dòng (lịch sử giữ cả 3 lần)
    assert.strictEqual(tables.curriculum_game_progress.length, 3);
    assert.strictEqual(tables.curriculum_game_progress[2].score, 60);
    assert.strictEqual(tables.curriculum_game_progress[2].progress_id, 3);

    // Xác nhận summary VẪN CHỈ 1 DÒNG, best_score VẪN GIỮ điểm lần 2 (95), total_attempts = 3
    assert.strictEqual(tables.curriculum_user_activity_summary.length, 1);
    const summary3 = tables.curriculum_user_activity_summary[0];
    assert.strictEqual(summary3.total_attempts, 3, "total_attempts phải tăng lên 3");
    assert.strictEqual(
      summary3.best_score,
      95,
      "best_score VẪN GIỮ 95 của lần 2, không bị điểm 60 ghi đè",
    );
    assert.strictEqual(summary3.best_stars, 3, "best_stars VẪN GIỮ 3 của lần 2");
    assert.strictEqual(summary3.is_completed, 1, "is_completed VẪN GIỮ 1");
    assert.strictEqual(summary3.last_progress_id, 3, "last_progress_id cập nhật về lần nộp 3");
  });
});

test("Validation & Error handling", async (t) => {
  resetDb();

  await t.test("Lỗi khi activityId không tồn tại -> throw 404", async () => {
    await assert.rejects(
      async () => {
        await svc.submitGameProgress(1, 9999, { score: 100 });
      },
      (err) => {
        assert.strictEqual(err.status, 404);
        assert.match(err.message, /Hoạt động không tồn tại/);
        return true;
      },
    );
  });

  await t.test("Lỗi khi userId không tồn tại -> throw 404", async () => {
    await assert.rejects(
      async () => {
        await svc.submitGameProgress(9999, 10, { score: 100 });
      },
      (err) => {
        assert.strictEqual(err.status, 404);
        assert.match(err.message, /Người dùng không tồn tại/);
        return true;
      },
    );
  });
});
