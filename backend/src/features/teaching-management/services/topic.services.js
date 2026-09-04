const db = require("../../../db");

let classroomTopicSchemaPromise;
let topicVocabularySchemaPromise;

async function ensureClassroomTopicSchema() {
  if (!classroomTopicSchemaPromise) {
    classroomTopicSchemaPromise = (async () => {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS classroom_topic (
          classroom_topic_id BIGINT NOT NULL AUTO_INCREMENT,
          classroom_id BIGINT NOT NULL,
          topic_id BIGINT NOT NULL,
          assigned_by BIGINT DEFAULT NULL,
          assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          is_active TINYINT(1) NOT NULL DEFAULT 1,
          PRIMARY KEY (classroom_topic_id),
          UNIQUE KEY uq_classroom_topic (classroom_id, topic_id),
          KEY idx_classroom_topic_topic (topic_id),
          KEY idx_classroom_topic_assigned_by (assigned_by)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);

      await db.execute(`
        INSERT INTO classroom_topic (classroom_id, topic_id, assigned_by, is_active)
        SELECT class_room_id, topic_id, created_id, 1
        FROM topic
        WHERE class_room_id IS NOT NULL
        ON DUPLICATE KEY UPDATE is_active = VALUES(is_active)
      `);
    })().catch((error) => {
      classroomTopicSchemaPromise = null;
      throw error;
    });
  }

  return classroomTopicSchemaPromise;
}

async function ensureTopicVocabularySchema() {
  if (!topicVocabularySchemaPromise) {
    topicVocabularySchemaPromise = (async () => {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS topic_vocabulary (
          topic_vocabulary_id BIGINT NOT NULL AUTO_INCREMENT,
          topic_id BIGINT NOT NULL,
          vocabulary_id BIGINT NOT NULL,
          added_by BIGINT DEFAULT NULL,
          added_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (topic_vocabulary_id),
          UNIQUE KEY uq_topic_vocabulary (topic_id, vocabulary_id),
          KEY idx_topic_vocabulary_vocabulary (vocabulary_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);

      await db.execute(`
        INSERT INTO topic_vocabulary (topic_id, vocabulary_id, added_by)
        SELECT topic_id, vocabulary_id, created_id
        FROM vocabulary
        WHERE topic_id IS NOT NULL AND status = 'APPROVED'
        ON DUPLICATE KEY UPDATE topic_id = VALUES(topic_id)
      `);
    })().catch((error) => {
      topicVocabularySchemaPromise = null;
      throw error;
    });
  }

  return topicVocabularySchemaPromise;
}

async function isGlobalAdmin(userId) {
  const [rows] = await db.execute(
    "SELECT code FROM `user` WHERE user_id = ? LIMIT 1",
    [userId],
  );
  return ["ADMIN", "SUPER_ADMIN", "TEST"].includes(rows[0]?.code);
}

async function assertCanManageClassroom(userId, classroomId) {
  if (await isGlobalAdmin(userId)) return;

  const [rows] = await db.execute(
    `SELECT 1
     FROM class_room c
     LEFT JOIN class_teacher ct ON ct.class_room_id = c.class_room_id
     LEFT JOIN organization_manager om
       ON om.organization_id = c.organization_id AND om.user_id = ?
     WHERE c.class_room_id = ?
       AND (
         ct.user_id = ? OR
         om.role_in_org IN ('CENTER_ADMIN', 'SCHOOL_ADMIN', 'FACILITY_MANAGER')
       )
     LIMIT 1`,
    [userId, classroomId, userId],
  );

  if (rows.length === 0) {
    throw { status: 403, message: "Bạn không phụ trách lớp học này" };
  }
}

async function assertCanViewClassroom(userId, classroomId) {
  if (await isGlobalAdmin(userId)) return;

  const [rows] = await db.execute(
    `SELECT 1
     FROM class_room c
     LEFT JOIN class_teacher ct ON ct.class_room_id = c.class_room_id
     LEFT JOIN class_student cs ON cs.class_room_id = c.class_room_id
     LEFT JOIN organization_manager om
       ON om.organization_id = c.organization_id AND om.user_id = ?
     WHERE c.class_room_id = ?
       AND (
         ct.user_id = ? OR
         cs.user_id = ? OR
         om.role_in_org IN ('CENTER_ADMIN', 'SCHOOL_ADMIN', 'FACILITY_MANAGER')
       )
     LIMIT 1`,
    [userId, classroomId, userId, userId],
  );

  if (rows.length === 0) {
    throw { status: 403, message: "Bạn không thuộc lớp học này" };
  }
}

async function assertCanManageTopic(userId, topicId) {
  if (await isGlobalAdmin(userId)) return;

  const [rows] = await db.execute(
    `SELECT 1
     FROM topic t
     LEFT JOIN \`user\` u ON u.user_id = ?
     WHERE t.topic_id = ?
       AND (t.created_id = ? OR (t.created_id IS NULL AND t.created_by = u.email))
     LIMIT 1`,
    [userId, topicId, userId],
  );

  if (rows.length === 0) {
    throw { status: 403, message: "Bạn không có quyền quản lý chủ đề này" };
  }
}

/**
 * Service layer for topic management.
 * Aligned with verified database schema: topic table (topic_id, content, class_room_id, etc.)
 */

async function createTopic(
  name,
  classroomId,
  imageLocation,
  description,
  creatorId,
  isCommon,
) {
  try {
    await ensureClassroomTopicSchema();
    if (!name) {
      throw {
        status: 400,
        message: "Topic name is required",
      };
    }

    if (classroomId && creatorId) {
      await assertCanManageClassroom(creatorId, classroomId);
    }

    const query = `
      INSERT INTO topic (content, class_room_id, image_location, description, created_id, is_private, created_date, modified_date)
      VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    const [result] = await db.execute(query, [
      name,
      classroomId || null,
      imageLocation || null,
      description || null,
      creatorId || null,
      isCommon ? 0 : 1, // is_private is bit(1), if common then is_private=0
    ]);

    if (classroomId) {
      await db.execute(
        `INSERT INTO classroom_topic (classroom_id, topic_id, assigned_by, is_active)
         VALUES (?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE assigned_by = VALUES(assigned_by), is_active = 1`,
        [classroomId, result.insertId, creatorId || null],
      );
    }

    return {
      id: result.insertId,
      name,
      classroom_id: classroomId,
      image_location: imageLocation,
      description,
      creator_id: creatorId,
      is_common: isCommon ? 1 : 0,
      created_at: new Date(),
    };
  } catch (err) {
    throw {
      status: err.status || 500,
      message: err.message || "Error creating topic",
    };
  }
}

async function getTopics(limit, offset, classroomId, creatorId, isCommon) {
  try {
    let whereClause = " WHERE 1=1";
    const params = [];

    if (classroomId) {
      whereClause += " AND class_room_id = ?";
      params.push(classroomId);
    }

    if (creatorId) {
      whereClause += " AND created_id = ?";
      params.push(creatorId);
    }

    if (isCommon !== null && isCommon !== undefined) {
      whereClause += " AND is_private = ?";
      params.push(isCommon ? 0 : 1);
    }

    const countQuery = "SELECT COUNT(*) as count FROM topic" + whereClause;

    const [countResults] = await db.execute(countQuery, params);
    const total = countResults[0].count;

    const query = `SELECT topic_id as id, content as name, class_room_id as classroom_id, image_location, description, is_private 
                   FROM topic ${whereClause} LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

    const [data] = await db.execute(query, params);

    return {
      data,
      total,
      limit,
      offset,
    };
  } catch (err) {
    throw {
      status: err.status || 500,
      message: err.message || "Error fetching topics",
    };
  }
}

async function getTopicById(topicId) {
  try {
    if (!topicId) {
      throw {
        status: 400,
        message: "Topic ID is required",
      };
    }

    const query =
      "SELECT topic_id as id, content as name, class_room_id as classroom_id, description, image_location FROM topic WHERE topic_id = ?";
    const [results] = await db.execute(query, [topicId]);

    if (results.length === 0) {
      throw {
        status: 404,
        message: "Topic not found",
      };
    }

    return results[0];
  } catch (err) {
    throw {
      status: err.status || 500,
      message: err.message || "Error fetching topic",
    };
  }
}

async function getTopicsByClassroom(classroomId, limit, offset, viewerId) {
  try {
    await Promise.all([
      ensureClassroomTopicSchema(),
      ensureTopicVocabularySchema(),
    ]);
    if (!classroomId) {
      throw {
        status: 400,
        message: "Classroom ID is required",
      };
    }

    if (viewerId) {
      await assertCanViewClassroom(viewerId, classroomId);
    }

    const countQuery = `
      SELECT COUNT(DISTINCT t.topic_id) as count
      FROM topic t
      INNER JOIN classroom_topic ct ON ct.topic_id = t.topic_id
      WHERE ct.classroom_id = ? AND ct.is_active = 1 AND COALESCE(t.is_active, 1) = 1
    `;
    const [countResults] = await db.execute(countQuery, [classroomId]);
    const total = countResults[0].count;

    const query = `
      SELECT t.topic_id as id, t.content as name, ct.classroom_id,
             t.description, t.image_location, t.created_id as creator_id,
             (SELECT COUNT(*)
              FROM topic_vocabulary tv
              INNER JOIN vocabulary v ON v.vocabulary_id = tv.vocabulary_id
              WHERE tv.topic_id = t.topic_id AND v.status = 'APPROVED') as vocabulary_count
      FROM topic t
      INNER JOIN classroom_topic ct ON ct.topic_id = t.topic_id
      WHERE ct.classroom_id = ? AND ct.is_active = 1 AND COALESCE(t.is_active, 1) = 1
      ORDER BY ct.assigned_at DESC, t.topic_id DESC
      LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
    `;
    const [data] = await db.execute(query, [classroomId]);

    return {
      data,
      total,
      limit,
      offset,
    };
  } catch (err) {
    throw {
      status: err.status || 500,
      message: err.message || "Error fetching topics by classroom",
    };
  }
}

async function getTopicsByOwner(userId, limit = 1000, offset = 0) {
  try {
    await Promise.all([
      ensureClassroomTopicSchema(),
      ensureTopicVocabularySchema(),
    ]);
    const admin = await isGlobalAdmin(userId);
    const ownerClause = admin
      ? ""
      : "AND (t.created_id = ? OR (t.created_id IS NULL AND t.created_by = u.email))";
    const params = admin ? [] : [userId, userId];

    const [countRows] = await db.execute(
      `SELECT COUNT(*) as count
       FROM topic t
       LEFT JOIN \`user\` u ON u.user_id = ?
       WHERE COALESCE(t.is_active, 1) = 1 ${ownerClause}`,
      admin ? [userId] : params,
    );

    const [data] = await db.execute(
      `SELECT t.topic_id as id, t.content as name, t.description,
              t.image_location, t.created_id as creator_id,
              COUNT(DISTINCT ct.classroom_id) as classroom_count,
              (SELECT COUNT(*)
               FROM topic_vocabulary tv
               INNER JOIN vocabulary v ON v.vocabulary_id = tv.vocabulary_id
               WHERE tv.topic_id = t.topic_id AND v.status = 'APPROVED') as vocabulary_count
       FROM topic t
       LEFT JOIN \`user\` u ON u.user_id = ?
       LEFT JOIN classroom_topic ct
         ON ct.topic_id = t.topic_id AND ct.is_active = 1
       WHERE COALESCE(t.is_active, 1) = 1 ${ownerClause}
       GROUP BY t.topic_id, t.content, t.description, t.image_location, t.created_id
       ORDER BY t.modified_date DESC, t.topic_id DESC
       LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`,
      admin ? [userId] : params,
    );

    return { data, total: countRows[0]?.count || 0, limit, offset };
  } catch (err) {
    throw { status: err.status || 500, message: err.message || "Error fetching owned topics" };
  }
}

async function getAvailableTopicsForClassroom(userId, classroomId) {
  try {
    await ensureClassroomTopicSchema();
    await assertCanManageClassroom(userId, classroomId);
    const owned = await getTopicsByOwner(userId, 10000, 0);
    const [assignedRows] = await db.execute(
      "SELECT topic_id FROM classroom_topic WHERE classroom_id = ? AND is_active = 1",
      [classroomId],
    );
    const assignedIds = new Set(assignedRows.map((row) => Number(row.topic_id)));
    return owned.data.filter((topic) => !assignedIds.has(Number(topic.id)));
  } catch (err) {
    throw { status: err.status || 500, message: err.message || "Error fetching available topics" };
  }
}

async function assignTopicsToClassroom(userId, classroomId, topicIds) {
  try {
    await ensureClassroomTopicSchema();
    await assertCanManageClassroom(userId, classroomId);

    const uniqueTopicIds = [...new Set((topicIds || []).map(Number).filter(Boolean))];
    if (uniqueTopicIds.length === 0) {
      throw { status: 400, message: "Vui lòng chọn ít nhất một chủ đề" };
    }

    for (const topicId of uniqueTopicIds) {
      await assertCanManageTopic(userId, topicId);
      await db.execute(
        `INSERT INTO classroom_topic (classroom_id, topic_id, assigned_by, is_active)
         VALUES (?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE assigned_by = VALUES(assigned_by), assigned_at = NOW(), is_active = 1`,
        [classroomId, topicId, userId],
      );
    }

    return getTopicsByClassroom(classroomId, 10000, 0);
  } catch (err) {
    throw { status: err.status || 500, message: err.message || "Error assigning topics" };
  }
}

async function removeTopicFromClassroom(userId, classroomId, topicId) {
  try {
    await ensureClassroomTopicSchema();
    await assertCanManageClassroom(userId, classroomId);
    const [result] = await db.execute(
      "DELETE FROM classroom_topic WHERE classroom_id = ? AND topic_id = ?",
      [classroomId, topicId],
    );
    if (result.affectedRows === 0) {
      throw { status: 404, message: "Chủ đề chưa được gán vào lớp này" };
    }
    return { classroom_id: classroomId, topic_id: topicId };
  } catch (err) {
    throw { status: err.status || 500, message: err.message || "Error removing topic" };
  }
}

async function getTopicVocabularies(topicId) {
  try {
    await ensureTopicVocabularySchema();
    const [rows] = await db.execute(
      `SELECT v.vocabulary_id as id, v.content as word,
              v.description, v.vocabulary_type, v.status,
              (SELECT vi.image_location
               FROM vocabulary_image vi
               WHERE vi.vocabulary_id = v.vocabulary_id
               ORDER BY vi.is_primary DESC, vi.vocabulary_image_id ASC
               LIMIT 1) as image_url,
              (SELECT vv.video_location
               FROM vocabulary_video vv
               WHERE vv.vocabulary_id = v.vocabulary_id
               ORDER BY vv.is_primary DESC, vv.vocabulary_video_id ASC
               LIMIT 1) as video_url
       FROM topic_vocabulary tv
       INNER JOIN vocabulary v ON v.vocabulary_id = tv.vocabulary_id
       WHERE tv.topic_id = ? AND v.status = 'APPROVED'
       ORDER BY tv.added_at ASC, v.content ASC`,
      [topicId],
    );
    return rows;
  } catch (err) {
    throw {
      status: err.status || 500,
      message: err.message || "Error fetching topic vocabularies",
    };
  }
}

async function replaceTopicVocabularies(userId, topicId, vocabularyIds) {
  let connection;
  try {
    await ensureTopicVocabularySchema();
    await assertCanManageTopic(userId, topicId);

    const ids = [...new Set((vocabularyIds || []).map(Number).filter(Boolean))];
    connection = await db.getConnection();
    await connection.beginTransaction();

    if (ids.length > 0) {
      const placeholders = ids.map(() => "?").join(",");
      const [validRows] = await connection.execute(
        `SELECT vocabulary_id
         FROM vocabulary
         WHERE vocabulary_id IN (${placeholders}) AND status = 'APPROVED'`,
        ids,
      );
      if (validRows.length !== ids.length) {
        throw {
          status: 400,
          message: "Một số từ vựng không tồn tại hoặc chưa được duyệt",
        };
      }
    }

    await connection.execute(
      "DELETE FROM topic_vocabulary WHERE topic_id = ?",
      [topicId],
    );

    for (const vocabularyId of ids) {
      await connection.execute(
        `INSERT INTO topic_vocabulary (topic_id, vocabulary_id, added_by)
         VALUES (?, ?, ?)`,
        [topicId, vocabularyId, userId],
      );
    }

    await connection.commit();
    return getTopicVocabularies(topicId);
  } catch (err) {
    if (connection) await connection.rollback();
    throw {
      status: err.status || 500,
      message: err.message || "Error updating topic vocabularies",
    };
  } finally {
    if (connection) connection.release();
  }
}

async function getTopicsByCreator(creatorId, limit, offset) {
  try {
    if (!creatorId) {
      throw {
        status: 400,
        message: "Creator ID is required",
      };
    }

    const countQuery =
      "SELECT COUNT(*) as count FROM topic WHERE created_id = ?";
    const [countResults] = await db.execute(countQuery, [creatorId]);
    const total = countResults[0].count;

    const query = `SELECT topic_id as id, content as name, class_room_id as classroom_id, description, image_location 
                   FROM topic WHERE created_id = ? LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
    const [data] = await db.execute(query, [creatorId]);

    return {
      data,
      total,
      limit,
      offset,
    };
  } catch (err) {
    throw {
      status: err.status || 500,
      message: err.message || "Error fetching topics by creator",
    };
  }
}

async function searchTopicsByName(name, limit, offset) {
  try {
    if (!name) {
      throw {
        status: 400,
        message: "Search name is required",
      };
    }

    const searchTerm = `%${name}%`;
    const countQuery =
      "SELECT COUNT(*) as count FROM topic WHERE content LIKE ?";
    const [countResults] = await db.execute(countQuery, [searchTerm]);
    const total = countResults[0].count;

    const query = `SELECT topic_id as id, content as name, class_room_id as classroom_id, description, image_location 
                   FROM topic WHERE content LIKE ? LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
    const [data] = await db.execute(query, [searchTerm]);

    return {
      data,
      total,
      limit,
      offset,
    };
  } catch (err) {
    throw {
      status: err.status || 500,
      message: err.message || "Error searching topics",
    };
  }
}

async function updateTopic(topicId, updates, userId) {
  try {
    await assertCanManageTopic(userId, topicId);
    if (!topicId) {
      throw {
        status: 400,
        message: "Topic ID is required",
      };
    }

    if (Object.keys(updates).length === 0) {
      throw {
        status: 400,
        message: "No fields to update",
      };
    }

    let query = "UPDATE topic SET ";
    const params = [];
    const fields = [];

    if (updates.name !== undefined) {
      fields.push("content = ?");
      params.push(updates.name);
    }

    if (updates.description !== undefined) {
      fields.push("description = ?");
      params.push(updates.description);
    }

    if (updates.image_location !== undefined) {
      fields.push("image_location = ?");
      params.push(updates.image_location);
    }

    if (updates.is_common !== undefined) {
      fields.push("is_private = ?");
      params.push(updates.is_common ? 0 : 1);
    }

    if (fields.length === 0) {
      throw {
        status: 400,
        message: "No valid fields to update",
      };
    }

    fields.push("modified_date = NOW()");
    query += fields.join(", ") + " WHERE topic_id = ?";
    params.push(topicId);

    const [result] = await db.execute(query, params);

    if (result.affectedRows === 0) {
      throw {
        status: 404,
        message: "Topic not found",
      };
    }

    return {
      id: topicId,
      ...updates,
      updated_at: new Date(),
    };
  } catch (err) {
    throw {
      status: err.status || 500,
      message: err.message || "Error updating topic",
    };
  }
}

async function deleteTopic(topicId, userId) {
  try {
    await Promise.all([
      ensureClassroomTopicSchema(),
      ensureTopicVocabularySchema(),
    ]);
    await assertCanManageTopic(userId, topicId);
    if (!topicId) {
      throw {
        status: 400,
        message: "Topic ID is required",
      };
    }

    await db.execute("DELETE FROM classroom_topic WHERE topic_id = ?", [topicId]);
    await db.execute("DELETE FROM topic_vocabulary WHERE topic_id = ?", [topicId]);
    const query = "UPDATE topic SET is_active = 0, modified_date = NOW() WHERE topic_id = ?";
    const [result] = await db.execute(query, [topicId]);

    if (result.affectedRows === 0) {
      throw {
        status: 404,
        message: "Topic not found",
      };
    }

    return {
      message: "Topic deleted successfully",
      id: topicId,
    };
  } catch (err) {
    throw {
      status: err.status || 500,
      message: err.message || "Error deleting topic",
    };
  }
}

async function deleteTopicsByClassroom(classroomId) {
  try {
    if (!classroomId) {
      throw {
        status: 400,
        message: "Classroom ID is required",
      };
    }

    const query = "DELETE FROM topic WHERE class_room_id = ?";
    const [result] = await db.execute(query, [classroomId]);

    return {
      message: "Topics deleted successfully",
      classroom_id: classroomId,
      deletedCount: result.affectedRows,
    };
  } catch (err) {
    throw {
      status: err.status || 500,
      message: err.message || "Error deleting topics",
    };
  }
}

async function getTopicStatistics(classroomId) {
  try {
    let query = "SELECT COUNT(*) as total FROM topic WHERE 1=1";
    const params = [];

    if (classroomId) {
      query += " AND class_room_id = ?";
      params.push(classroomId);
    }

    const [statsResults] = await db.execute(query, params);
    return statsResults[0] || { total: 0 };
  } catch (err) {
    throw {
      status: err.status || 500,
      message: err.message || "Error fetching topic statistics",
    };
  }
}

module.exports = {
  assertCanViewClassroom,
  ensureTopicVocabularySchema,
  createTopic,
  getTopics,
  getTopicById,
  getTopicsByClassroom,
  getTopicsByCreator,
  getTopicsByOwner,
  getAvailableTopicsForClassroom,
  assignTopicsToClassroom,
  removeTopicFromClassroom,
  getTopicVocabularies,
  replaceTopicVocabularies,
  searchTopicsByName,
  updateTopic,
  deleteTopic,
  deleteTopicsByClassroom,
  getTopicStatistics,
};
