require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

async function seed() {
  const dataPath = path.join(__dirname, "curriculum_lop1_data.json");
  if (!fs.existsSync(dataPath)) {
    console.error("Data file not found:", dataPath);
    process.exit(1);
  }

  const raw = fs.readFileSync(dataPath, "utf-8");
  const lessons = JSON.parse(raw);

  console.log(`\n======================================================`);
  console.log(`[SEED] Bắt đầu nạp dữ liệu Curriculum Lớp 1 vào Database...`);
  console.log(`======================================================\n`);

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3308),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "root",
    database: process.env.DB_NAME || "vietsignschool",
    charset: "utf8mb4",
  });

  try {
    await connection.beginTransaction();

    let insertedLessons = 0;
    let insertedActivities = 0;
    let insertedMedia = 0;

    for (const lesson of lessons) {
      // 1. Insert or Update Lesson
      const [lessonRes] = await connection.execute(
        `INSERT INTO curriculum_lesson 
          (lesson_code, level_code, topic_code, title, description, content_status, display_order, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE
          title = VALUES(title),
          description = VALUES(description),
          content_status = VALUES(content_status),
          display_order = VALUES(display_order)`,
        [
          lesson.lesson_code,
          lesson.level_code,
          lesson.topic_code,
          lesson.title,
          lesson.description || "",
          lesson.content_status || "ready",
          lesson.display_order,
        ],
      );

      // Get lesson_id
      let lessonId = lessonRes.insertId;
      if (!lessonId) {
        const [rows] = await connection.execute(
          "SELECT lesson_id FROM curriculum_lesson WHERE lesson_code = ?",
          [lesson.lesson_code],
        );
        lessonId = rows[0]?.lesson_id;
      }
      insertedLessons++;
      console.log(`📚 Đã nạp Bài học: [${lesson.lesson_code}] ${lesson.title}`);

      // 2. Insert or Update Activities
      for (const act of lesson.activities) {
        const [actRes] = await connection.execute(
          `INSERT INTO curriculum_activity
            (lesson_id, activity_code, activity_level, game_type, title, instruction, display_order, pass_score, game_config, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
           ON DUPLICATE KEY UPDATE
            lesson_id = VALUES(lesson_id),
            activity_level = VALUES(activity_level),
            game_type = VALUES(game_type),
            title = VALUES(title),
            instruction = VALUES(instruction),
            display_order = VALUES(display_order),
            pass_score = VALUES(pass_score),
            game_config = VALUES(game_config)`,
          [
            lessonId,
            act.activity_code,
            act.activity_level || "T",
            act.game_type,
            act.title,
            act.instruction || "",
            act.display_order,
            act.pass_score || 80.0,
            JSON.stringify(act.game_config || {}),
          ],
        );

        // Get activity_id
        let activityId = actRes.insertId;
        if (!activityId) {
          const [aRows] = await connection.execute(
            "SELECT activity_id FROM curriculum_activity WHERE activity_code = ?",
            [act.activity_code],
          );
          activityId = aRows[0]?.activity_id;
        }
        insertedActivities++;

        // 3. Insert or Update Media
        // The seed is authoritative for curriculum media. Replace the activity's
        // rows so removed placeholders do not survive a re-seed.
        await connection.execute(
          "DELETE FROM curriculum_media WHERE activity_id = ?",
          [activityId],
        );
        if (act.media && act.media.length > 0) {
          for (const m of act.media) {
            await connection.execute(
              `INSERT INTO curriculum_media
                (activity_id, media_code, media_type, source_url, display_order)
               VALUES (?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE
                activity_id = VALUES(activity_id),
                media_type = VALUES(media_type),
                source_url = VALUES(source_url),
                display_order = VALUES(display_order)`,
              [
                activityId,
                m.media_code,
                m.media_type || "video",
                m.source_url,
                m.display_order,
              ],
            );
            insertedMedia++;
          }
        }
      }
    }

    await connection.commit();

    console.log(`\n======================================================`);
    console.log(`✅ [SEED THÀNH CÔNG]`);
    console.log(`- Số bài học (curriculum_lesson):    ${insertedLessons}`);
    console.log(`- Số hoạt động (curriculum_activity): ${insertedActivities}`);
    console.log(`- Số media (curriculum_media):        ${insertedMedia}`);
    console.log(`======================================================\n`);
  } catch (err) {
    await connection.rollback();
    console.error("❌ Lỗi khi seed dữ liệu:", err);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

seed();
