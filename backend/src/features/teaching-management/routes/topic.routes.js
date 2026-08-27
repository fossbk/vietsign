// Topic Routes - Aggregator
const express = require('express');
const topicController = require('../controllers/topic.controller');
const { authRequired } = require('../../../middleware/auth.middleware');
const checkOrgRole = require('../../../middleware/orgRole.middleware');

const router = express.Router();

router.post(
  '/',
  authRequired,
  checkOrgRole(['TEACHER', 'SUPER_ADMIN', 'CENTER_ADMIN', 'SCHOOL_ADMIN']),
  topicController.createTopic
);

router.get('/', authRequired, topicController.getTopics);
router.get('/search/by-name', authRequired, topicController.searchTopicsByName);
router.get('/statistics', authRequired, topicController.getTopicStatistics);
router.get('/classroom/:classroom_id', authRequired, topicController.getTopicsByClassroom);
router.get('/creator/:creator_id', authRequired, topicController.getTopicsByCreator);
router.get('/:topic_id', authRequired, topicController.getTopicById);

router.put(
  '/:topic_id',
  authRequired,
  checkOrgRole(['TEACHER', 'SUPER_ADMIN', 'CENTER_ADMIN', 'SCHOOL_ADMIN']),
  topicController.updateTopic
);

router.delete(
  '/:topic_id',
  authRequired,
  checkOrgRole(['SUPER_ADMIN', 'CENTER_ADMIN', 'SCHOOL_ADMIN']),
  topicController.deleteTopic
);

module.exports = router;
