const express = require('express');
const router = express.Router();
const permissionController = require('../controllers/permissionController');
const { verifyToken, requireTeacher } = require('../middleware/auth');
const { uploadDocument, handleUploadError } = require('../middleware/upload');

router.get('/', verifyToken, requireTeacher, permissionController.getAllPermissions);
router.get('/:id', verifyToken, permissionController.getPermissionById);
router.get('/student/:studentId', verifyToken, permissionController.getStudentPermissions);

router.post('/', verifyToken, uploadDocument.array('attachments', 3), handleUploadError, permissionController.submitPermission);
router.put('/:id/approve', verifyToken, requireTeacher, permissionController.approvePermission);
router.put('/:id/reject', verifyToken, requireTeacher, permissionController.rejectPermission);

module.exports = router;
