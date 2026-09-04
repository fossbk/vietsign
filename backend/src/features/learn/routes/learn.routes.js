const express = require("express");
const learnController = require("../controllers/learn.controller");
const { authRequired } = require("../../../middleware/auth.middleware");
const topicActivityController = require("../controllers/topicActivity.controller");

const router = express.Router();

// ============================================================================
// PUBLIC ROUTES (authentication optional, used for user progress if logged in)
// ============================================================================

// Categories
router.get("/categories", authRequired, learnController.getCategories);
router.get(
  "/categories/:slug",
  authRequired,
  learnController.getCategoryBySlug,
);

// Learn Items
router.get("/items/:itemId", authRequired, learnController.getItemById);
router.post("/items", authRequired, learnController.createItem);
router.put("/items/:itemId", authRequired, learnController.updateItem);
router.delete("/items/:itemId", authRequired, learnController.deleteItem);
router.get(
  "/items/:itemId/lessons",
  authRequired,
  learnController.getLessonsByItemId,
);
router.post(
  "/items/:itemId/lessons",
  authRequired,
  learnController.createLesson,
);

// Lessons & Steps
router.get("/lessons/:lessonId", authRequired, learnController.getLessonById);
router.put("/lessons/:lessonId", authRequired, learnController.updateLesson);
router.delete("/lessons/:lessonId", authRequired, learnController.deleteLesson);
router.get(
  "/lessons/:lessonId/steps",
  authRequired,
  learnController.getStepsForLesson,
);
router.post(
  "/lessons/:lessonId/steps",
  authRequired,
  learnController.createStep,
);
router.put("/steps/:stepId", authRequired, learnController.updateStep);
router.delete("/steps/:stepId", authRequired, learnController.deleteStep);

// Search
router.get("/search", authRequired, learnController.searchItems);

// Topic-based Learning (using existing topics)
router.get("/topics", authRequired, learnController.getTopicsForLearning);
router.get(
  "/topics/:topicId",
  authRequired,
  learnController.getTopicWithVocabularies,
);
router.get(
  "/topics/:topicId/steps",
  authRequired,
  learnController.getTopicLearningSteps,
);
router.post(
  "/topics/:topicId/quiz-attempts",
  authRequired,
  topicActivityController.saveQuizAttempt,
);
router.post(
  "/topics/:topicId/game-attempts",
  authRequired,
  topicActivityController.saveGameAttempt,
);

// ============================================================================
// PROTECTED ROUTES (requires authentication)
// ============================================================================

// Progress tracking
router.post("/progress", authRequired, learnController.updateProgress);
router.get("/progress", authRequired, learnController.getUserProgress);
router.get("/progress/:itemId", authRequired, learnController.getItemProgress);

// Vocabulary progress
router.post(
  "/vocabulary/learned",
  authRequired,
  learnController.markVocabularyLearned,
);
router.get(
  "/vocabulary/progress",
  authRequired,
  learnController.getVocabularyProgress,
);

module.exports = router;
