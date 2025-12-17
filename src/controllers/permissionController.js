const { Permission, Student, Attendance } = require('../models');
const { logFromRequest } = require('../utils/auditLogger');
const { paginateResults, buildPaginationResponse, getStartOfDay, getEndOfDay } = require('../utils/helpers');

const submitPermission = async (req, res) => {
  try {
    const { studentId, type, startDate, endDate, reason, submittedVia = 'web' } = req.body;

    if (!studentId || !type || !startDate || !endDate || !reason) {
      return res.status(400).json({ success: false, message: 'Data wajib belum lengkap' });
    }

    const student = await Student.findById(studentId).populate('classId');
    if (!student) {
      return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan' });
    }

    const attachments = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        attachments.push({
          filename: file.filename,
          originalName: file.originalname,
          path: `/uploads/documents/${file.filename}`,
          mimetype: file.mimetype
        });
      }
    }

    const permission = new Permission({
      studentId,
      classId: student.classId._id,
      type,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason,
      attachments,
      submittedVia,
      createdBy: req.user?.id || studentId,
      creatorModel: req.user?.userType ? req.user.userType.charAt(0).toUpperCase() + req.user.userType.slice(1) : 'Student'
    });

    await permission.save();

    if (req.user) {
      await logFromRequest(req, 'PERMISSION_SUBMITTED', 'Permission', permission._id,
        `Pengajuan ${type} oleh ${student.fullName}`);
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('permission:new', {
        studentId,
        studentName: student.fullName,
        classId: student.classId._id,
        className: student.classId.name,
        type,
        startDate,
        endDate
      });
    }

    res.status(201).json({
      success: true,
      message: 'Pengajuan berhasil dikirim',
      data: permission
    });
  } catch (error) {
    console.error('Submit permission error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const getAllPermissions = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, type, classId } = req.query;
    const { skip, limit: limitNum } = paginateResults(page, limit);

    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (classId) filter.classId = classId;

    if (req.user.userType === 'teacher') {
      const teacher = req.user.data;
      const allowedClasses = [...(teacher.assignedClasses || [])];
      if (teacher.homeroomClass) allowedClasses.push(teacher.homeroomClass);
      filter.classId = { $in: allowedClasses };
    }

    const [permissions, total] = await Promise.all([
      Permission.find(filter)
        .populate('studentId', 'nis fullName profilePhoto')
        .populate('classId', 'name grade')
        .populate('approvedBy', 'fullName')
        .skip(skip)
        .limit(limitNum)
        .sort({ createdAt: -1 }),
      Permission.countDocuments(filter)
    ]);

    res.json({
      success: true,
      ...buildPaginationResponse(permissions, total, page, limit)
    });
  } catch (error) {
    console.error('Get permissions error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const getPermissionById = async (req, res) => {
  try {
    const permission = await Permission.findById(req.params.id)
      .populate('studentId', 'nis fullName profilePhoto whatsappNumber')
      .populate('classId', 'name grade')
      .populate('approvedBy', 'fullName');

    if (!permission) {
      return res.status(404).json({ success: false, message: 'Pengajuan tidak ditemukan' });
    }

    res.json({ success: true, data: permission });
  } catch (error) {
    console.error('Get permission error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const approvePermission = async (req, res) => {
  try {
    const permission = await Permission.findById(req.params.id)
      .populate('studentId', 'fullName whatsappNumber classId');

    if (!permission) {
      return res.status(404).json({ success: false, message: 'Pengajuan tidak ditemukan' });
    }

    if (permission.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Pengajuan sudah diproses' });
    }

    permission.status = 'approved';
    permission.approvedBy = req.user.id;
    permission.approvedAt = new Date();
    await permission.save();

    const start = getStartOfDay(permission.startDate);
    const end = getEndOfDay(permission.endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    for (let i = 0; i < days; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);

      await Attendance.findOneAndUpdate(
        { studentId: permission.studentId._id, date: { $gte: getStartOfDay(date), $lte: getEndOfDay(date) } },
        {
          $set: {
            status: permission.type,
            notes: `Auto: ${permission.type} - ${permission.reason}`,
            method: 'auto'
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    await logFromRequest(req, 'PERMISSION_APPROVED', 'Permission', permission._id,
      `Pengajuan ${permission.type} ${permission.studentId.fullName} disetujui`);

    const io = req.app.get('io');
    if (io) {
      io.emit('permission:approved', {
        permissionId: permission._id,
        studentName: permission.studentId.fullName,
        type: permission.type
      });
    }

    res.json({
      success: true,
      message: 'Pengajuan berhasil disetujui',
      data: permission
    });
  } catch (error) {
    console.error('Approve permission error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const rejectPermission = async (req, res) => {
  try {
    const { reason } = req.body;
    const permission = await Permission.findById(req.params.id)
      .populate('studentId', 'fullName');

    if (!permission) {
      return res.status(404).json({ success: false, message: 'Pengajuan tidak ditemukan' });
    }

    if (permission.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Pengajuan sudah diproses' });
    }

    permission.status = 'rejected';
    permission.rejectionReason = reason;
    permission.approvedBy = req.user.id;
    permission.approvedAt = new Date();
    await permission.save();

    await logFromRequest(req, 'PERMISSION_REJECTED', 'Permission', permission._id,
      `Pengajuan ${permission.type} ${permission.studentId.fullName} ditolak: ${reason}`);

    res.json({
      success: true,
      message: 'Pengajuan berhasil ditolak',
      data: permission
    });
  } catch (error) {
    console.error('Reject permission error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const getStudentPermissions = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const { skip, limit: limitNum } = paginateResults(page, limit);

    const [permissions, total] = await Promise.all([
      Permission.find({ studentId })
        .populate('approvedBy', 'fullName')
        .skip(skip)
        .limit(limitNum)
        .sort({ createdAt: -1 }),
      Permission.countDocuments({ studentId })
    ]);

    res.json({
      success: true,
      ...buildPaginationResponse(permissions, total, page, limit)
    });
  } catch (error) {
    console.error('Get student permissions error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

module.exports = {
  submitPermission,
  getAllPermissions,
  getPermissionById,
  approvePermission,
  rejectPermission,
  getStudentPermissions
};
