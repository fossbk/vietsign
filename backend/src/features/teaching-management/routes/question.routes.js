// Question Routes - Aggregator
const express = require('express');
const questionController = require('../controllers/question.controller');
const { authRequired } = require('../../../middleware/auth.middleware');
const checkOrgRole = require('../../../middleware/orgRole.middleware');

const router = express.Router();

router.post(
  '/',
  authRequired,
  checkOrgRole(['TEACHER', 'SUPER_ADMIN', 'CENTER_ADMIN', 'SCHOOL_ADMIN']),
  questionController.createQuestion
);

router.get('/', authRequired, questionController.getQuestions);
router.get('/search/by-content', authRequired, questionController.searchQuestionsByContent);
router.get('/statistics', authRequired, questionController.getQuestionStatistics);
router.get('/classroom/:classroom_id', authRequired, questionController.getQuestionsByClassroom);
router.get('/creator/:creator_id', authRequired, questionController.getQuestionsByCreator);
router.get('/:question_id', authRequired, questionController.getQuestionById);

router.put(
  '/:question_id',
  authRequired,
  checkOrgRole(['TEACHER', 'SUPER_ADMIN', 'CENTER_ADMIN', 'SCHOOL_ADMIN']),
  questionController.updateQuestion
);

router.delete(
  '/:question_id',
  authRequired,
  checkOrgRole(['TEACHER', 'SUPER_ADMIN', 'CENTER_ADMIN', 'SCHOOL_ADMIN']),
  questionController.deleteQuestion
);

module.exports = router;
