const svc = require("../services/curriculum.services");

// 1. GET /lessons?level=L1&topic=BT
const getLessons = async (req, res) => {
  try {
    const data = await svc.getLessons({
      level: req.query.level,
      topic: req.query.topic,
    });
    return res.json({ success: true, data, message: "Danh sách bài học" });
  } catch (error) {
    console.error("getLessons error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 2. GET /lessons/:lessonCode
const getLessonByCode = async (req, res) => {
  try {
    const data = await svc.getLessonByCode(req.params.lessonCode);
    if (!data) {
      return res.status(404).json({ success: false, message: "Không tìm thấy bài học" });
    }
    return res.json({ success: true, data, message: "Chi tiết bài học" });
  } catch (error) {
    console.error("getLessonByCode error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 3. GET /activities/:activityCode
const getActivityByCode = async (req, res) => {
  try {
    const data = await svc.getActivityByCode(req.params.activityCode);
    if (!data) {
      return res.status(404).json({ success: false, message: "Không tìm thấy hoạt động" });
    }
    return res.json({ success: true, data, message: "Chi tiết hoạt động" });
  } catch (error) {
    console.error("getActivityByCode error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 4. POST /activities/:activityId/submit
const submitProgress = async (req, res) => {
  try {
    const activityId = Number(req.params.activityId);
    if (!activityId) {
      return res.status(400).json({ success: false, message: "activityId không hợp lệ" });
    }
    const data = await svc.submitGameProgress(req.user.user_id, activityId, req.body);
    return res.status(201).json({ success: true, data, message: "Đã lưu kết quả" });
  } catch (error) {
    console.error("submitProgress error:", error);
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// Helper to resolve role (checks req.user.role, req.user.code, or queries user.code in DB)
const getCallerRole = async (user) => {
  if (user?.role) return String(user.role).toLowerCase();
  if (user?.code) return String(user.code).toLowerCase();
  if (user?.user_id) {
    const code = await svc.getUserRole(user.user_id);
    return String(code || "").toLowerCase();
  }
  return "";
};

// 5. GET /users/:userId/progress?lessonCode=L1.BT.01
const getUserProgress = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const { lessonCode } = req.query;
    if (!userId || !lessonCode) {
      return res.status(400).json({ success: false, message: "userId và lessonCode là bắt buộc" });
    }

    // IDOR Protection: Students can only view their own progress; teachers/admins can view any
    if (userId !== req.user.user_id) {
      const userRole = await getCallerRole(req.user);
      if (userRole !== "teacher" && userRole !== "admin" && userRole !== "super_admin") {
        return res.status(403).json({ success: false, message: "Không có quyền xem dữ liệu này" });
      }
    }

    const data = await svc.getUserProgressByLesson(userId, lessonCode);
    return res.json({ success: true, data, message: "Tiến độ học viên" });
  } catch (error) {
    console.error("getUserProgress error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 6. GET /users/:userId/activities/:activityId/history
const getActivityHistory = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const activityId = Number(req.params.activityId);
    if (!userId || !activityId) {
      return res.status(400).json({ success: false, message: "userId và activityId không hợp lệ" });
    }

    // IDOR Protection: Students can only view their own history; teachers/admins can view any
    if (userId !== req.user.user_id) {
      const userRole = await getCallerRole(req.user);
      if (userRole !== "teacher" && userRole !== "admin" && userRole !== "super_admin") {
        return res.status(403).json({ success: false, message: "Không có quyền xem dữ liệu này" });
      }
    }

    const data = await svc.getActivityHistory(userId, activityId);
    return res.json({ success: true, data, message: "Lịch sử làm bài" });
  } catch (error) {
    console.error("getActivityHistory error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 7. PATCH /progress/:progressId/feedback
const updateFeedback = async (req, res) => {
  try {
    const progressId = Number(req.params.progressId);
    if (!progressId) {
      return res.status(400).json({ success: false, message: "progressId không hợp lệ" });
    }
    const { teacherFeedback } = req.body;
    if (teacherFeedback == null) {
      return res.status(400).json({ success: false, message: "teacherFeedback là bắt buộc" });
    }

    // Only teachers and admins can leave feedback
    const userRole = await getCallerRole(req.user);
    if (userRole !== "teacher" && userRole !== "admin" && userRole !== "super_admin") {
      return res.status(403).json({ success: false, message: "Chỉ giáo viên hoặc admin mới có quyền nhận xét bài làm" });
    }

    const data = await svc.updateFeedback(progressId, teacherFeedback);
    return res.json({ success: true, data, message: "Đã cập nhật nhận xét" });
  } catch (error) {
    console.error("updateFeedback error:", error);
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getLessons,
  getLessonByCode,
  getActivityByCode,
  submitProgress,
  getUserProgress,
  getActivityHistory,
  updateFeedback,
};
