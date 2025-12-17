const { Admin, AuditLog, Student, Teacher, Class, Attendance } = require('../models');
const { logFromRequest } = require('../utils/auditLogger');
const { paginateResults, buildPaginationResponse, getStartOfDay, getEndOfDay } = require('../utils/helpers');

const getDashboard = async (req, res) => {
  try {
    const today = getStartOfDay();

    const [
      totalStudents,
      totalTeachers,
      totalClasses,
      todayAttendance,
      recentLogs
    ] = await Promise.all([
      Student.countDocuments({ status: 'active' }),
      Teacher.countDocuments({ isActive: true }),
      Class.countDocuments({ isActive: true }),
      Attendance.aggregate([
        { $match: { date: { $gte: today, $lte: getEndOfDay() } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      AuditLog.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .select('action entityType userName description createdAt')
    ]);

    const attendanceSummary = todayAttendance.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, { hadir: 0, izin: 0, sakit: 0, alpha: 0, terlambat: 0 });

    res.json({
      success: true,
      data: {
        statistics: {
          totalStudents,
          totalTeachers,
          totalClasses,
          todayAttendanceRecorded: Object.values(attendanceSummary).reduce((a, b) => a + b, 0)
        },
        todayAttendance: attendanceSummary,
        recentActivities: recentLogs
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const getAllAdmins = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const { skip, limit: limitNum } = paginateResults(page, limit);

    const [admins, total] = await Promise.all([
      Admin.find()
        .select('-password')
        .skip(skip)
        .limit(limitNum)
        .sort({ createdAt: -1 }),
      Admin.countDocuments()
    ]);

    res.json({
      success: true,
      ...buildPaginationResponse(admins, total, page, limit)
    });
  } catch (error) {
    console.error('Get admins error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const createAdmin = async (req, res) => {
  try {
    const { username, password, fullName, email, role, phone } = req.body;

    if (!username || !password || !fullName || !email) {
      return res.status(400).json({ success: false, message: 'Data wajib belum lengkap' });
    }

    const existingAdmin = await Admin.findOne({ $or: [{ username }, { email }] });
    if (existingAdmin) {
      return res.status(400).json({ success: false, message: 'Username atau email sudah terdaftar' });
    }

    const admin = new Admin({
      username,
      password,
      fullName,
      email,
      role: role || 'ADMIN',
      phone,
      createdBy: req.user.id
    });

    await admin.save();

    await logFromRequest(req, 'CREATE', 'Admin', admin._id, `Admin ${fullName} berhasil dibuat`);

    res.status(201).json({
      success: true,
      message: 'Admin berhasil dibuat',
      data: admin.toJSON()
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const updateAdmin = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin tidak ditemukan' });
    }

    const { fullName, email, role, phone, isActive } = req.body;

    if (fullName) admin.fullName = fullName;
    if (email) admin.email = email;
    if (role && req.user.role === 'SUPER_ADMIN') admin.role = role;
    if (phone) admin.phone = phone;
    if (isActive !== undefined) admin.isActive = isActive;

    await admin.save();

    await logFromRequest(req, 'UPDATE', 'Admin', admin._id, `Data admin ${admin.fullName} diupdate`);

    res.json({
      success: true,
      message: 'Data admin berhasil diupdate',
      data: admin.toJSON()
    });
  } catch (error) {
    console.error('Update admin error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const deleteAdmin = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin tidak ditemukan' });
    }

    if (admin.role === 'SUPER_ADMIN' && admin.isBootstrapped) {
      return res.status(400).json({ success: false, message: 'Super admin bootstrap tidak bisa dihapus' });
    }

    if (admin._id.toString() === req.user.id.toString()) {
      return res.status(400).json({ success: false, message: 'Tidak bisa menghapus diri sendiri' });
    }

    await Admin.findByIdAndDelete(req.params.id);

    await logFromRequest(req, 'DELETE', 'Admin', admin._id, `Admin ${admin.fullName} dihapus`);

    res.json({ success: true, message: 'Admin berhasil dihapus' });
  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20, action, entityType, userId, startDate, endDate } = req.query;
    const { skip, limit: limitNum } = paginateResults(page, limit);

    const filter = {};
    if (action) filter.action = action;
    if (entityType) filter.entityType = entityType;
    if (userId) filter.userId = userId;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .skip(skip)
        .limit(limitNum)
        .sort({ createdAt: -1 }),
      AuditLog.countDocuments(filter)
    ]);

    res.json({
      success: true,
      ...buildPaginationResponse(logs, total, page, limit)
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const getSystemStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const attendanceStats = await Attendance.aggregate([
      { $match: dateFilter.date ? { date: dateFilter } : {} },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          total: { $sum: 1 },
          hadir: { $sum: { $cond: [{ $eq: ['$status', 'hadir'] }, 1, 0] } },
          izin: { $sum: { $cond: [{ $eq: ['$status', 'izin'] }, 1, 0] } },
          sakit: { $sum: { $cond: [{ $eq: ['$status', 'sakit'] }, 1, 0] } },
          alpha: { $sum: { $cond: [{ $eq: ['$status', 'alpha'] }, 1, 0] } }
        }
      },
      { $sort: { _id: -1 } },
      { $limit: 30 }
    ]);

    res.json({
      success: true,
      data: {
        attendanceStats
      }
    });
  } catch (error) {
    console.error('Get system stats error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

module.exports = {
  getDashboard,
  getAllAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  getAuditLogs,
  getSystemStats
};
