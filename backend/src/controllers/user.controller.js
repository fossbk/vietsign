const db = require("../db");
const services = require("../services/user.services");
const bcrypt = require("bcrypt");


// GET user/profile

async function getProfile(req, res) {
  try {
    const userId = req.user?.user_id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const [rows] = await db.query(
      `SELECT u.user_id, u.name, u.email, u.phone_number, u.code, u.is_deleted, 
              u.is_oauth2, u.created_by, u.created_date, u.modified_by, u.modified_date,
              om.organization_id, o.name as organization_name
       FROM \`user\` u
       LEFT JOIN organization_manager om ON u.user_id = om.user_id AND om.is_primary = 1
       LEFT JOIN organization o ON om.organization_id = o.organization_id
       WHERE u.user_id = ? LIMIT 1`,
      [userId],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    let user = rows[0];

    // Nếu không có primary org, lấy org đầu tiên (fallback)
    if (!user.organization_id) {
      const [orgRows] = await db.query(
        `SELECT organization_id, role_in_org FROM organization_manager WHERE user_id = ? ORDER BY id ASC LIMIT 1`,
        [userId],
      );
      if (orgRows.length > 0) {
        user.organization_id = orgRows[0].organization_id;
      }
    }

    return res.json({ user });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
}

// Update user/profile
async function updateProfile(req, res) {
  try {
    const userId = req.user?.user_id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const {
      name,
      email,
      phone_number,
      gender,
      address,
      avatar_location,
      birth_day,
      code,
      school_id,
    } = req.body;

    await db.query(`UPDATE user
            SET 
                name = COALESCE(?, name),
                email = COALESCE(?, email),
                phone_number = COALESCE(?, phone_number),
                gender = COALESCE(?, gender),
                address = COALESCE(?, address),
                avatar_location = COALESCE(?, avatar_location),
                birth_day = COALESCE(?, birth_day),
                code = COALESCE(?, code),
                modified_by = ?,
                modified_date = NOW()
            WHERE user_id = ? AND is_deleted = 0`,
      [
        name || null,
        email || null,
        phone_number || null,
        gender || null,
        address || null,
        avatar_location || null,
        birth_day || null,
        code || null,
        req.user?.email || "anonymousUser",
        userId,
      ]
    );
    return res.json({
      message: "Profile updated successfully: ",
      updatedProfile: req.body,
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
}

module.exports = {
  getProfile,
  updateProfile,
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
  getUserStatistics,
};

// Student CRUD operations
async function createStudent(req, res) {
  try {
    const payload = req.body || {};
    const createdBy = req.user?.email || "anonymousUser";
    const result = await services.createStudent(payload, createdBy, {
      actorUserId: req.user?.user_id,
      actorRole: req.orgRole || req.user?.code,
    });
    return res.status(201).json(result);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ message: err.message });
  }
}

async function bulkCreateStudents(req, res) {
  try {
    const { students } = req.body || {};
    const createdBy = req.user?.email || "anonymousUser";
    const result = await services.bulkCreateStudents(students, createdBy, {
      actorUserId: req.user?.user_id,
      actorRole: req.orgRole || req.user?.code,
    });
    return res.status(200).json(result);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ message: err.message });
  }
}

async function getStudents(req, res) {
  try {
    const { page, limit, q, school_id, organization_id } = req.query || {};
    // Support both school_id and organization_id from frontend
    const orgId = organization_id || school_id;
    const data = await services.getStudents({
      page,
      limit,
      q,
      organization_id: orgId,
    });
    return res.json(data);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ message: err.message });
  }
}

async function getStudentById(req, res) {
  try {
    const id = req.params.id;
    const student = await services.getStudentById(id);
    return res.json({ student });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ message: err.message });
  }
}

async function updateStudent(req, res) {
  try {
    const id = req.params.id;
    const body = req.body || {};
    const modifiedBy = req.user?.email || "anonymousUser";
    const updated = await services.updateStudent(id, body, modifiedBy);
    return res.json({
      message: "Student updated successfully",
      student: updated,
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ message: err.message });
  }
}

async function deleteStudent(req, res) {
  try {
    const id = req.params.id;
    const modifiedBy = req.user?.email || "anonymousUser";
    const result = await services.deleteStudent(id, modifiedBy);
    return res.json(result);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ message: err.message });
  }
}

async function deleteUser(req, res) {
  try {
    const id = req.params.id;
    const modifiedBy = req.user?.email || "anonymousUser";
    const result = await services.deleteUser(id, modifiedBy);
    return res.json(result);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ message: err.message });
  }
}

// Student learning tracking
async function viewLesson(req, res) {
  try {
    const { lessonId } = req.body || {};
    const studentId = req.user?.user_id;
    const result = await services.viewLesson(studentId, lessonId);
    return res.json(result);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ message: err.message });
  }
}

async function viewVocabulary(req, res) {
  try {
    const { vocabularyId } = req.body || {};
    const studentId = req.user?.user_id;
    const result = await services.viewVocabulary(studentId, vocabularyId);
    return res.json(result);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ message: err.message });
  }
}

async function getStudentLearningProgress(req, res) {
  try {
    const studentId = req.user?.user_id;
    const result = await services.getStudentLearningProgress(studentId);
    return res.json(result);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ message: err.message });
  }
}

async function getUserStatistics(req, res) {
  try {
    const studentId = req.params.userId;
    if (!studentId) {
      return res.status(400).json({ message: "userId is required" });
    }
    const result = await services.getStudentLearningProgress(studentId);
    return res.json({
      statistics: result,
      lessonViews: result.lessonViews,
      vocabularyViews: result.vocabularyViews,
      message: "success",
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ message: err.message });
  }
}

// Teacher CRUD operations
async function createTeacher(req, res) {
  try {
    const payload = req.body || {};
    const createdBy = req.user?.email || "anonymousUser";
    const result = await services.createTeacher(payload, createdBy);
    return res.status(201).json(result);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ message: err.message });
  }
}

async function getTeachers(req, res) {
  try {
    const { page, limit, q, school_id, organization_id } = req.query || {};
    // Support both school_id and organization_id from frontend
    const orgId = organization_id || school_id;
    const data = await services.getTeachers({
      page,
      limit,
      q,
      organization_id: orgId,
    });
    return res.json(data);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ message: err.message });
  }
}

async function getTeacherById(req, res) {
  try {
    const id = req.params.id;
    const teacher = await services.getTeacherById(id);
    return res.json({ teacher });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ message: err.message });
  }
}

async function updateTeacher(req, res) {
  try {
    const id = req.params.id;
    const body = req.body || {};
    const modifiedBy = req.user?.email || "anonymousUser";
    const updated = await services.updateTeacher(id, body, modifiedBy);
    return res.json({
      message: "Teacher updated successfully",
      teacher: updated,
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ message: err.message });
  }
}

async function deleteTeacher(req, res) {
  try {
    const id = req.params.id;
    const modifiedBy = req.user?.email || "anonymousUser";
    const result = await services.deleteTeacher(id, modifiedBy);
    return res.json(result);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ message: err.message });
  }
}

async function getUsers(req, res) {
  try {
    const { page, limit, q, school_id, organization_id, role } = req.query || {};
    // Support both school_id and organization_id from frontend
    const orgId = organization_id || school_id;
    const data = await services.getUsers({
      page,
      limit,
      q,
      organization_id: orgId,
      role,
    });
    return res.json(data);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ message: err.message });
  }
}
async function getUserById(req, res) {
  try {
    const includeDeleted = req.query.includeDeleted === "true";
    const data = await services.getUserById(req.params.id, { includeDeleted });
    return res.json(data);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ message: err.message });
  }
}

async function createUser(req, res) {
  try {
    const payload = req.body || {};
    const createdBy = req.user?.email || "anonymousUser";
    const result = await services.createUser(payload, createdBy);
    return res.status(201).json(result);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ message: err.message });
  }
}

async function updateUser(req, res) {
  try {
    const payload = req.body || {};
    const modifiedBy = req.user?.email || "anonymousUser";
    const result = await services.updateUser(req.params.id, payload, modifiedBy);
    return res.status(200).json(result);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ message: err.message });
  }
}

async function changeUserRole(req, res) {
  try {
    const { role } = req.body || {};
    const modifiedBy = req.user?.email || "anonymousUser";
    if (!role) {
      return res.status(400).json({ message: "Role is required" });
    }
    const result = await services.changeUserRole(req.params.id, role, modifiedBy);
    return res.status(200).json(result);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ message: err.message });
  }
}

// PUT /users/:id/reset-password — Admin đặt lại mật khẩu cho người dùng bất kỳ
async function resetUserPassword(req, res) {
  try {
    const targetId = req.params.id;
    const { newPassword } = req.body || {};

    if (!newPassword || newPassword.trim().length < 6) {
      return res
        .status(400)
        .json({ message: "Mật khẩu mới phải có ít nhất 6 ký tự" });
    }

    // Kiểm tra user tồn tại
    const [rows] = await db.query(
      "SELECT user_id FROM `user` WHERE user_id = ? AND is_deleted = 0 LIMIT 1",
      [targetId],
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const hashed = await bcrypt.hash(newPassword.trim(), 10);
    await db.query(
      "UPDATE `user` SET password = ?, modified_by = ?, modified_date = NOW() WHERE user_id = ?",
      [hashed, req.user?.email || "admin", targetId],
    );

    return res.json({ success: true, message: "Đặt lại mật khẩu thành công" });
  } catch (err) {
    console.error("resetUserPassword error:", err);
    return res.status(500).json({ message: "Lỗi server", error: err.message });
  }
}


module.exports = {
  getProfile,
  updateProfile,
  createUser,
  createTeacher,
  bulkCreateStudents,
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
  getUserStatistics,
  updateUser,
  changeUserRole,
  resetUserPassword,
};
