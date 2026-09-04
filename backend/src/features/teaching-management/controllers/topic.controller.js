const topicService = require("../services/topic.services");
const topicActivityService = require("../../learn/services/topicActivity.services");

const sendTopicError = (res, error, fallbackMessage) => {
  const status = error.status || 500;
  return res.status(status).json({
    success: false,
    error: error.message || fallbackMessage,
    message: error.message || fallbackMessage,
  });
};

/**
 * Topic Management Controller
 * Handles HTTP requests for topic management operations
 */

// Create new topic
const createTopic = async (req, res) => {
  try {
    const {
      name,
      classroom_id,
      image_location,
      description,
      is_common,
    } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({
        success: false,
        error: "Topic name is required",
        message: "Tên chủ đề là bắt buộc",
      });
    }

    const topic = await topicService.createTopic(
      name,
      classroom_id,
      image_location,
      description,
      req.user ? req.user.user_id : null,
      is_common || false,
    );

    return res.status(201).json({
      success: true,
      data: topic,
      message: "Topic created successfully",
    });
  } catch (error) {
    if (error.message.includes("already exists")) {
      return res.status(409).json({
        success: false,
        error: "Topic name already exists",
        message: "Tên chủ đề đã tồn tại",
      });
    }

    console.error("Create topic error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: "Error creating topic",
    });
  }
};

const getMyTopics = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 1000;
    const offset = parseInt(req.query.offset) || 0;
    const result = await topicService.getTopicsByOwner(
      req.user.user_id,
      limit,
      offset,
    );
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return sendTopicError(res, error, "Không thể tải danh sách chủ đề");
  }
};

const getAvailableTopicsForClassroom = async (req, res) => {
  try {
    const classroomId = parseInt(req.params.classroom_id);
    const data = await topicService.getAvailableTopicsForClassroom(
      req.user.user_id,
      classroomId,
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendTopicError(res, error, "Không thể tải chủ đề khả dụng");
  }
};

const assignTopicsToClassroom = async (req, res) => {
  try {
    const classroomId = parseInt(req.params.classroom_id);
    const result = await topicService.assignTopicsToClassroom(
      req.user.user_id,
      classroomId,
      req.body.topic_ids,
    );
    return res.status(201).json({
      success: true,
      data: result.data,
      total: result.total,
      message: "Đã thêm chủ đề vào lớp học",
    });
  } catch (error) {
    return sendTopicError(res, error, "Thêm chủ đề vào lớp thất bại");
  }
};

const removeTopicFromClassroom = async (req, res) => {
  try {
    const result = await topicService.removeTopicFromClassroom(
      req.user.user_id,
      parseInt(req.params.classroom_id),
      parseInt(req.params.topic_id),
    );
    return res.status(200).json({
      success: true,
      data: result,
      message: "Đã gỡ chủ đề khỏi lớp học",
    });
  } catch (error) {
    return sendTopicError(res, error, "Gỡ chủ đề khỏi lớp thất bại");
  }
};

const getTopicVocabularies = async (req, res) => {
  try {
    const topicId = parseInt(req.params.topic_id);
    if (!topicId) {
      return res.status(400).json({
        success: false,
        message: "ID chủ đề không hợp lệ",
      });
    }
    const data = await topicService.getTopicVocabularies(topicId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendTopicError(res, error, "Không thể tải từ vựng của chủ đề");
  }
};

const replaceTopicVocabularies = async (req, res) => {
  try {
    const topicId = parseInt(req.params.topic_id);
    if (!topicId || !Array.isArray(req.body.vocabulary_ids)) {
      return res.status(400).json({
        success: false,
        message: "Danh sách từ vựng không hợp lệ",
      });
    }
    const data = await topicService.replaceTopicVocabularies(
      req.user.user_id,
      topicId,
      req.body.vocabulary_ids,
    );
    return res.status(200).json({
      success: true,
      data,
      message: "Đã cập nhật bộ từ vựng của chủ đề",
    });
  } catch (error) {
    return sendTopicError(res, error, "Cập nhật từ vựng thất bại");
  }
};

// Get all topics with pagination and filtering
const getTopics = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    const classroomId = req.query.classroom_id
      ? parseInt(req.query.classroom_id)
      : null;
    const creatorId = req.query.creator_id
      ? parseInt(req.query.creator_id)
      : null;
    const isCommon =
      req.query.is_common !== undefined ? req.query.is_common === "true" : null;

    const result = await topicService.getTopics(
      limit,
      offset,
      classroomId,
      creatorId,
      isCommon,
    );

    return res.status(200).json({
      success: true,
      data: result.data,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      message: "Topics retrieved successfully",
    });
  } catch (error) {
    console.error("Get topics error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: "Error retrieving topics",
    });
  }
};

// Get topic by ID
const getTopicById = async (req, res) => {
  try {
    const topicId = parseInt(req.params.topic_id);

    if (!topicId || isNaN(topicId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid topic ID",
        message: "ID chủ đề không hợp lệ",
      });
    }

    const topic = await topicService.getTopicById(topicId);

    return res.status(200).json({
      success: true,
      data: topic,
      message: "Topic retrieved successfully",
    });
  } catch (error) {
    if (error.message === "Topic not found") {
      return res.status(404).json({
        success: false,
        error: "Topic not found",
        message: "Không tìm thấy chủ đề",
      });
    }

    console.error("Get topic error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: "Error retrieving topic",
    });
  }
};

// Get topics by classroom ID
const getTopicsByClassroom = async (req, res) => {
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

    const result = await topicService.getTopicsByClassroom(
      classroomId,
      limit,
      offset,
      req.user.user_id,
    );

    return res.status(200).json({
      success: true,
      data: result.data,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      message: "Topics retrieved successfully",
    });
  } catch (error) {
    console.error("Get topics by classroom error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: "Error retrieving topics",
    });
  }
};

// Get topics by creator ID
const getTopicsByCreator = async (req, res) => {
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

    const result = await topicService.getTopicsByCreator(
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
      message: "Topics retrieved successfully",
    });
  } catch (error) {
    console.error("Get topics by creator error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: "Error retrieving topics",
    });
  }
};

// Search topics by name
const searchTopicsByName = async (req, res) => {
  try {
    const name = req.query.name;
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: "Name parameter is required",
        message: "Tham số tên là bắt buộc",
      });
    }

    const result = await topicService.searchTopicsByName(name, limit, offset);

    return res.status(200).json({
      success: true,
      data: result.data,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      message: "Topics retrieved successfully",
    });
  } catch (error) {
    console.error("Search topics error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: "Error searching topics",
    });
  }
};

// Update topic
const updateTopic = async (req, res) => {
  try {
    const topicId = parseInt(req.params.topic_id);
    const updates = req.body;

    if (!topicId || isNaN(topicId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid topic ID",
        message: "ID chủ đề không hợp lệ",
      });
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: "No fields to update",
        message: "Không có trường nào để cập nhật",
      });
    }

    const topic = await topicService.updateTopic(
      topicId,
      updates,
      req.user.user_id,
    );

    return res.status(200).json({
      success: true,
      data: topic,
      message: "Topic updated successfully",
    });
  } catch (error) {
    if (error.message === "Topic not found") {
      return res.status(404).json({
        success: false,
        error: "Topic not found",
        message: "Không tìm thấy chủ đề",
      });
    }

    if (error.message.includes("already exists")) {
      return res.status(409).json({
        success: false,
        error: "Topic name already exists",
        message: "Tên chủ đề đã tồn tại",
      });
    }

    console.error("Update topic error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: "Error updating topic",
    });
  }
};

// Delete topic
const deleteTopic = async (req, res) => {
  try {
    const topicId = parseInt(req.params.topic_id);

    if (!topicId || isNaN(topicId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid topic ID",
        message: "ID chủ đề không hợp lệ",
      });
    }

    await topicService.deleteTopic(topicId, req.user.user_id);

    return res.status(200).json({
      success: true,
      data: { topic_id: topicId },
      message: "Topic deleted successfully",
    });
  } catch (error) {
    if (error.message === "Topic not found") {
      return res.status(404).json({
        success: false,
        error: "Topic not found",
        message: "Không tìm thấy chủ đề",
      });
    }

    console.error("Delete topic error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: "Error deleting topic",
    });
  }
};

// Delete topics by classroom ID
const deleteTopicsByClassroom = async (req, res) => {
  try {
    const classroomId = parseInt(req.params.classroom_id);

    if (!classroomId || isNaN(classroomId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid classroom ID",
        message: "ID lớp học không hợp lệ",
      });
    }

    const result = await topicService.deleteTopicsByClassroom(classroomId);

    return res.status(200).json({
      success: true,
      data: result,
      message: "Topics deleted successfully",
    });
  } catch (error) {
    console.error("Delete topics error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: "Error deleting topics",
    });
  }
};

// Get topic statistics
const getTopicStatistics = async (req, res) => {
  try {
    const classroomId = req.query.classroom_id
      ? parseInt(req.query.classroom_id)
      : null;

    const stats = await topicService.getTopicStatistics(classroomId);

    return res.status(200).json({
      success: true,
      data: stats,
      message: "Topic statistics retrieved successfully",
    });
  } catch (error) {
    console.error("Get topic statistics error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: "Error retrieving topic statistics",
    });
  }
};

const getTopicStudentStatistics = async (req, res) => {
  try {
    const classroomId = Number(req.params.classroom_id);
    const topicId = Number(req.params.topic_id);
    if (!classroomId || !topicId) {
      return res.status(400).json({ success: false, message: "ID lớp hoặc chủ đề không hợp lệ" });
    }
    await topicService.assertCanViewClassroom(req.user.user_id, classroomId);
    const data = await topicActivityService.getTopicStudentStatistics(topicId, classroomId);
    return res.status(200).json({ success: true, data, total: data.length, message: "Đã lấy thống kê chủ đề" });
  } catch (error) {
    return sendTopicError(res, error, "Không thể lấy thống kê chủ đề");
  }
};

module.exports = {
  createTopic,
  getMyTopics,
  getAvailableTopicsForClassroom,
  assignTopicsToClassroom,
  removeTopicFromClassroom,
  getTopicVocabularies,
  replaceTopicVocabularies,
  getTopics,
  getTopicById,
  getTopicsByClassroom,
  getTopicsByCreator,
  searchTopicsByName,
  updateTopic,
  deleteTopic,
  deleteTopicsByClassroom,
  getTopicStatistics,
  getTopicStudentStatistics,
};
