const express = require('express');
const { login, register, logout } = require('../controllers/auth.controller');
const { authRequired } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/login', login);
router.post('/register', register);
router.post('/logout', authRequired, logout);

module.exports = router;
