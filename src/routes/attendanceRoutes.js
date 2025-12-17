const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { verifyToken, requireTeacher } = require('../middleware/auth');

router.get('/summary', verifyToken, attendanceController.getTodayAttendanceSummary);
router.get('/class/:classId', verifyToken, requireTeacher, attendanceController.getAttendanceByClass);
router.get('/student/:studentId', verifyToken, attendanceController.getAttendanceByStudent);

router.post('/', verifyToken, requireTeacher, attendanceController.markAttendance);
router.post('/bulk', verifyToken, requireTeacher, attendanceController.bulkMarkAttendance);
router.put('/:id', verifyToken, requireTeacher, attendanceController.updateAttendance);

module.exports = router;
