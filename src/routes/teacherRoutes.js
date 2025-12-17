const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');
const { verifyToken, requireAdmin, requireTeacher } = require('../middleware/auth');
const { uploadProfile, optimizeImage, handleUploadError } = require('../middleware/upload');

router.get('/', verifyToken, requireAdmin, teacherController.getAllTeachers);
router.get('/my-classes', verifyToken, requireTeacher, teacherController.getTeacherClasses);
router.get('/:id', verifyToken, teacherController.getTeacherById);
router.get('/:id/classes', verifyToken, requireAdmin, teacherController.getTeacherClasses);

router.post('/', verifyToken, requireAdmin, uploadProfile.single('profilePhoto'), optimizeImage, handleUploadError, teacherController.createTeacher);
router.put('/:id', verifyToken, requireAdmin, uploadProfile.single('profilePhoto'), optimizeImage, handleUploadError, teacherController.updateTeacher);
router.put('/:id/assign-classes', verifyToken, requireAdmin, teacherController.assignTeacherToClass);
router.delete('/:id', verifyToken, requireAdmin, teacherController.deleteTeacher);

module.exports = router;
