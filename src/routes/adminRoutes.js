const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, requireAdmin, requireSuperAdmin } = require('../middleware/auth');

router.get('/dashboard', verifyToken, requireAdmin, adminController.getDashboard);
router.get('/stats', verifyToken, requireAdmin, adminController.getSystemStats);
router.get('/audit-logs', verifyToken, requireAdmin, adminController.getAuditLogs);

router.get('/admins', verifyToken, requireSuperAdmin, adminController.getAllAdmins);
router.post('/admins', verifyToken, requireSuperAdmin, adminController.createAdmin);
router.put('/admins/:id', verifyToken, requireSuperAdmin, adminController.updateAdmin);
router.delete('/admins/:id', verifyToken, requireSuperAdmin, adminController.deleteAdmin);

module.exports = router;
