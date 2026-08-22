const db = require("../../../db");

/**
 * Service layer for lesson management.
 * Contains business logic for lesson operations.
 */

async function createLesson(data, userId) {
  try {
    const {
      name,
      description,
      topic_id,
      classroom_id,
      content,
      difficulty_level,
      order_number,
    } = data;

    if (!name) {
      throw {
        status: 400,
        message: "Name is required",
      };
    }

    const query = `
      INSERT INTO lesson (
        lesson_name, 
        class_room_id, 
        created_by, 
        content,
        topic_id,
        description,
        image_location,
        video_location,
        difficulty_level,
        order_number,
        created_date, 
        modified_date
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    const [result] = await db.execute(query, [
      name,
      classroom_id || null,
      userId,
      content || null,
      topic_id || null,
      description || null,
      data.image_location || null,
      data.video_location || null,
      difficulty_level || "MEDIUM",
      order_number || 0,
    ]);

    return {
      id: result.insertId,
      name,
      classroom_id,
      image_location: data.image_location,
      video_location: data.video_location,
      created_by: userId,
      created_at: new Date(),
    };
  } catch (err) {
    throw {
      status: err.status || 500,
      message: err.message || "Error creating lesson",
    };
  }
}

async function getLessons(filters) {
  try {
    const {
      page = 1,
      limit = 20,
      q = "",
      topic_id,
      classroom_id,
      difficulty_level,
      is_active,
    } = filters;
    const offset = (page - 1) * limit;

    let sqlQuery = "SELECT * FROM lesson WHERE 1=1";
    const params = [];

    if (q) {
      sqlQuery += " AND lesson_name LIKE ?";
      params.push(`%${q}%`);
    }

    if (classroom_id) {
      sqlQuery += " AND class_room_id = ?";
      params.push(classroom_id);
    }

    if (difficulty_level) {
      sqlQuery += " AND difficulty_level = ?";
      params.push(difficulty_level);
    }

    if (is_active !== undefined) {
      sqlQuery += " AND is_active = ?";
      params.push(is_active);
    }

    sqlQuery += " ORDER BY lesson_id ASC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const [lessons] = await db.query(sqlQuery, params);

    const mappedLessons = lessons.map((l) => ({
      id: l.lesson_id,
      name: l.lesson_name,
      description: l.description,
      content: l.content,
      topic_id: l.topic_id,
      classroom_id: l.class_room_id,
      difficulty_level: l.difficulty_level,
      order_number: l.order_number,
      is_active: l.is_active,
      created_by: l.created_by,
      created_at: l.created_date,
      modified_at: l.modified_date,
    }));

    return {
      data: mappedLessons,
      page,
      limit,
      total: lessons.length,
    };
  } catch (err) {
    throw {
      status: err.status || 500,
      message: err.message || "Error fetching lessons",
    };
  }
}

async function getLessonById(lessonId) {
  try {
    if (!lessonId) {
      throw {
        status: 400,
        message: "Lesson ID is required",
      };
    }

    const query = "SELECT * FROM lesson WHERE lesson_id = ?";
    const [results] = await db.query(query, [lessonId]);

    if (results.length === 0) {
      throw {
        status: 404,
        message: "Lesson not found",
      };
    }

    const l = results[0];
    return {
      id: l.lesson_id,
      name: l.lesson_name,
      description: l.description,
      content: l.content,
      topic_id: l.topic_id,
      classroom_id: l.class_room_id,
      difficulty_level: l.difficulty_level,
      order_number: l.order_number,
      is_active: l.is_active,
      created_by: l.created_by,
      created_at: l.created_date,
    };
  } catch (err) {
    throw {
      status: err.status || 500,
      message: err.message || "Error fetching lesson",
    };
  }
}

async function getLessonsByTopicId(topicId) {
  try {
    if (!topicId) {
      throw {
        status: 400,
        message: "Topic ID is required",
      };
    }

    const query =
      "SELECT * FROM lesson WHERE topic_id = ? ORDER BY order_number ASC";
    const [lessons] = await db.query(query, [topicId]);
    return lessons.map((l) => ({
      id: l.lesson_id,
      name: l.lesson_name,
      description: l.description,
      content: l.content,
      topic_id: l.topic_id,
      classroom_id: l.class_room_id,
      difficulty_level: l.difficulty_level,
      order_number: l.order_number,
    }));
  } catch (err) {
    throw {
      status: err.status || 500,
      message: err.message || "Error fetching lessons by topic",
    };
  }
}

async function getLessonsByClassroomId(classroomId) {
  try {
    if (!classroomId) {
      throw {
        status: 400,
        message: "Classroom ID is required",
      };
    }

    const query =
      "SELECT * FROM lesson WHERE class_room_id = ? ORDER BY lesson_id ASC";
    const [lessons] = await db.query(query, [classroomId]);

    return lessons.map((l) => ({
      id: l.lesson_id,
      name: l.lesson_name,
      description: l.description,
      topic_id: l.topic_id,
      classroom_id: l.class_room_id,
      difficulty_level: l.difficulty_level,
      order_number: l.order_number,
      is_active: l.is_active,
    }));
  } catch (err) {
    throw {
      status: err.status || 500,
      message: err.message || "Error fetching lessons by classroom",
    };
  }
}

async function updateLesson(lessonId, data, userId) {
  try {
    if (!lessonId) {
      throw {
        status: 400,
        message: "Lesson ID is required",
      };
    }

    const { name } = data;

    let updateQuery = "UPDATE lesson SET ";
    const params = [];
    const fields = [];

    if (name !== undefined) {
      fields.push("lesson_name = ?");
      params.push(name);
    }
    if (data.class_room_id !== undefined || data.classroom_id !== undefined) {
      fields.push("class_room_id = ?");
      params.push(data.class_room_id || data.classroom_id);
    }
    if (data.content !== undefined) {
      fields.push("content = ?");
      params.push(data.content);
    }
    if (data.description !== undefined) {
      fields.push("description = ?");
      params.push(data.description);
    }
    if (data.topic_id !== undefined) {
      fields.push("topic_id = ?");
      params.push(data.topic_id);
    }
    if (data.image_location !== undefined) {
      fields.push("image_location = ?");
      params.push(data.image_location);
    }
    if (data.video_location !== undefined) {
      fields.push("video_location = ?");
      params.push(data.video_location);
    }
    if (data.difficulty_level !== undefined) {
      fields.push("difficulty_level = ?");
      params.push(data.difficulty_level);
    }
    if (data.order_number !== undefined) {
      fields.push("order_number = ?");
      params.push(data.order_number);
    }
    if (data.is_active !== undefined) {
      fields.push("is_active = ?");
      params.push(data.is_active);
    }

    if (fields.length === 0) {
      throw {
        status: 400,
        message: "No fields to update",
      };
    }

    fields.push("modified_date = NOW()");
    updateQuery += fields.join(", ") + " WHERE lesson_id = ?";
    params.push(lessonId);

    const [result] = await db.execute(updateQuery, params);

    if (result.affectedRows === 0) {
      throw {
        status: 404,
        message: "Lesson not found",
      };
    }

    return {
      id: lessonId,
      ...data,
      updated_at: new Date(),
    };
  } catch (err) {
    throw {
      status: err.status || 500,
      message: err.message || "Error updating lesson",
    };
  }
}

async function reorderLessons(topicId, lessons, userId) {
  try {
    if (!topicId || !Array.isArray(lessons) || lessons.length === 0) {
      throw {
        status: 400,
        message: "Topic ID and lessons array are required",
      };
    }

    for (const lesson of lessons) {
      const query =
        "UPDATE lesson SET order_number = ?, modified_date = NOW() WHERE lesson_id = ? AND topic_id = ?";
      await db.execute(query, [lesson.order_number, lesson.lesson_id, topicId]);
    }

    return {
      message: "Lessons reordered successfully",
      topicId,
      updatedCount: lessons.length,
    };
  } catch (err) {
    throw {
      status: err.status || 500,
      message: err.message || "Error reordering lessons",
    };
  }
}

async function deleteLesson(lessonId, userId) {
  try {
    if (!lessonId) {
      throw {
        status: 400,
        message: "Lesson ID is required",
      };
    }

    const query = "DELETE FROM lesson WHERE lesson_id = ?";
    const [result] = await db.execute(query, [lessonId]);

    if (result.affectedRows === 0) {
      throw {
        status: 404,
        message: "Lesson not found",
      };
    }

    return {
      message: "Lesson deleted successfully",
      id: lessonId,
    };
  } catch (err) {
    throw {
      status: err.status || 500,
      message: err.message || "Error deleting lesson",
    };
  }
}

async function deleteLessonsByTopicId(topicId, userId) {
  try {
    if (!topicId) {
      throw {
        status: 400,
        message: "Topic ID is required",
      };
    }

    const query = "DELETE FROM lesson WHERE topic_id = ?";
    const [result] = await db.execute(query, [topicId]);

    return {
      message: "Lessons deleted successfully",
      topicId,
      deletedCount: result.affectedRows,
    };
  } catch (err) {
    throw {
      status: err.status || 500,
      message: err.message || "Error deleting lessons",
    };
  }
}

async function getLessonStatistics(classroomId, topicId) {
  try {
    let query = "SELECT COUNT(*) as total FROM lesson WHERE 1=1";
    const params = [];

    if (classroomId) {
      query += " AND class_room_id = ?";
      params.push(classroomId);
    }

    if (topicId) {
      query += " AND topic_id = ?";
      params.push(topicId);
    }

    const [results] = await db.query(query, params);
    return results[0] || { total: 0, active: 0 };
  } catch (err) {
    throw {
      status: err.status || 500,
      message: err.message || "Error fetching lesson statistics",
    };
  }
}

module.exports = {
  createLesson,
  getLessons,
  getLessonById,
  getLessonsByTopicId,
  getLessonsByClassroomId,
  updateLesson,
  reorderLessons,
  deleteLesson,
  deleteLessonsByTopicId,
  getLessonStatistics,
};
