// Configure connection parameters to MySQL container BEFORE requiring db
process.env.DB_HOST = process.env.DB_HOST || "127.0.0.1";
process.env.DB_PORT = process.env.DB_PORT || "3308";
process.env.DB_USER = process.env.DB_USER || "root";
process.env.DB_PASSWORD = process.env.DB_PASSWORD || "root";
process.env.DB_NAME = process.env.DB_NAME || "vietsignschool";

const test = require("node:test");
const assert = require("node:assert");

// REAL DATABASE CONNECTION (No mock!)
const db = require("../src/db");
const svc = require("../src/features/curriculum/services/curriculum.services");

test("INTEGRATION TEST: Real MySQL Database Connection (vietsign_db container)", async (t) => {
  let testLessonId = null;
  let testActivityId = null;
  const testUserId = 1; // Admin user in DB
  const testLessonCode = "TEST.L1.BT.01";
  const testActivityCode = "TEST.L1.BT.01.T01";

  // --------------------------------------------------------------------------
  // SETUP: Tạo bài học và hoạt động test trong DB thật
  // --------------------------------------------------------------------------
  // Dọn rác cũ nếu có từ lần chạy trước
  await db.execute("DELETE FROM curriculum_lesson WHERE lesson_code = ?", [testLessonCode]);

  const [lessonRes] = await db.execute(
    `INSERT INTO curriculum_lesson 
      (lesson_code, level_code, topic_code, title, content_status, display_order, is_active)
     VALUES (?, 'L1', 'BT', 'Bài test tích hợp', 'ready', 999, 1)`,
    [testLessonCode],
  );
  testLessonId = lessonRes.insertId;

  const [actRes] = await db.execute(
    `INSERT INTO curriculum_activity 
      (lesson_id, activity_code, activity_level, game_type, title, display_order, game_config, pass_score, is_active)
     VALUES (?, ?, 'T', 'FlipCardViewer', 'Hoạt động test thực tế', 1, '{}', 80.00, 1)`,
    [testLessonId, testActivityCode],
  );
  testActivityId = actRes.insertId;

  console.log(`\n======================================================`);
  console.log(`[SETUP] Đã tạo Test Lesson (ID: ${testLessonId}) và Test Activity (ID: ${testActivityId})`);
  console.log(`======================================================\n`);

  try {
    // ------------------------------------------------------------------------
    // CASE 1: Nộp bài lần đầu tiên cho activity (Score: 70, Stars: 2)
    // ------------------------------------------------------------------------
    await t.test("Case 1: Nộp bài lần đầu (Score: 70, Stars: 2)", async () => {
      const payload1 = {
        score: 70,
        stars: 2,
        durationSeconds: 40,
        isCompleted: false,
        gameResultDetails: { correct: 7, total: 10 },
      };

      const result1 = await svc.submitGameProgress(testUserId, testActivityId, payload1);
      assert.ok(result1.progressId > 0, "Phải có progressId tự tăng");

      // SELECT THẬT TỪ DATABASE
      const [progressRows] = await db.execute(
        "SELECT * FROM curriculum_game_progress WHERE activity_id = ? AND user_id = ?",
        [testActivityId, testUserId],
      );
      const [summaryRows] = await db.execute(
        "SELECT * FROM curriculum_user_activity_summary WHERE activity_id = ? AND user_id = ?",
        [testActivityId, testUserId],
      );

      console.log("--- KẾT QUẢ DB THỰC TẾ SAU LẦN 1 ---");
      console.log("curriculum_game_progress (Lịch sử):", progressRows);
      console.log("curriculum_user_activity_summary (Tổng hợp):", summaryRows);

      // Xác nhận bảng lịch sử có đúng 1 dòng
      assert.strictEqual(progressRows.length, 1);
      assert.strictEqual(Number(progressRows[0].score), 70);
      assert.strictEqual(progressRows[0].stars, 2);

      // Xác nhận bảng tổng hợp có đúng 1 dòng với total_attempts = 1
      assert.strictEqual(summaryRows.length, 1);
      assert.strictEqual(summaryRows[0].total_attempts, 1);
      assert.strictEqual(Number(summaryRows[0].best_score), 70);
      assert.strictEqual(summaryRows[0].best_stars, 2);
      assert.strictEqual(summaryRows[0].is_completed, 0);
      assert.strictEqual(summaryRows[0].last_progress_id, progressRows[0].progress_id);
    });

    // ------------------------------------------------------------------------
    // CASE 2: Nộp lần 2 cùng activity với score CAO HƠN (Score: 95, Stars: 3)
    // ------------------------------------------------------------------------
    await t.test("Case 2: Nộp bài lần 2 với score CAO HƠN (Score: 95, Stars: 3)", async () => {
      const payload2 = {
        score: 95,
        stars: 3,
        durationSeconds: 25,
        isCompleted: true,
        gameResultDetails: { correct: 10, total: 10 },
      };

      const result2 = await svc.submitGameProgress(testUserId, testActivityId, payload2);
      assert.ok(result2.progressId > 0);

      // SELECT THẬT TỪ DATABASE
      const [progressRows] = await db.execute(
        "SELECT progress_id, score, stars, is_completed, played_at FROM curriculum_game_progress WHERE activity_id = ? AND user_id = ? ORDER BY progress_id ASC",
        [testActivityId, testUserId],
      );
      const [summaryRows] = await db.execute(
        "SELECT * FROM curriculum_user_activity_summary WHERE activity_id = ? AND user_id = ?",
        [testActivityId, testUserId],
      );

      console.log("\n--- KẾT QUẢ DB THỰC TẾ SAU LẦN 2 ---");
      console.log("curriculum_game_progress (2 dòng lịch sử):", progressRows);
      console.log("curriculum_user_activity_summary (1 dòng tổng hợp):", summaryRows);

      // Xác nhận bảng lịch sử lưu CẢ 2 LẦN (2 dòng)
      assert.strictEqual(progressRows.length, 2, "Lịch sử phải giữ cả 2 lần làm bài");
      assert.strictEqual(Number(progressRows[0].score), 70);
      assert.strictEqual(Number(progressRows[1].score), 95);

      // Xác nhận bảng tổng hợp CHỈ 1 DÒNG, cập nhật điểm cao hơn (95), total_attempts = 2
      assert.strictEqual(summaryRows.length, 1, "Bảng summary luôn chỉ có 1 dòng duy nhất cho mỗi user-activity");
      assert.strictEqual(summaryRows[0].total_attempts, 2, "total_attempts phải tăng lên 2");
      assert.strictEqual(Number(summaryRows[0].best_score), 95, "best_score phải cập nhật thành 95");
      assert.strictEqual(summaryRows[0].best_stars, 3, "best_stars phải cập nhật thành 3");
      assert.strictEqual(summaryRows[0].is_completed, 1, "is_completed phải thành 1");
      assert.strictEqual(summaryRows[0].last_progress_id, progressRows[1].progress_id);
    });

    // ------------------------------------------------------------------------
    // CASE 3: Nộp lần 3 với score THẤP HƠN (Score: 60, Stars: 1)
    // ------------------------------------------------------------------------
    await t.test("Case 3: Nộp bài lần 3 với score THẤP HƠN (Score: 60, Stars: 1)", async () => {
      const payload3 = {
        score: 60,
        stars: 1,
        durationSeconds: 55,
        isCompleted: false,
        gameResultDetails: { correct: 6, total: 10 },
      };

      const result3 = await svc.submitGameProgress(testUserId, testActivityId, payload3);
      assert.ok(result3.progressId > 0);

      // SELECT THẬT TỪ DATABASE
      const [progressRows] = await db.execute(
        "SELECT progress_id, score, stars, is_completed, played_at FROM curriculum_game_progress WHERE activity_id = ? AND user_id = ? ORDER BY progress_id ASC",
        [testActivityId, testUserId],
      );
      const [summaryRows] = await db.execute(
        "SELECT * FROM curriculum_user_activity_summary WHERE activity_id = ? AND user_id = ?",
        [testActivityId, testUserId],
      );

      console.log("\n--- KẾT QUẢ DB THỰC TẾ SAU LẦN 3 ---");
      console.log("curriculum_game_progress (3 dòng lịch sử):", progressRows);
      console.log("curriculum_user_activity_summary (1 dòng tổng hợp):", summaryRows);

      // Xác nhận bảng lịch sử lưu CẢ 3 LẦN (3 dòng)
      assert.strictEqual(progressRows.length, 3, "Lịch sử phải lưu đủ cả 3 lần làm bài");
      assert.strictEqual(Number(progressRows[0].score), 70);
      assert.strictEqual(Number(progressRows[1].score), 95);
      assert.strictEqual(Number(progressRows[2].score), 60);

      // Xác nhận bảng tổng hợp: VẪN GIỮ ĐIỂM 95 của lần 2, KHÔNG BỊ 60 GHI ĐÈ, total_attempts = 3
      assert.strictEqual(summaryRows.length, 1);
      assert.strictEqual(summaryRows[0].total_attempts, 3, "total_attempts phải là 3");
      assert.strictEqual(Number(summaryRows[0].best_score), 95, "best_score VẪN GIỮ NGUYÊN 95");
      assert.strictEqual(summaryRows[0].best_stars, 3, "best_stars VẪN GIỮ NGUYÊN 3");
      assert.strictEqual(summaryRows[0].is_completed, 1, "is_completed VẪN GIỮ NGUYÊN 1");
      assert.strictEqual(summaryRows[0].last_progress_id, progressRows[2].progress_id, "last_progress_id cập nhật về lần nộp 3");
    });
  } finally {
    // ------------------------------------------------------------------------
    // CLEANUP: DỌN SẠCH DỮ LIỆU TEST
    // ------------------------------------------------------------------------
    console.log(`\n======================================================`);
    console.log(`[CLEANUP] Bắt đầu dọn sạch dữ liệu test trong MySQL container...`);
    await db.execute("DELETE FROM curriculum_user_activity_summary WHERE activity_id = ?", [testActivityId]);
    await db.execute("DELETE FROM curriculum_game_progress WHERE activity_id = ?", [testActivityId]);
    await db.execute("DELETE FROM curriculum_activity WHERE activity_id = ?", [testActivityId]);
    await db.execute("DELETE FROM curriculum_lesson WHERE lesson_id = ?", [testLessonId]);

    const [checkProgress] = await db.execute("SELECT COUNT(*) AS cnt FROM curriculum_game_progress WHERE activity_id = ?", [testActivityId]);
    const [checkSummary] = await db.execute("SELECT COUNT(*) AS cnt FROM curriculum_user_activity_summary WHERE activity_id = ?", [testActivityId]);
    const [checkLesson] = await db.execute("SELECT COUNT(*) AS cnt FROM curriculum_lesson WHERE lesson_id = ?", [testLessonId]);

    console.log(`[CLEANUP] Số dòng còn lại trong progress: ${checkProgress[0].cnt}, summary: ${checkSummary[0].cnt}, lesson: ${checkLesson[0].cnt}`);
    console.log(`[CLEANUP] Đã dọn sạch 100% dữ liệu test. Không để lại rác trong DB.`);
    console.log(`======================================================\n`);

    // Đóng pool kết nối để test runner kết thúc sạch
    await db.end();
  }
});
