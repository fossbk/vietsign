const db = require("../db");

const VALID_ROLE_CODES = new Set([
  "SUPER_ADMIN",
  "ADMIN",
  "CENTER_ADMIN",
  "SCHOOL_ADMIN",
  "FACILITY_MANAGER",
  "TEACHER",
  "STUDENT",
  "PARENT",
  "USER",
  "TESTER",
]);

const toNullableGrade = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const grade = Number(value);
  if (!Number.isInteger(grade) || grade < 1 || grade > 5) {
    const err = new Error("Grade must be an integer from 1 to 5");
    err.status = 400;
    throw err;
  }
  return grade;
};

const ensureRoleExists = async (roleCode) => {
  if (!VALID_ROLE_CODES.has(roleCode)) {
    const err = new Error("Invalid role");
    err.status = 400;
    throw err;
  }

  if (roleCode === "PARENT") {
    await db.query(
      `INSERT IGNORE INTO role (code, description, name)
       VALUES ('PARENT', 'Phu huynh hoc sinh', 'Phu huynh')`,
    );
  }
};

const getClassroomForTeacher = async (classroomId, teacherId) => {
  if (!classroomId) return null;

  const [rows] = await db.query(
    `
      SELECT c.class_room_id, c.organization_id
      FROM class_room c
      LEFT JOIN class_teacher ct ON c.class_room_id = ct.class_room_id
      WHERE c.class_room_id = ?
        AND (? IS NULL OR ct.user_id = ? OR c.created_by = ?)
      LIMIT 1
    `,
    [classroomId, teacherId || null, teacherId || null, String(teacherId || "")],
  );

  return rows[0] || null;
};

const normalizeStudentPayload = (payload) => {
  const source = payload || {};
  return {
    name: source.name || source.fullName || source.full_name,
    email: source.email,
    phoneNumber: source.phoneNumber || source.phone_number || source.phone,
    password: source.password,
    birthDay: source.birthDay || source.birth_day,
    address: source.address,
    grade: source.grade || source.classGrade || source.class_grade,
    organizationId:
      source.organization_id || source.organizationId || source.schoolId || null,
    classRoomName: source.classRoomName || source.class_room_name,
    schoolName: source.schoolName,
    classroomId: source.classroomId || source.class_room_id || null,
  };
};

/**
 * Service layer for teacher management.
 * Functions throw Error with optional `status` property for HTTP handling.
 */

async function createTeacher(payload, createdBy) {
  try {
    const {
      name,
      birthDay,
      address,
      classRoomName,
      schoolName,
      email,
      phoneNumber,
      password: _password,
      organization_id,
      organizationId,
      schoolId: _schoolId,
    } = payload || {};

    let schoolId = organization_id || organizationId || _schoolId;
    let classRoomId = undefined;

    // find classroom id if provided
    if (classRoomName) {
      const [rows] = await db.query(
        "SELECT classroom_id FROM class_room WHERE name = ? LIMIT 1",
        [classRoomName],
      );
      if (rows.length > 0) classRoomId = rows[0].classroom_id;
    }

    // find school id if provided (override if found by name)
    if (schoolName) {
      const [rows] = await db.query(
        "SELECT organization_id FROM organization WHERE name = ? LIMIT 1",
        [schoolName],
      );
      if (rows.length > 0) schoolId = rows[0].organization_id;
    }

    const password = _password || phoneNumber || "123456";
    const code = "TEACHER";
    const isDeleted = 0;

    if (!name || !email) {
      const err = new Error("Missing required fields: name, email");
      err.status = 400;
      throw err;
    }

    // check if user email exists
    const [exists] = await db.query(
      "SELECT user_id FROM `user` WHERE email = ? LIMIT 1",
      [email],
    );
    if (exists.length > 0) {
      const err = new Error("Email already exists");
      err.status = 409;
      throw err;
    }

    // insert into primary `user` table
    const [result] = await db.query(
      `INSERT INTO \`user\` (name, birth_day, address, email, password, code, is_deleted, phone_number, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        birthDay || null,
        address || null,
        email,
        password,
        code,
        isDeleted,
        phoneNumber || null,
        createdBy || "system",
      ],
    );

    const userId = result.insertId;

    // Insert into organization_manager
    if (schoolId) {
      await db.query(
        `INSERT INTO organization_manager (user_id, organization_id, role_in_org, is_primary) VALUES (?, ?, ?, 1)`,
        [userId, schoolId, "TEACHER"],
      );
    }

    // insert mapping into class_teacher if classroom found
    if (classRoomId) {
      await db.query(
        `INSERT INTO class_teacher (user_id, class_room_id) VALUES (?, ?)`,
        [userId, classRoomId],
      );
    }

    // optional: write to secondary DB if configured (DB_B_*)
    if (process.env.DB_B_HOST) {
      try {
        const mysql = require("mysql2/promise");
        const poolB = mysql.createPool({
          host: process.env.DB_B_HOST,
          port: Number(process.env.DB_B_PORT || 3306),
          user: process.env.DB_B_USER,
          password: process.env.DB_B_PASSWORD,
          database: process.env.DB_B_NAME,
          waitForConnections: true,
          connectionLimit: 5,
        });

        await poolB.query(
          `INSERT INTO user_b (name, birth_day, address, email, password, code, is_deleted)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            name,
            birthDay || null,
            address || null,
            email,
            password,
            code,
            isDeleted,
          ],
        );
      } catch (e) {
        console.warn("Warning: Failed to write to secondary DB:", e.message);
      }
    }

    console.log("Teacher created with ID:", userId);
    return {
      message: "Teacher created successfully",
      userId,
      id: userId,
      user_id: userId,
    };
  } catch (error) {
    throw error;
  }
}

async function getTeachers({
  page = 1,
  limit = 20,
  q = "",
  organization_id,
} = {}) {
  try {
    const offset = (Number(page) - 1) * Number(limit);

    const where = ["u.is_deleted = 0", "u.code = 'TEACHER'"];
    const params = [];

    if (q) {
      where.push("(u.name LIKE ? OR u.email LIKE ? OR u.phone_number LIKE ?)");
      const like = `%${q}%`;
      params.push(like, like, like);
    }

    if (organization_id) {
      where.push("om.organization_id = ?");
      params.push(organization_id);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    // Query from user table directly and join organization AND parent organization
    const query = `
      SELECT u.*, 
             o.name as organization_name, 
             o.organization_id,
             parent_o.name as parent_organization_name
      FROM user u 
      LEFT JOIN organization_manager om ON u.user_id = om.user_id
      LEFT JOIN organization o ON om.organization_id = o.organization_id
      LEFT JOIN organization parent_o ON o.parent_id = parent_o.organization_id
      ${whereSql} 
      ORDER BY u.user_id DESC 
      LIMIT ? OFFSET ?
    `;

    const [rows] = await db.query(query, [
      ...params,
      Number(limit),
      Number(offset),
    ]);

    const countQuery = `
      SELECT COUNT(1) as total 
      FROM user u 
      LEFT JOIN organization_manager om ON u.user_id = om.user_id
      ${whereSql}
    `;
    const [[{ total }]] = await db.query(countQuery, params);

    return {
      teachers: rows.map((r) => {
        try {
          r.subjects = r.subjects ? JSON.parse(r.subjects) : null;
        } catch (e) {
          r.subjects = r.subjects;
        }
        return r;
      }),
      meta: { page: Number(page), limit: Number(limit), total: Number(total) },
    };
  } catch (error) {
    throw error;
  }
}

async function getTeacherById(teacherId) {
  try {
    const query = `
      SELECT u.*, 
             o.name as organization_name, 
             o.organization_id,
             parent_o.name as parent_organization_name
      FROM user u 
      LEFT JOIN organization_manager om ON u.user_id = om.user_id
      LEFT JOIN organization o ON om.organization_id = o.organization_id
      LEFT JOIN organization parent_o ON o.parent_id = parent_o.organization_id
      WHERE u.user_id = ? AND u.is_deleted = 0
      LIMIT 1
    `;
    const [rows] = await db.query(query, [teacherId]);

    if (rows.length === 0) {
      const err = new Error("Teacher not found");
      err.status = 404;
      throw err;
    }
    const teacher = rows[0];
    try {
      teacher.subjects = teacher.subjects ? JSON.parse(teacher.subjects) : null;
    } catch (e) { }
    return teacher;
  } catch (error) {
    throw error;
  }
}

async function updateTeacher(teacherId, body, modifiedBy) {
  try {
    const raw = body || {};
    const updates = [];
    const values = [];

    const has = (k) => Object.prototype.hasOwnProperty.call(raw, k);

    const setIf = (key, column) => {
      if (has(key)) {
        updates.push(`${column} = ?`);
        values.push(raw[key]);
      }
    };

    setIf("name", "name");
    setIf("email", "email");
    setIf("phone_number", "phone_number");
    setIf("gender", "gender");
    setIf("birth_day", "birth_day");
    setIf("address", "address");
    setIf("avatar_location", "avatar_location");
    if (has("subjects")) {
      updates.push("subjects = ?");
      values.push(raw.subjects ? JSON.stringify(raw.subjects) : null);
    }

    if (has("organization_id")) {
      const newOrgId = raw.organization_id;
      const [exists] = await db.query(
        "SELECT * FROM organization_manager WHERE user_id = ?",
        [teacherId],
      );
      if (exists.length > 0) {
        await db.query(
          "UPDATE organization_manager SET organization_id = ? WHERE user_id = ?",
          [newOrgId, teacherId],
        );
      } else {
        await db.query(
          "INSERT INTO organization_manager (user_id, organization_id, role_in_org) VALUES (?, ?, ?)",
          [teacherId, newOrgId, "TEACHER"],
        );
      }
    }

    setIf("code", "code");
    if (has("is_deleted")) {
      updates.push("is_deleted = ?");
      values.push(raw.is_deleted ? 1 : 0);
    }

    if (updates.length > 0) {
      updates.push("modified_by = ?");
      values.push(modifiedBy || "system");
      updates.push("modified_date = NOW()");
      values.push(teacherId);

      const [result] = await db.query(
        `UPDATE user SET ${updates.join(", ")} WHERE user_id = ?`,
        values,
      );
    }

    return await getTeacherById(teacherId);
  } catch (error) {
    throw error;
  }
}

async function deleteTeacher(teacherId, modifiedBy) {
  try {
    const [result] = await db.query(
      `UPDATE user SET is_deleted = 1, modified_by = ?, modified_date = NOW() WHERE user_id = ?`,
      [modifiedBy || "system", teacherId],
    );
    if (!result || result.affectedRows === 0) {
      const err = new Error("Teacher not found");
      err.status = 404;
      throw err;
    }
    return { message: "Teacher deleted successfully" };
  } catch (error) {
    throw error;
  }
}

// Student CRUD operations
async function createStudent(payload, createdBy, options = {}) {
  console.log("DEBUG createStudent Payload:", payload);
  try {
    await ensureRoleExists("STUDENT");

    const normalized = normalizeStudentPayload(payload);
    const {
      name,
      birthDay,
      address,
      classRoomName,
      schoolName,
      email,
      phoneNumber,
      password: _password,
      organizationId,
      grade,
      classroomId,
    } = normalized;

    let schoolId = organizationId;
    let classRoomId = classroomId;

    // find classroom id if provided
    if (classRoomName) {
      const [rows] = await db.query(
        "SELECT class_room_id, organization_id FROM class_room WHERE content = ? LIMIT 1",
        [classRoomName],
      );
      if (rows.length > 0) {
        classRoomId = rows[0].class_room_id;
        schoolId = schoolId || rows[0].organization_id;
      }
    }

    if (classRoomId) {
      const classInfo =
        options.actorRole === "TEACHER"
          ? await getClassroomForTeacher(classRoomId, options.actorUserId)
          : await getClassroomForTeacher(classRoomId, null);

      if (!classInfo) {
        const err = new Error("Teacher does not manage this classroom");
        err.status = 403;
        throw err;
      }
      schoolId = schoolId || classInfo.organization_id;
    } else if (options.actorRole === "TEACHER") {
      const err = new Error("Teacher-created students must be assigned to a classroom");
      err.status = 400;
      throw err;
    }

    // find school id if provided (override if found by name)
    if (schoolName) {
      const [rows] = await db.query(
        "SELECT organization_id FROM organization WHERE name = ? LIMIT 1",
        [schoolName],
      );
      if (rows.length > 0) schoolId = rows[0].organization_id;
    }

    const password = _password || phoneNumber || "123456";
    const code = "STUDENT";
    const isDeleted = 0;
    const finalGrade = toNullableGrade(grade);

    if (!name || !email) {
      const err = new Error("Missing required fields: name, email");
      err.status = 400;
      throw err;
    }

    // check if user email exists
    const [exists] = await db.query(
      "SELECT user_id FROM `user` WHERE email = ? LIMIT 1",
      [email],
    );
    if (exists.length > 0) {
      const err = new Error("Email already exists");
      err.status = 409;
      throw err;
    }

    // insert into primary `user` table (Removed organization_id)
    const [result] = await db.query(
      `INSERT INTO \`user\` (name, birth_day, address, email, password, code, grade, is_deleted, phone_number, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        birthDay || null,
        address || null,
        email,
        password,
        code,
        finalGrade,
        isDeleted,
        phoneNumber || null,
        createdBy || "system",
      ],
    );

    const userId = result.insertId;

    // Insert into organization_manager
    if (schoolId) {
      await db.query(
        `INSERT INTO organization_manager (user_id, organization_id, role_in_org, is_primary) VALUES (?, ?, ?, 1)`,
        [userId, schoolId, "STUDENT"],
      );
    }

    // insert mapping into class_student if classroom found
    if (classRoomId) {
      await db.query(
        `INSERT INTO class_student (user_id, class_room_id) VALUES (?, ?)`,
        [userId, classRoomId],
      );
    }

    // optional: write to secondary DB if configured (DB_B_*)
    if (process.env.DB_B_HOST) {
      try {
        const mysql = require("mysql2/promise");
        const poolB = mysql.createPool({
          host: process.env.DB_B_HOST,
          port: Number(process.env.DB_B_PORT || 3306),
          user: process.env.DB_B_USER,
          password: process.env.DB_B_PASSWORD,
          database: process.env.DB_B_NAME,
          waitForConnections: true,
          connectionLimit: 5,
        });

        await poolB.query(
          `INSERT INTO user_b (name, birth_day, address, email, password, code, is_deleted)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            name,
            birthDay || null,
            address || null,
            email,
            password,
            code,
            isDeleted,
          ],
        );
      } catch (e) {
        console.warn("Warning: Failed to write to secondary DB:", e.message);
      }
    }

    console.log("Student created with ID:", userId);
    return {
      message: "Student created successfully",
      userId,
      id: userId,
      user_id: userId,
    };
  } catch (error) {
    console.error("DEBUG createStudent ERROR:", error);
    throw error;
  }
}

async function getStudents({
  page = 1,
  limit = 20,
  q = "",
  organization_id,
} = {}) {
  try {
    const offset = (Number(page) - 1) * Number(limit);

    const where = ["u.is_deleted = 0", "u.code = 'STUDENT'"];
    const params = [];

    if (q) {
      where.push("(u.name LIKE ? OR u.email LIKE ? OR u.phone_number LIKE ?)");
      const like = `%${q}%`;
      params.push(like, like, like);
    }

    if (organization_id) {
      where.push("om.organization_id = ?");
      params.push(organization_id);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const query = `
      SELECT u.*, 
             o.name as organization_name, 
             o.organization_id,
             parent_o.name as parent_organization_name
      FROM user u 
      LEFT JOIN organization_manager om ON u.user_id = om.user_id
      LEFT JOIN organization o ON om.organization_id = o.organization_id
      LEFT JOIN organization parent_o ON o.parent_id = parent_o.organization_id
      ${whereSql}
      ORDER BY u.user_id DESC 
      LIMIT ? OFFSET ?
    `;

    const [rows] = await db.query(query, [
      ...params,
      Number(limit),
      Number(offset),
    ]);

    const countQuery = `
      SELECT COUNT(1) as total 
      FROM user u 
      LEFT JOIN organization_manager om ON u.user_id = om.user_id
      ${whereSql}
    `;
    const [[{ total }]] = await db.query(countQuery, params);

    return {
      students: rows,
      meta: { page: Number(page), limit: Number(limit), total: Number(total) },
    };
  } catch (error) {
    throw error;
  }
}

async function getStudentById(studentId) {
  try {
    const query = `
      SELECT u.*, 
             o.name as organization_name, 
             o.organization_id,
             parent_o.name as parent_organization_name
      FROM user u 
      LEFT JOIN organization_manager om ON u.user_id = om.user_id
      LEFT JOIN organization o ON om.organization_id = o.organization_id
      LEFT JOIN organization parent_o ON o.parent_id = parent_o.organization_id
      WHERE u.user_id = ? AND u.is_deleted = 0 AND u.code = 'STUDENT'
      LIMIT 1
    `;
    const [rows] = await db.query(query, [studentId]);

    if (rows.length === 0) {
      const err = new Error("Student not found");
      err.status = 404;
      throw err;
    }
    return rows[0];
  } catch (error) {
    throw error;
  }
}

async function updateStudent(studentId, body, modifiedBy) {
  try {
    const raw = body || {};
    const updates = [];
    const values = [];

    const has = (k) => Object.prototype.hasOwnProperty.call(raw, k);

    const setIf = (key, column) => {
      if (has(key)) {
        updates.push(`${column} = ?`);
        values.push(raw[key]);
      }
    };

    setIf("name", "name");
    setIf("email", "email");
    setIf("phone_number", "phone_number");
    setIf("gender", "gender");
    setIf("birth_day", "birth_day");
    setIf("address", "address");
    setIf("avatar_location", "avatar_location");
    if (has("grade")) {
      updates.push("grade = ?");
      values.push(toNullableGrade(raw.grade));
    }
    // Handle organization update for student too
    if (has("organization_id")) {
      const newOrgId = raw.organization_id;
      const [exists] = await db.query(
        "SELECT * FROM organization_manager WHERE user_id = ?",
        [studentId],
      );
      if (exists.length > 0) {
        await db.query(
          "UPDATE organization_manager SET organization_id = ? WHERE user_id = ?",
          [newOrgId, studentId],
        );
      } else {
        await db.query(
          "INSERT INTO organization_manager (user_id, organization_id, role_in_org) VALUES (?, ?, ?)",
          [studentId, newOrgId, "STUDENT"],
        );
      }
    }

    if (has("is_deleted")) {
      updates.push("is_deleted = ?");
      values.push(raw.is_deleted ? 1 : 0);
    }

    if (updates.length > 0) {
      updates.push("modified_by = ?");
      values.push(modifiedBy || "system");
      updates.push("modified_date = NOW()");
      values.push(studentId);

      const [result] = await db.query(
        `UPDATE user SET ${updates.join(", ")} WHERE user_id = ? AND code = ?`,
        [...values, "STUDENT"],
      );
    }

    // Return updated data
    return await getStudentById(studentId);
  } catch (error) {
    throw error;
  }
}

async function deleteStudent(studentId, modifiedBy) {
  try {
    const [result] = await db.query(
      `UPDATE user SET is_deleted = 1, modified_by = ?, modified_date = NOW() WHERE user_id = ? AND code = ?`,
      [modifiedBy || "system", studentId, "STUDENT"],
    );
    if (!result || result.affectedRows === 0) {
      const err = new Error("Student not found");
      err.status = 404;
      throw err;
    }
    return { message: "Student deleted successfully" };
  } catch (error) {
    throw error;
  }
}

async function deleteUser(userId, modifiedBy) {
  try {
    const [rows] = await db.query(
      "SELECT user_id, code FROM `user` WHERE user_id = ? LIMIT 1",
      [userId],
    );

    if (rows.length === 0) {
      const err = new Error("User not found");
      err.status = 404;
      throw err;
    }

    const userCode = rows[0].code;

    if (userCode === "TEACHER") {
      return await deleteTeacher(userId, modifiedBy);
    }

    if (userCode === "STUDENT") {
      return await deleteStudent(userId, modifiedBy);
    }

    const [result] = await db.query(
      `UPDATE user SET is_deleted = 1, modified_by = ?, modified_date = NOW() WHERE user_id = ?`,
      [modifiedBy || "system", userId],
    );

    if (!result || result.affectedRows === 0) {
      const err = new Error("User not found");
      err.status = 404;
      throw err;
    }

    return { message: "User deleted successfully" };
  } catch (error) {
    throw error;
  }
}

// Student learning tracking
async function viewLesson(studentId, lessonId) {
  try {
    if (!studentId || !lessonId) {
      const err = new Error("studentId and lessonId are required");
      err.status = 400;
      throw err;
    }

    const [lesson] = await db.query(
      "SELECT lesson_id FROM lesson WHERE lesson_id = ? LIMIT 1",
      [lessonId],
    );
    if (lesson.length === 0) {
      const err = new Error("Lesson not found");
      err.status = 404;
      throw err;
    }

    const [view] = await db.query(
      "SELECT * FROM lesson_view WHERE student_id = ? AND lesson_id = ? LIMIT 1",
      [studentId, lessonId],
    );

    if (view.length === 0) {
      await db.query(
        "INSERT INTO lesson_view (student_id, lesson_id, view_count, last_viewed_at) VALUES (?, ?, 1, NOW())",
        [studentId, lessonId],
      );
    } else {
      await db.query(
        "UPDATE lesson_view SET view_count = view_count + 1, last_viewed_at = NOW() WHERE student_id = ? AND lesson_id = ?",
        [studentId, lessonId],
      );
    }

    return { message: "Lesson viewed successfully" };
  } catch (error) {
    throw error;
  }
}

async function viewVocabulary(studentId, vocabularyId) {
  try {
    if (!studentId || !vocabularyId) {
      const err = new Error("studentId and vocabularyId are required");
      err.status = 400;
      throw err;
    }

    const [vocab] = await db.query(
      "SELECT vocabulary_id FROM vocabulary WHERE vocabulary_id = ? LIMIT 1",
      [vocabularyId],
    );
    if (vocab.length === 0) {
      const err = new Error("Vocabulary not found");
      err.status = 404;
      throw err;
    }

    const [view] = await db.query(
      "SELECT * FROM vocabulary_view WHERE student_id = ? AND vocabulary_id = ? LIMIT 1",
      [studentId, vocabularyId],
    );

    if (view.length === 0) {
      await db.query(
        "INSERT INTO vocabulary_view (student_id, vocabulary_id, view_count, last_viewed_at) VALUES (?, ?, 1, NOW())",
        [studentId, vocabularyId],
      );
    } else {
      await db.query(
        "UPDATE vocabulary_view SET view_count = view_count + 1, last_viewed_at = NOW() WHERE student_id = ? AND vocabulary_id = ?",
        [studentId, vocabularyId],
      );
    }

    return { message: "Vocabulary viewed successfully" };
  } catch (error) {
    throw error;
  }
}

async function getStudentLearningProgress(studentId) {
  try {
    // Get recent lesson views
    const [lessonViews] = await db.query(
      `SELECT lesson_id, view_count, last_viewed_at FROM lesson_view 
       WHERE student_id = ? ORDER BY last_viewed_at DESC LIMIT 10`,
      [studentId],
    );

    // Get recent vocabulary views
    const [vocabViews] = await db.query(
      `SELECT vocabulary_id, view_count, last_viewed_at FROM vocabulary_view 
       WHERE student_id = ? ORDER BY last_viewed_at DESC LIMIT 10`,
      [studentId],
    );

    return {
      lessonViews,
      vocabularyViews: vocabViews,
      lastActive: new Date(),
    };
  } catch (error) {
    throw error;
  }
}

async function getUsers({
  page = 1,
  limit = 20,
  q = "",
  organization_id,
  role,
} = {}) {
  try {
    const offset = (Number(page) - 1) * Number(limit);

    const where = ["u.is_deleted = 0"];
    const params = [];

    if (role) {
      where.push("u.code = ?");
      params.push(role);
    }

    if (q) {
      where.push("(u.name LIKE ? OR u.email LIKE ? OR u.phone_number LIKE ?)");
      const like = `%${q}%`;
      params.push(like, like, like);
    }

    if (organization_id) {
      where.push("om.organization_id = ?");
      params.push(organization_id);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const query = `
      SELECT u.*, 
             o.name as organization_name, 
             o.organization_id,
             parent_o.name as parent_organization_name
      FROM user u 
      LEFT JOIN organization_manager om ON u.user_id = om.user_id
      LEFT JOIN organization o ON om.organization_id = o.organization_id
      LEFT JOIN organization parent_o ON o.parent_id = parent_o.organization_id
      ${whereSql} 
      ORDER BY u.user_id DESC 
      LIMIT ? OFFSET ?
    `;

    const [rows] = await db.query(query, [
      ...params,
      Number(limit),
      Number(offset),
    ]);

    const countQuery = `
      SELECT COUNT(1) as total 
      FROM user u 
      LEFT JOIN organization_manager om ON u.user_id = om.user_id
      ${whereSql}
    `;
    const [[{ total }]] = await db.query(countQuery, params);

    return {
      users: rows,
      meta: { page: Number(page), limit: Number(limit), total: Number(total) },
    };
  } catch (error) {
    throw error;
  }
}

async function getUserById(userId, { includeDeleted = false } = {}) {
  try {
    // Fetch organization info for any user
    const deletedCondition = includeDeleted ? "" : "AND u.is_deleted = 0";
    const query = `
      SELECT u.*, 
             o.name as organization_name, 
             o.organization_id,
             parent_o.name as parent_organization_name
      FROM user u 
      LEFT JOIN organization_manager om ON u.user_id = om.user_id
      LEFT JOIN organization o ON om.organization_id = o.organization_id
      LEFT JOIN organization parent_o ON o.parent_id = parent_o.organization_id
      WHERE u.user_id = ? ${deletedCondition}
    `;
    const [rows] = await db.query(query, [userId]);

    if (rows.length === 0) {
      throw { status: 404, message: "User not found" };
    }

    return { user: rows[0] };
  } catch (error) {
    throw error;
  }
}

async function createUser(payload, createdBy) {
  try {
    const {
      name,
      email,
      password,
      phoneNumber,
      address,
      birthDay,
      code,
      schoolId, // frontend sends schoolId or organization_id or organizationId
      organization_id,
      organizationId, // camelCase from frontend
      role, // fallback if code not sent
      grade,
    } = payload || {};

    let userCode = code || role || "USER";
    await ensureRoleExists(userCode);

    // Map Organization ID (support all naming conventions)
    const finalSchoolId = schoolId || organization_id || organizationId || null;

    if (!name || !email) {
      const err = new Error("Missing required fields: name, email");
      err.status = 400;
      throw err;
    }

    // check if user email exists
    const [exists] = await db.query(
      "SELECT user_id FROM `user` WHERE email = ? LIMIT 1",
      [email],
    );
    if (exists.length > 0) {
      const err = new Error("Email already exists");
      err.status = 409;
      throw err;
    }

    const startPassword = password || "123456";
    const finalGrade = userCode === "STUDENT" ? toNullableGrade(grade) : null;

    // insert into primary `user` table (Removed organization_id)
    const [result] = await db.query(
      `INSERT INTO \`user\` (name, birth_day, address, email, password, code, grade, is_deleted, phone_number, created_by, created_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        name,
        birthDay || null,
        address || null,
        email,
        startPassword,
        userCode,
        finalGrade,
        0, // is_deleted
        phoneNumber || null,
        createdBy || "system",
      ],
    );

    const userId = result.insertId;

    // Insert into organization_manager
    if (finalSchoolId) {
      await db.query(
        `INSERT INTO organization_manager (user_id, organization_id, role_in_org) VALUES (?, ?, ?)`,
        [userId, finalSchoolId, userCode],
      );
    }

    return { message: "User created successfully", userId };
  } catch (error) {
    throw error;
  }
}

async function updateUser(userId, body, modifiedBy) {
  try {
    const raw = body || {};
    const updates = [];
    const values = [];

    const has = (k) => Object.prototype.hasOwnProperty.call(raw, k);

    const setIf = (key, column) => {
      if (has(key)) {
        updates.push(`${column} = ?`);
        values.push(raw[key]);
      }
    };

    setIf("name", "name");
    setIf("email", "email");
    setIf("phone_number", "phone_number");
    setIf("gender", "gender");
    setIf("birth_day", "birth_day");
    setIf("address", "address");
    setIf("avatar_location", "avatar_location");
    setIf("status", "status");
    if (has("grade")) {
      updates.push("grade = ?");
      values.push(toNullableGrade(raw.grade));
    }

    if (has("organization_id")) {
      const newOrgId = raw.organization_id;
      const [exists] = await db.query(
        "SELECT * FROM organization_manager WHERE user_id = ?",
        [userId],
      );
      if (exists.length > 0) {
        await db.query(
          "UPDATE organization_manager SET organization_id = ? WHERE user_id = ?",
          [newOrgId, userId],
        );
      } else {
        const [userDb] = await db.query("SELECT code FROM user WHERE user_id = ?", [userId]);
        const role = userDb[0]?.code || 'USER';
        await db.query(
          "INSERT INTO organization_manager (user_id, organization_id, role_in_org) VALUES (?, ?, ?)",
          [userId, newOrgId, role],
        );
      }
    }

    setIf("code", "code");
    if (has("role")) {
      await ensureRoleExists(raw.role);
      updates.push("code = ?");
      values.push(raw.role);
    }
    
    if (has("is_deleted")) {
      updates.push("is_deleted = ?");
      values.push(raw.is_deleted ? 1 : 0);
    }
    if (has("isDeleted")) {
      updates.push("is_deleted = ?");
      values.push(raw.isDeleted ? 1 : 0);
    }

    if (updates.length > 0) {
      updates.push("modified_by = ?");
      values.push(modifiedBy || "system");
      updates.push("modified_date = NOW()");
      values.push(userId);

      const [result] = await db.query(
        `UPDATE user SET ${updates.join(", ")} WHERE user_id = ?`,
        values,
      );
    }

    return await getUserById(userId);
  } catch (error) {
    throw error;
  }
}

async function changeUserRole(userId, roleCode, modifiedBy) {
  try {
    await ensureRoleExists(roleCode);
    const [user] = await db.query("SELECT * FROM user WHERE user_id = ?", [userId]);
    if (user.length === 0) {
      throw { status: 404, message: "User not found" };
    }

    await db.query("UPDATE user SET code = ?, modified_by = ?, modified_date = NOW() WHERE user_id = ?", [roleCode, modifiedBy, userId]);

    const [orgManager] = await db.query("SELECT * FROM organization_manager WHERE user_id = ?", [userId]);
    if (orgManager.length > 0) {
      await db.query("UPDATE organization_manager SET role_in_org = ? WHERE user_id = ?", [roleCode, userId]);
    }

    return { message: "Role changed successfully", role: roleCode };
  } catch (error) {
    throw error;
  }
}

async function bulkCreateStudents(rows, createdBy, options = {}) {
  if (!Array.isArray(rows) || rows.length === 0) {
    const err = new Error("Students must be a non-empty array");
    err.status = 400;
    throw err;
  }

  const maxRows = 500;
  if (rows.length > maxRows) {
    const err = new Error(`Cannot import more than ${maxRows} students at once`);
    err.status = 400;
    throw err;
  }

  const results = [];
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index] || {};
    try {
      const created = await createStudent(row, createdBy, options);
      results.push({
        row: index + 1,
        success: true,
        userId: created.userId,
        email: row.email || null,
        message: created.message,
      });
    } catch (error) {
      results.push({
        row: index + 1,
        success: false,
        email: row.email || null,
        message: error.message || "Could not create student",
        status: error.status || 500,
      });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  return {
    total: rows.length,
    successCount,
    failureCount: rows.length - successCount,
    results,
  };
}

module.exports = {
  createTeacher,
  getTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  deleteUser,
  viewLesson,
  viewVocabulary,
  getStudentLearningProgress,
  getUsers,
  getUserById,
  createUser,
  updateUser,
  changeUserRole,
  bulkCreateStudents,
};
