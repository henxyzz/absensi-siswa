const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimit');

router.post('/admin/login', loginLimiter, authController.adminLogin);
router.post('/teacher/login', loginLimiter, authController.teacherLogin);
router.post('/student/login', loginLimiter, authController.studentLogin);

router.get('/profile', verifyToken, authController.getProfile);
router.put('/change-password', verifyToken, authController.changePassword);

module.exports = router;
