const db = require("../../../db");

/**
 * Service layer for classroom management.
 * Contains business logic for classroom operations.
 */

async function createClassroom(data, userId) {
  try {
    console.log("[Service] Data received:", data);
    const {
      name,
      description,
      organizationId,
      classLevel,
      status,
      classCode,
      teacherId,
      thumbnailPath,
    } = data;
    console.log("[Service] Destructured:", {
      name,
      organizationId,
      classLevel,
      status,
      classCode,
      teacherId,
      thumbnailPath,
    });

    if (!name || !organizationId) {
      console.error("[Service] Missing required fields");
      throw {
        status: 400,
        message: "Name (Content) and organizationId are required",
      };
    }

    // Map classLevel (e.g., "1" -> "Lớp 1")
    let dbClassLevel = `Lớp ${classLevel}`;
    const validLevels = ["Lớp 1", "Lớp 2", "Lớp 3", "Lớp 4", "Lớp 5"];
    if (!validLevels.includes(dbClassLevel)) {
      console.warn(
        `[Service] Invalid classLevel ${classLevel}, defaulting to 'Lớp 1'`,
      );
      if (parseInt(classLevel) >= 1 && parseInt(classLevel) <= 5) {
        dbClassLevel = `Lớp ${classLevel}`;
      } else {
        dbClassLevel = "Lớp 1"; // Safe default
      }
    }

    // Map status
    let dbStatus = "PENDING";
    if (status === "ACTIVE" || status === "ongoing") dbStatus = "APPROVED";
    else if (status === "REJECTED") dbStatus = "REJECTED";

    // Use 'content' column for class name as per schema
    // teacher_id will be updated after creating the class_teacher record
    const query = `
      INSERT INTO class_room (
        content, 
        description, 
        organization_id, 
        created_by, 
        class_level, 
        status, 
        class_code,
        teacher_id,
        thumbnail_path,
        created_date,
        is_active
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, NOW(), 1)
    `;

    const [result] = await db.query(query, [
      name, // Map name -> content
      description || null,
      organizationId,
      userId,
      dbClassLevel,
      dbStatus,
      classCode || `CODE-${Date.now()}`,
      // teacherId removed from values, hardcoded NULL in ID
      thumbnailPath || null,
    ]);

    const classroomId = result.insertId;

    // Sync with class_teacher table if teacherId is provided
    if (teacherId) {
      // Check if relation exists (just in case)
      const [existing] = await db.query(
        "SELECT * FROM class_teacher WHERE class_room_id = ? AND user_id = ?",
        [classroomId, teacherId],
      );

      let classTeacherId;

      if (existing.length === 0) {
        const [insertResult] = await db.query(
          "INSERT INTO class_teacher (class_room_id, user_id) VALUES (?, ?)",
          [classroomId, teacherId],
        );
        classTeacherId = insertResult.insertId;
      } else {
        // Assuming the table has a primary key usually named class_teacher_id or similar
        // If not found in existing object, we might need to query it specifically or assume 'id'
        // For now, let's assume class_teacher_id based on user request "class_teacher_id in table class_teacher"
        classTeacherId = existing[0].class_teacher_id || existing[0].id;
      }

      // Update class_room with the relational ID
      if (classTeacherId) {
        await db.query(
          "UPDATE class_room SET teacher_id = ? WHERE class_room_id = ?",
          [classTeacherId, classroomId],
        );
      }
    }

    return {
      id: classroomId,
      name, // return as name for frontend consistency
      description,
      organizationId,
      createdBy: userId,
      createdAt: new Date(),
    };
  } catch (err) {
    console.error("[CreateClassroom Service Error]", err);
    throw {
      status: err.status || 500,
      message: err.message || "Error creating classroom",
    };
  }
}

async function getClassrooms(query) {
  try {
    const {
      organizationId,
      organizationIds,
      teacherId,
      studentId,
      page = 1,
      limit = 1000,
    } = query;
    const offset = (page - 1) * limit;

    // Query with join to get organization info
    let sqlQuery = `
      SELECT 
        c.class_room_id as id,
        c.content as name,
        c.description,
        c.class_code as classCode,
        c.class_level as classLevel,
        c.status,
        c.thumbnail_path as thumbnailPath,
        c.organization_id as organizationId,
        ct.user_id as teacherId,
        c.created_by as createdBy,
        c.created_date as createdAt,
        c.is_active as isActive,
        o.name as organizationName,
        o.type as organizationType
      FROM class_room c
      LEFT JOIN organization o ON c.organization_id = o.organization_id
      LEFT JOIN class_teacher ct ON c.class_room_id = ct.class_room_id
      WHERE 1=1
    `;
    const params = [];
    let countQuery = `SELECT COUNT(*) as total FROM class_room c LEFT JOIN class_teacher ct ON c.class_room_id = ct.class_room_id WHERE 1=1`;
    const countParams = [];

    // Filter by organizationId if provided (single)
    if (organizationId) {
      sqlQuery += " AND c.organization_id = ?";
      params.push(organizationId);
      countQuery += " AND c.organization_id = ?";
      countParams.push(organizationId);
    }

    // Filter by organizationIds if provided (multiple - comma separated or array)
    if (organizationIds) {
      let orgIdsArray = Array.isArray(organizationIds)
        ? organizationIds.map((id) => parseInt(id))
        : organizationIds.split(",").map((id) => parseInt(id.trim()));

      if (orgIdsArray.length > 0) {
        const placeholders = orgIdsArray.map(() => "?").join(",");
        sqlQuery += ` AND c.organization_id IN (${placeholders})`;
        params.push(...orgIdsArray);
        countQuery += ` AND c.organization_id IN (${placeholders})`;
        countParams.push(...orgIdsArray);
      }
    }

    // Filter by teacherId if provided
    if (teacherId) {
      sqlQuery += " AND ct.user_id = ?";
      params.push(parseInt(teacherId));
      countQuery += " AND ct.user_id = ?";
      countParams.push(parseInt(teacherId));
    }

    // Filter by studentId if provided
    if (studentId) {
      sqlQuery +=
        " AND c.class_room_id IN (SELECT class_room_id FROM class_student WHERE user_id = ?)";
      params.push(parseInt(studentId));
      countQuery +=
        " AND c.class_room_id IN (SELECT class_room_id FROM class_student WHERE user_id = ?)";
      countParams.push(parseInt(studentId));
    }

    const [countRows] = await db.query(countQuery, countParams);
    const totalResult = countRows[0]?.total || 0;

    sqlQuery += ` LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

    const [classrooms] = await db.query(sqlQuery, params);

    return {
      data: classrooms,
      page: parseInt(page),
      limit: parseInt(limit),
      total: totalResult,
    };
  } catch (err) {
    throw {
      status: err.status || 500,
      message: err.message || "Error fetching classrooms",
    };
  }
}

async function getClassroomById(classroomId) {
  try {
    if (!classroomId) {
      throw {
        status: 400,
        message: "Classroom ID is required",
      };
    }

    const query = `
      SELECT 
        c.class_room_id as id,
        c.content as name,
        c.description,
        c.class_code as classCode,
        c.class_level as classLevel,
        c.status,
        c.thumbnail_path as thumbnailPath,
        c.organization_id as organizationId,
        ct.user_id as teacherId,
        c.created_by as createdBy,
        c.created_date as createdAt,
        c.is_active as isActive,
        o.name as organizationName,
        o.type as organizationType
      FROM class_room c
      LEFT JOIN organization o ON c.organization_id = o.organization_id
      LEFT JOIN class_teacher ct ON c.class_room_id = ct.class_room_id
      WHERE c.class_room_id = ?
    `;

    const [results] = await db.query(query, [classroomId]);

    if (results.length === 0) {
      throw {
        status: 404,
        message: "Classroom not found",
      };
    }

    return results[0];
  } catch (err) {
    throw {
      status: err.status || 500,
      message: err.message || "Error fetching classroom",
    };
  }
}

async function updateClassroom(classroomId, data, userId) {
  try {
    if (!classroomId) {
      throw {
        status: 400,
        message: "Classroom ID is required",
      };
    }

    // Explicitly destructure allow-listed fields again to be safe
    const {
      name,
      description,
      classCode,
      classLevel,
      status,
      teacherId,
      organizationId,
      thumbnailPath,
    } = data;

    let updateQuery = "UPDATE class_room SET ";
    const params = [];
    const fields = [];

    if (name !== undefined) {
      fields.push("content = ?");
      params.push(name);
    }

    if (description !== undefined) {
      fields.push("description = ?");
      params.push(description);
    }

    if (classCode !== undefined) {
      fields.push("class_code = ?");
      params.push(classCode);
    }

    if (classLevel !== undefined) {
      // Map classLevel if needed
      let dbClassLevel = classLevel;
      // Simple validation/mapping logic similar to create can be added here if strict
      if (!String(classLevel).startsWith("Lớp")) {
        dbClassLevel = `Lớp ${classLevel}`;
      }
      fields.push("class_level = ?");
      params.push(dbClassLevel);
    }

    if (status !== undefined) {
      let dbStatus = status;
      // Strict mapping to DB ENUM values (typically APPROVED, PENDING, REJECTED)
      if (
        status === "ACTIVE" ||
        status === "ongoing" ||
        status === "completed"
      ) {
        dbStatus = "APPROVED";
      } else if (status === "INACTIVE" || status === "upcoming") {
        dbStatus = "PENDING";
      } else if (status === "REJECTED") {
        dbStatus = "REJECTED";
      } else if (!["APPROVED", "PENDING", "REJECTED"].includes(status)) {
        // Fallback for unknown statuses
        dbStatus = "PENDING";
      }
      fields.push("status = ?");
      params.push(dbStatus);
    }

    // Handle teacher update separately to ensure relation exists
    let newClassTeacherId = null;
    if (teacherId !== undefined) {
      // Manage Relation Table
      // 1. Delete existing relation for this classroom
      await db.query("DELETE FROM class_teacher WHERE class_room_id = ?", [
        classroomId,
      ]);

      // 2. Insert new relation if teacherId is valid
      if (teacherId) {
        const [insertResult] = await db.query(
          "INSERT INTO class_teacher (class_room_id, user_id) VALUES (?, ?)",
          [classroomId, teacherId],
        );
        newClassTeacherId = insertResult.insertId;
      }

      // Update the teacher_id field in class_room with the PK from class_teacher
      fields.push("teacher_id = ?");
      params.push(newClassTeacherId); // null if teacherId was falsy (removed)
    }

    if (organizationId !== undefined) {
      fields.push("organization_id = ?");
      params.push(organizationId);
    }

    if (thumbnailPath !== undefined) {
      fields.push("thumbnail_path = ?");
      params.push(thumbnailPath);
    }

    if (fields.length === 0) {
      throw {
        status: 400,
        message: "No fields to update",
      };
    }

    fields.push("updated_at = NOW()");
    updateQuery += fields.join(", ") + " WHERE class_room_id = ?";
    params.push(classroomId);

    const [result] = await db.query(updateQuery, params);

    if (result.affectedRows === 0) {
      throw {
        status: 404,
        message: "Classroom not found",
      };
    }

    return {
      id: classroomId,
      ...data,
      updatedAt: new Date(),
    };
  } catch (err) {
    throw {
      status: err.status || 500,
      message: err.message || "Error updating classroom",
    };
  }
}

async function deleteClassroom(classroomId, userId) {
  try {
    if (!classroomId) {
      throw {
        status: 400,
        message: "Classroom ID is required",
      };
    }

    // Optional: Delete relations first (though FK constraints might handle CASCADE)
    await db.query("DELETE FROM class_teacher WHERE class_room_id = ?", [
      classroomId,
    ]);
    await db.query("DELETE FROM class_student WHERE class_room_id = ?", [
      classroomId,
    ]);

    const query = "DELETE FROM class_room WHERE class_room_id = ?";
    const [result] = await db.query(query, [classroomId]);

    if (result.affectedRows === 0) {
      throw {
        status: 404,
        message: "Classroom not found",
      };
    }

    return {
      message: "Classroom deleted successfully",
      id: classroomId,
    };
  } catch (err) {
    throw {
      status: err.status || 500,
      message: err.message || "Error deleting classroom",
    };
  }
}

async function addStudentToClassroom(classroomId, studentId, userId) {
  try {
    if (!classroomId || !studentId) {
      throw {
        status: 400,
        message: "Classroom ID and Student ID are required",
      };
    }

    // Check if student already in classroom
    const checkQuery =
      "SELECT * FROM class_student WHERE class_room_id = ? AND user_id = ?";
    const [results] = await db.query(checkQuery, [classroomId, studentId]);

    if (results.length > 0) {
      throw {
        status: 400,
        message: "Student already in classroom",
      };
    }

    // NEW: Check if student belongs to the same organization as the class
    // 1. Get classroom organization
    const [classRows] = await db.query(
      "SELECT organization_id FROM class_room WHERE class_room_id = ?",
      [classroomId],
    );
    const classOrgId = classRows[0]?.organization_id;

    // 2. Get student organization (from organization_manager)
    const [studentRows] = await db.query(
      "SELECT organization_id FROM organization_manager WHERE user_id = ? ORDER BY is_primary DESC, id DESC LIMIT 1",
      [studentId],
    );
    const studentOrgId = studentRows[0]?.organization_id;

    // 3. Enforce match if class belongs to an organization
    if (classOrgId && studentOrgId && Number(classOrgId) !== Number(studentOrgId)) {
      throw {
        status: 400,
        message:
          "Học sinh không thuộc cùng trường với lớp học này. Chỉ có thể thêm học sinh trong cùng trường.",
      };
    }

    const insertQuery = `
      INSERT INTO class_student (class_room_id, user_id)
      VALUES (?, ?)
    `;
    await db.query(insertQuery, [classroomId, studentId]);

    return {
      message: "Student added to classroom",
      classroomId,
      studentId,
    };
  } catch (err) {
    throw {
      status: err.status || 500,
      message: err.message || "Error adding student to classroom",
    };
  }
}

async function removeStudentFromClassroom(classroomId, studentId, userId) {
  try {
    if (!classroomId || !studentId) {
      throw {
        status: 400,
        message: "Classroom ID and Student ID are required",
      };
    }

    const query =
      "DELETE FROM class_student WHERE class_room_id = ? AND user_id = ?";

    const [result] = await db.query(query, [classroomId, studentId]);

    if (result.affectedRows === 0) {
      throw {
        status: 404,
        message: "Student not found in classroom",
      };
    }

    return {
      message: "Student removed from classroom",
      classroomId,
      studentId,
    };
  } catch (err) {
    throw {
      status: err.status || 500,
      message: err.message || "Error removing student from classroom",
    };
  }
}

async function getClassroomStudents(classroomId, query) {
  try {
    if (!classroomId) {
      throw {
        status: 400,
        message: "Classroom ID is required",
      };
    }

    const { page = 1, limit = 10 } = query;
    const offset = (page - 1) * limit;

    const sqlQuery = `
      SELECT u.* FROM user u
      INNER JOIN class_student cs ON u.user_id = cs.user_id
      WHERE cs.class_room_id = ?
      LIMIT ? OFFSET ?
    `;

    // Must map limits to integers for mysql2
    const [students] = await db.query(sqlQuery, [
      classroomId,
      parseInt(limit),
      parseInt(offset),
    ]);

    return {
      data: students,
      classroomId,
      page,
      limit,
      total: students.length, // approximate if not counting
    };
  } catch (err) {
    throw {
      status: err.status || 500,
      message: err.message || "Error fetching classroom students",
    };
  }
}
/**
 * Get classes for the currently logged-in user
 * - Teachers: Get classes they teach
 * - Students: Get classes they're enrolled in
 */
async function getMyClasses(userId, userRole) {
  try {
    if (!userId) {
      throw {
        status: 400,
        message: "User ID is required",
      };
    }

    let sqlQuery = `
      SELECT 
        c.class_room_id as id,
        c.content as name,
        c.description,
        c.class_code as classCode,
        c.class_level as classLevel,
        c.status,
        c.thumbnail_path as thumbnailPath,
        c.organization_id as organizationId,
        ct.user_id as teacherId,
        c.created_by as createdBy,
        c.created_date as createdAt,
        c.is_active as isActive,
        o.name as organizationName,
        o.type as organizationType
      FROM class_room c
      LEFT JOIN organization o ON c.organization_id = o.organization_id
      LEFT JOIN class_teacher ct ON c.class_room_id = ct.class_room_id
    `;

    const params = [];

    // Filter based on user role
    if (userRole === "TEACHER") {
      // Teachers get classes they teach
      sqlQuery += " WHERE ct.user_id = ?";
      params.push(userId);
    } else {
      // Students get classes they're enrolled in
      sqlQuery +=
        " WHERE c.class_room_id IN (SELECT class_room_id FROM class_student WHERE user_id = ?)";
      params.push(userId);
    }

    sqlQuery += " ORDER BY c.created_date DESC";

    const [classrooms] = await db.query(sqlQuery, params);

    return {
      data: classrooms,
      total: classrooms.length,
    };
  } catch (err) {
    throw {
      status: err.status || 500,
      message: err.message || "Error fetching user classes",
    };
  }
}

module.exports = {
  createClassroom,
  getClassrooms,
  getClassroomById,
  updateClassroom,
  deleteClassroom,
  addStudentToClassroom,
  removeStudentFromClassroom,
  getClassroomStudents,
  getMyClasses,
};
