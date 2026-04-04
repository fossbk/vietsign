const examService = require("../services/exam.services");
const path = require("path");
const { minioClient, bucketName } = require("../../../utils/minio");

/**
 * Exam Management Controller
 * Handles HTTP requests for exam management and submission operations
 */

// Create new exam
const createExam = async (req, res) => {
  try {
    const { name } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({
        success: false,
        error: "Exam name is required",
        message: "Tên bài kiểm tra là bắt buộc",
      });
    }

    const userId = req.user.user_id;
    const exam = await examService.createExam(req.body, userId);

    return res.status(201).json({
      success: true,
      data: exam,
      message: "Exam created successfully",
    });
  } catch (error) {
    console.error("Create exam error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: "Error creating exam",
    });
  }
};

// Get all exams with pagination and filtering
const getExams = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 1000;
    const page = parseInt(req.query.page) || 1;
    const class_room_id = req.query.class_room_id
      ? parseInt(req.query.class_room_id)
      : null;
    const studentId = req.query.studentId || req.query.student_id;
    const exam_type = req.query.exam_type || req.query.type;
    const class_room_ids = req.query.class_room_ids;

    const result = await examService.getExams({
      limit,
      page,
      class_room_id,
      studentId,
      exam_type,
      class_room_ids,
    });

    return res.status(200).json({
      success: true,
      data: result.data,
      total: result.total,
      limit: result.limit,
      page: result.page,
      message: "Exams retrieved successfully",
    });
  } catch (error) {
    console.error("Get exams error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: "Error retrieving exams",
    });
  }
};

// Get exam by ID
const getExamById = async (req, res) => {
  try {
    const examId = parseInt(req.params.exam_id);

    if (!examId || isNaN(examId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid exam ID",
        message: "ID bài kiểm tra không hợp lệ",
      });
    }

    const exam = await examService.getExamById(examId);

    return res.status(200).json({
      success: true,
      data: exam,
      message: "Exam retrieved successfully",
    });
  } catch (error) {
    if (error.message === "Exam not found") {
      return res.status(404).json({
        success: false,
        error: "Exam not found",
        message: "Không tìm thấy bài kiểm tra",
      });
    }

    console.error("Get exam error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: "Error retrieving exam",
    });
  }
};

// Get exams by classroom ID
const getExamsByClassroom = async (req, res) => {
  try {
    const classroomId = parseInt(req.params.classroom_id);
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    if (!classroomId || isNaN(classroomId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid classroom ID",
        message: "ID lớp học không hợp lệ",
      });
    }

    const result = await examService.getExams({
      class_room_id: classroomId,
      limit: parseInt(req.query.limit) || 1000,
      page: parseInt(req.query.page) || 1,
    });

    return res.status(200).json({
      success: true,
      data: result.data,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      message: "Exams retrieved successfully",
    });
  } catch (error) {
    console.error("Get exams by classroom error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: "Error retrieving exams",
    });
  }
};

// Get exams by creator ID
const getExamsByCreator = async (req, res) => {
  try {
    const creatorId = parseInt(req.params.creator_id);
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    if (!creatorId || isNaN(creatorId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid creator ID",
        message: "ID người tạo không hợp lệ",
      });
    }

    const result = await examService.getExamsByCreator(
      creatorId,
      limit,
      offset,
    );

    return res.status(200).json({
      success: true,
      data: result.data,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      message: "Exams retrieved successfully",
    });
  } catch (error) {
    console.error("Get exams by creator error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: "Error retrieving exams",
    });
  }
};

// Get exams by type
const getExamsByType = async (req, res) => {
  try {
    const examType = req.params.exam_type;
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    if (!["MULTIPLE_CHOICE", "PRACTICAL"].includes(examType)) {
      return res.status(400).json({
        success: false,
        error: "Invalid exam type. Must be MULTIPLE_CHOICE or PRACTICAL",
        message: "Loại bài kiểm tra không hợp lệ",
      });
    }

    const result = await examService.getExamsByType(examType, limit, offset);

    return res.status(200).json({
      success: true,
      data: result.data,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      message: "Exams retrieved successfully",
    });
  } catch (error) {
    console.error("Get exams by type error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: "Error retrieving exams",
    });
  }
};

// Update exam
const updateExam = async (req, res) => {
  try {
    const examId = parseInt(req.params.exam_id);
    const updates = req.body;

    if (!examId || isNaN(examId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid exam ID",
        message: "ID bài kiểm tra không hợp lệ",
      });
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: "No fields to update",
        message: "Không có trường nào để cập nhật",
      });
    }

    if (
      updates.exam_type &&
      !["MULTIPLE_CHOICE", "PRACTICAL"].includes(updates.exam_type)
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid exam type. Must be MULTIPLE_CHOICE or PRACTICAL",
        message: "Loại bài kiểm tra không hợp lệ",
      });
    }

    const exam = await examService.updateExam(examId, updates);

    return res.status(200).json({
      success: true,
      data: exam,
      message: "Exam updated successfully",
    });
  } catch (error) {
    if (error.message === "Exam not found") {
      return res.status(404).json({
        success: false,
        error: "Exam not found",
        message: "Không tìm thấy bài kiểm tra",
      });
    }

    console.error("Update exam error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: "Error updating exam",
    });
  }
};

// Delete exam
const deleteExam = async (req, res) => {
  try {
    const examId = parseInt(req.params.exam_id);

    if (!examId || isNaN(examId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid exam ID",
        message: "ID bài kiểm tra không hợp lệ",
      });
    }

    await examService.deleteExam(examId);

    return res.status(200).json({
      success: true,
      data: { exam_id: examId },
      message: "Exam deleted successfully",
    });
  } catch (error) {
    if (error.message === "Exam not found") {
      return res.status(404).json({
        success: false,
        error: "Exam not found",
        message: "Không tìm thấy bài kiểm tra",
      });
    }

    console.error("Delete exam error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: "Error deleting exam",
    });
  }
};

// Delete exams by classroom ID
const deleteExamsByClassroom = async (req, res) => {
  try {
    const classroomId = parseInt(req.params.classroom_id);

    if (!classroomId || isNaN(classroomId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid classroom ID",
        message: "ID lớp học không hợp lệ",
      });
    }

    const result = await examService.deleteExamsByClassroom(classroomId);

    return res.status(200).json({
      success: true,
      data: result,
      message: "Exams deleted successfully",
    });
  } catch (error) {
    console.error("Delete exams error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: "Error deleting exams",
    });
  }
};

// Submit exam (student submits their answers)
const submitExam = async (req, res) => {
  try {
    const examId = parseInt(req.params.exam_id);
    const { student_id, score, answers, time_spent } = req.body;
    const tokenUserId = req.user?.user_id ? parseInt(req.user.user_id) : null;

    if (!examId || isNaN(examId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid exam ID",
        message: "ID bài kiểm tra không hợp lệ",
      });
    }

    if (!tokenUserId || isNaN(tokenUserId)) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        message: "Không xác định được người dùng đăng nhập",
      });
    }

    if (student_id && parseInt(student_id) !== tokenUserId) {
      return res.status(403).json({
        success: false,
        error: "student_id does not match authenticated user",
        message: "ID học sinh không khớp với tài khoản đăng nhập",
      });
    }

    const result = await examService.submitExam(
      examId,
      tokenUserId,
      score,
      answers,
      time_spent,
    );

    return res.status(201).json({
      success: true,
      data: result,
      message: "Exam submitted successfully",
    });
  } catch (error) {
    console.error("Submit exam error:", error);
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      error: error.message,
      message: status >= 500 ? "Error submitting exam" : error.message,
    });
  }
};

// Get exam results
const getExamResults = async (req, res) => {
  try {
    const examId = parseInt(req.params.exam_id);
    const studentId = req.query.student_id
      ? parseInt(req.query.student_id)
      : null;

    if (!examId || isNaN(examId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid exam ID",
        message: "ID bài kiểm tra không hợp lệ",
      });
    }

    const results = await examService.getExamResults(examId, studentId);

    return res.status(200).json({
      success: true,
      data: results,
      message: "Exam results retrieved successfully",
    });
  } catch (error) {
    console.error("Get exam results error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: "Error retrieving exam results",
    });
  }
};

// Get exam statistics
const getExamStatistics = async (req, res) => {
  try {
    const classroomId = req.query.classroom_id
      ? parseInt(req.query.classroom_id)
      : null;
    const examType = req.query.exam_type || null;

    const stats = await examService.getExamStatistics(classroomId, examType);

    return res.status(200).json({
      success: true,
      data: stats,
      message: "Exam statistics retrieved successfully",
    });
  } catch (error) {
    console.error("Get exam statistics error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: "Error retrieving exam statistics",
    });
  }
};

// Get student exam attempts
const getStudentExamAttempts = async (req, res) => {
  try {
    const studentId = parseInt(req.params.student_id);
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    if (!studentId || isNaN(studentId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid student ID",
        message: "ID học sinh không hợp lệ",
      });
    }

    const result = await examService.getStudentExamAttempts(
      studentId,
      limit,
      offset,
    );

    return res.status(200).json({
      success: true,
      data: result.data,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      message: "Student exam attempts retrieved successfully",
    });
  } catch (error) {
    console.error("Get student exam attempts error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: "Error retrieving student exam attempts",
    });
  }
};

const submitPracticeExam = async (req, res) => {
  try {
    const { examId, userId } = req.body;
    if (!req.files || req.files.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No videos uploaded" });
    }

    // Create attempt
    const attempt = await examService.createPracticeAttempt(examId, userId);

    const results = [];
    for (const file of req.files) {
      const parts = file.originalname.split("-");
      let vocabularyId = null;
      if (parts.length >= 4) {
        vocabularyId = parts[3];
      }

      const rawExt = path.extname(file.originalname);
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const filename = uniqueSuffix + rawExt;

      await minioClient.putObject(
        bucketName,
        filename,
        file.buffer,
        file.size,
        { "Content-Type": file.mimetype },
      );

      const minioPath = `${process.env.MINIO_PUBLIC_URL || "http://localhost:9000"}/${bucketName}/${filename}`;

      await examService.savePracticeQuestionVideo(
        examId,
        userId,
        attempt.attemptId,
        vocabularyId,
        minioPath,
      );
      results.push(minioPath);
    }

    res.json({ success: true, videos: results });
  } catch (error) {
    console.error("Submit practice error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getPracticeSubmission = async (req, res) => {
  try {
    const examId = parseInt(req.params.examId);
    const studentId = parseInt(req.params.studentId);
    if (!examId || !studentId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing examId or studentId" });
    }

    const data = await examService.getPracticeSubmission(examId, studentId);
    return res.json({ success: true, data });
  } catch (error) {
    console.error("Get practice submission error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const markPracticeExam = async (req, res) => {
  try {
    const { examId, userId, score, details } = req.body;
    if (!examId || !userId) {
      return res.status(400).json({ success: false, message: "Missing param" });
    }

    await examService.markPracticeExam(examId, userId, score, details);
    return res.json({ success: true, message: "Marked successfully" });
  } catch (error) {
    console.error("Mark practice exam error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getAllPracticalSubmissions = async (req, res) => {
  try {
    const submissions = await examService.getAllPracticalSubmissions({});
    return res.json({ success: true, data: submissions });
  } catch (error) {
    console.error("Get all submissions error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createExam,
  getExams,
  getAllPracticalSubmissions,
  getExamById,
  getExamsByClassroom,
  getExamsByCreator,
  getExamsByType,
  updateExam,
  deleteExam,
  deleteExamsByClassroom,
  submitExam,
  getExamResults,
  getExamStatistics,
  getStudentExamAttempts,
  submitPracticeExam,
  getPracticeSubmission,
  markPracticeExam,
};
