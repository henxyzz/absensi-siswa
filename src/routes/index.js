const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const classRoutes = require('./classRoutes');
const teacherRoutes = require('./teacherRoutes');
const studentRoutes = require('./studentRoutes');
const attendanceRoutes = require('./attendanceRoutes');
const permissionRoutes = require('./permissionRoutes');
const adminRoutes = require('./adminRoutes');
const whatsappRoutes = require('./whatsappRoutes');

router.use('/auth', authRoutes);
router.use('/classes', classRoutes);
router.use('/teachers', teacherRoutes);
router.use('/students', studentRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/permissions', permissionRoutes);
router.use('/admin', adminRoutes);
router.use('/whatsapp', whatsappRoutes);

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'API is running', timestamp: new Date() });
});

module.exports = router;
