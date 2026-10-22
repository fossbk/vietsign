const express = require('express');
const {
  login,
  register,
  logout,
  verify,
  forgotPassword,
  resetPassword,
} = require('../controllers/auth.controller');
const { authRequired } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/login', login);
router.post('/register', register);
router.post('/logout', authRequired, logout);
router.get('/verify', authRequired, verify);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;
