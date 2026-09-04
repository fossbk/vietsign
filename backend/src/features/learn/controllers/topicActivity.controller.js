const activityService = require("../services/topicActivity.services");

const saveQuizAttempt = async (req, res) => {
  try {
    const topicId = Number(req.params.topicId);
    if (!topicId || !req.body) {
      return res.status(400).json({ success: false, message: "Dữ liệu bài kiểm tra không hợp lệ" });
    }
    const data = await activityService.recordQuizAttempt(req.user.user_id, topicId, req.body);
    return res.status(201).json({ success: true, data, message: "Đã lưu kết quả kiểm tra" });
  } catch (error) {
    console.error("Save topic quiz attempt error:", error);
    return res.status(error.status || 500).json({ success: false, message: error.message || "Không thể lưu kết quả kiểm tra" });
  }
};

const saveGameAttempt = async (req, res) => {
  try {
    const topicId = Number(req.params.topicId);
    if (!topicId || !req.body) {
      return res.status(400).json({ success: false, message: "Dữ liệu trò chơi không hợp lệ" });
    }
    const data = await activityService.recordGameAttempt(req.user.user_id, topicId, req.body);
    return res.status(201).json({ success: true, data, message: "Đã lưu kết quả trò chơi" });
  } catch (error) {
    console.error("Save topic game attempt error:", error);
    return res.status(error.status || 500).json({ success: false, message: error.message || "Không thể lưu kết quả trò chơi" });
  }
};

module.exports = { saveQuizAttempt, saveGameAttempt };
