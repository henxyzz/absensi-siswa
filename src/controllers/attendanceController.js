const { Attendance, Student, Class } = require('../models');
const { logFromRequest } = require('../utils/auditLogger');
const { getStartOfDay, getEndOfDay, paginateResults, buildPaginationResponse, formatDate } = require('../utils/helpers');
const { isWithinSchoolArea } = require('../utils/geofence');

const markAttendance = async (req, res) => {
  try {
    const { studentId, status, location, notes, method = 'manual' } = req.body;

    const student = await Student.findById(studentId).populate('classId');
    if (!student) {
      return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan' });
    }

    const today = getStartOfDay();
    const existingAttendance = await Attendance.findOne({
      studentId,
      date: { $gte: today, $lte: getEndOfDay() }
    });

    if (existingAttendance) {
      return res.status(400).json({ success: false, message: 'Absensi hari ini sudah tercatat' });
    }

    let geofenceResult = null;
    if (location && location.latitude && location.longitude) {
      geofenceResult = isWithinSchoolArea(location.latitude, location.longitude);
    }

    const attendance = new Attendance({
      studentId,
      classId: student.classId._id,
      date: today,
      status,
      checkInTime: new Date(),
      location,
      isWithinGeofence: geofenceResult?.isWithin || null,
      method,
      notes,
      createdBy: req.user?.id,
      creatorModel: req.user?.userType ? req.user.userType.charAt(0).toUpperCase() + req.user.userType.slice(1) : 'System'
    });

    await attendance.save();

    if (req.user) {
      await logFromRequest(req, 'ATTENDANCE_MARKED', 'Attendance', attendance._id, 
        `Absensi ${student.fullName} tercatat: ${status}`);
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('attendance:new', {
        studentId,
        studentName: student.fullName,
        classId: student.classId._id,
        className: student.classId.name,
        status,
        time: new Date()
      });
    }

    res.status(201).json({
      success: true,
      message: 'Absensi berhasil dicatat',
      data: {
        attendance,
        geofence: geofenceResult
      }
    });
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const bulkMarkAttendance = async (req, res) => {
  try {
    const { classId, date, attendances } = req.body;

    if (!classId || !attendances || !Array.isArray(attendances)) {
      return res.status(400).json({ success: false, message: 'Data tidak valid' });
    }

    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({ success: false, message: 'Kelas tidak ditemukan' });
    }

    const targetDate = date ? getStartOfDay(new Date(date)) : getStartOfDay();
    const results = { success: 0, failed: 0, skipped: 0 };

    for (const att of attendances) {
      try {
        const existing = await Attendance.findOne({
          studentId: att.studentId,
          date: { $gte: targetDate, $lte: getEndOfDay(targetDate) }
        });

        if (existing) {
          existing.status = att.status;
          existing.notes = att.notes;
          await existing.save();
          results.success++;
        } else {
          const newAttendance = new Attendance({
            studentId: att.studentId,
            classId,
            date: targetDate,
            status: att.status,
            checkInTime: new Date(),
            method: 'manual',
            notes: att.notes,
            createdBy: req.user.id,
            creatorModel: req.user.userType.charAt(0).toUpperCase() + req.user.userType.slice(1)
          });
          await newAttendance.save();
          results.success++;
        }
      } catch (error) {
        results.failed++;
      }
    }

    await logFromRequest(req, 'ATTENDANCE_MARKED', 'Attendance', classId,
      `Bulk absensi kelas ${classData.name}: ${results.success} berhasil, ${results.failed} gagal`);

    res.json({
      success: true,
      message: `Absensi berhasil dicatat: ${results.success} siswa`,
      data: results
    });
  } catch (error) {
    console.error('Bulk mark attendance error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const getAttendanceByClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const { date, startDate, endDate, page = 1, limit = 50 } = req.query;
    const { skip, limit: limitNum } = paginateResults(page, limit);

    const filter = { classId };

    if (date) {
      const targetDate = new Date(date);
      filter.date = { $gte: getStartOfDay(targetDate), $lte: getEndOfDay(targetDate) };
    } else if (startDate && endDate) {
      filter.date = { $gte: getStartOfDay(new Date(startDate)), $lte: getEndOfDay(new Date(endDate)) };
    } else {
      filter.date = { $gte: getStartOfDay(), $lte: getEndOfDay() };
    }

    const [attendances, total] = await Promise.all([
      Attendance.find(filter)
        .populate('studentId', 'nis fullName profilePhoto')
        .skip(skip)
        .limit(limitNum)
        .sort({ 'studentId.fullName': 1 }),
      Attendance.countDocuments(filter)
    ]);

    res.json({
      success: true,
      ...buildPaginationResponse(attendances, total, page, limit)
    });
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const getAttendanceByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { month, year, page = 1, limit = 31 } = req.query;
    const { skip, limit: limitNum } = paginateResults(page, limit);

    const filter = { studentId };

    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      filter.date = { $gte: startDate, $lte: endDate };
    }

    const [attendances, total, summary] = await Promise.all([
      Attendance.find(filter)
        .skip(skip)
        .limit(limitNum)
        .sort({ date: -1 }),
      Attendance.countDocuments(filter),
      Attendance.aggregate([
        { $match: filter },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ]);

    const summaryObj = summary.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, { hadir: 0, izin: 0, sakit: 0, alpha: 0, terlambat: 0 });

    res.json({
      success: true,
      ...buildPaginationResponse(attendances, total, page, limit),
      summary: summaryObj
    });
  } catch (error) {
    console.error('Get student attendance error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const getTodayAttendanceSummary = async (req, res) => {
  try {
    const { classId } = req.query;
    const today = getStartOfDay();
    const filter = { date: { $gte: today, $lte: getEndOfDay() } };
    
    if (classId) filter.classId = classId;

    const summary = await Attendance.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const totalStudents = classId 
      ? await Student.countDocuments({ classId, status: 'active' })
      : await Student.countDocuments({ status: 'active' });

    const attendanceCount = summary.reduce((acc, item) => acc + item.count, 0);

    res.json({
      success: true,
      data: {
        date: formatDate(today),
        totalStudents,
        recorded: attendanceCount,
        notRecorded: totalStudents - attendanceCount,
        breakdown: summary.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, { hadir: 0, izin: 0, sakit: 0, alpha: 0, terlambat: 0 })
      }
    });
  } catch (error) {
    console.error('Get today summary error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const updateAttendance = async (req, res) => {
  try {
    const { status, notes } = req.body;
    const attendance = await Attendance.findById(req.params.id);

    if (!attendance) {
      return res.status(404).json({ success: false, message: 'Data absensi tidak ditemukan' });
    }

    const oldStatus = attendance.status;
    attendance.status = status;
    attendance.notes = notes;
    await attendance.save();

    await logFromRequest(req, 'ATTENDANCE_MARKED', 'Attendance', attendance._id,
      `Status absensi diubah dari ${oldStatus} ke ${status}`);

    res.json({
      success: true,
      message: 'Data absensi berhasil diupdate',
      data: attendance
    });
  } catch (error) {
    console.error('Update attendance error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

module.exports = {
  markAttendance,
  bulkMarkAttendance,
  getAttendanceByClass,
  getAttendanceByStudent,
  getTodayAttendanceSummary,
  updateAttendance
};
