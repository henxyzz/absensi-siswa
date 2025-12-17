const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { verifyToken, requireAdmin, requireTeacher } = require('../middleware/auth');
const { uploadProfile, optimizeImage, handleUploadError } = require('../middleware/upload');

router.get('/', verifyToken, requireTeacher, studentController.getAllStudents);
router.get('/:id', verifyToken, studentController.getStudentById);

router.post('/', verifyToken, requireAdmin, uploadProfile.single('profilePhoto'), optimizeImage, handleUploadError, studentController.createStudent);
router.post('/bulk', verifyToken, requireAdmin, studentController.bulkCreateStudents);
router.put('/:id', verifyToken, requireAdmin, uploadProfile.single('profilePhoto'), optimizeImage, handleUploadError, studentController.updateStudent);
router.delete('/:id', verifyToken, requireAdmin, studentController.deleteStudent);

module.exports = router;
