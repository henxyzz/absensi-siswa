const express = require('express');
const router = express.Router();
const classController = require('../controllers/classController');
const { verifyToken, requireAdmin, requireTeacher } = require('../middleware/auth');

router.get('/', verifyToken, classController.getAllClasses);
router.get('/:id', verifyToken, classController.getClassById);
router.get('/:id/students', verifyToken, requireTeacher, classController.getClassStudents);

router.post('/', verifyToken, requireAdmin, classController.createClass);
router.put('/:id', verifyToken, requireAdmin, classController.updateClass);
router.delete('/:id', verifyToken, requireAdmin, classController.deleteClass);

module.exports = router;
