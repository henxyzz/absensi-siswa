const { Class, Teacher, Student } = require('../models');
const { logFromRequest } = require('../utils/auditLogger');
const { paginateResults, buildPaginationResponse } = require('../utils/helpers');

const getAllClasses = async (req, res) => {
  try {
    const { page = 1, limit = 10, grade, academicYear, isActive } = req.query;
    const { skip, limit: limitNum } = paginateResults(page, limit);

    const filter = {};
    if (grade) filter.grade = parseInt(grade);
    if (academicYear) filter.academicYear = academicYear;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const [classes, total] = await Promise.all([
      Class.find(filter)
        .populate('homeroomTeacher', 'fullName nip')
        .populate('assignedTeachers', 'fullName nip subjects')
        .skip(skip)
        .limit(limitNum)
        .sort({ grade: 1, name: 1 }),
      Class.countDocuments(filter)
    ]);

    res.json({
      success: true,
      ...buildPaginationResponse(classes, total, page, limit)
    });
  } catch (error) {
    console.error('Get classes error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const getClassById = async (req, res) => {
  try {
    const classData = await Class.findById(req.params.id)
      .populate('homeroomTeacher', 'fullName nip email phone')
      .populate('assignedTeachers', 'fullName nip subjects');

    if (!classData) {
      return res.status(404).json({ success: false, message: 'Kelas tidak ditemukan' });
    }

    const studentCount = await Student.countDocuments({ classId: classData._id, status: 'active' });

    res.json({
      success: true,
      data: {
        ...classData.toObject(),
        studentCount
      }
    });
  } catch (error) {
    console.error('Get class error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const createClass = async (req, res) => {
  try {
    const { name, grade, major, academicYear, homeroomTeacher, capacity, schedule } = req.body;

    if (!name || !grade || !academicYear) {
      return res.status(400).json({ success: false, message: 'Nama, tingkat, dan tahun ajaran wajib diisi' });
    }

    const existingClass = await Class.findOne({ name, grade, academicYear });
    if (existingClass) {
      return res.status(400).json({ success: false, message: 'Kelas dengan nama dan tahun ajaran yang sama sudah ada' });
    }

    if (homeroomTeacher) {
      const teacher = await Teacher.findById(homeroomTeacher);
      if (!teacher) {
        return res.status(400).json({ success: false, message: 'Guru wali kelas tidak ditemukan' });
      }
    }

    const newClass = new Class({
      name,
      grade,
      major,
      academicYear,
      homeroomTeacher,
      capacity: capacity || 40,
      schedule,
      createdBy: req.user.id
    });

    await newClass.save();

    if (homeroomTeacher) {
      await Teacher.findByIdAndUpdate(homeroomTeacher, { homeroomClass: newClass._id });
    }

    await logFromRequest(req, 'CLASS_CREATED', 'Class', newClass._id, `Kelas ${name} berhasil dibuat`);

    res.status(201).json({
      success: true,
      message: 'Kelas berhasil dibuat',
      data: newClass
    });
  } catch (error) {
    console.error('Create class error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const updateClass = async (req, res) => {
  try {
    const { name, grade, major, academicYear, homeroomTeacher, assignedTeachers, capacity, schedule, isActive } = req.body;

    const classData = await Class.findById(req.params.id);
    if (!classData) {
      return res.status(404).json({ success: false, message: 'Kelas tidak ditemukan' });
    }

    const oldData = classData.toObject();

    if (name) classData.name = name;
    if (grade) classData.grade = grade;
    if (major !== undefined) classData.major = major;
    if (academicYear) classData.academicYear = academicYear;
    if (capacity) classData.capacity = capacity;
    if (schedule) classData.schedule = schedule;
    if (isActive !== undefined) classData.isActive = isActive;

    if (homeroomTeacher !== undefined) {
      if (classData.homeroomTeacher) {
        await Teacher.findByIdAndUpdate(classData.homeroomTeacher, { homeroomClass: null });
      }
      classData.homeroomTeacher = homeroomTeacher;
      if (homeroomTeacher) {
        await Teacher.findByIdAndUpdate(homeroomTeacher, { homeroomClass: classData._id });
      }
    }

    if (assignedTeachers) {
      classData.assignedTeachers = assignedTeachers;
      await Teacher.updateMany(
        { _id: { $in: assignedTeachers } },
        { $addToSet: { assignedClasses: classData._id } }
      );
    }

    await classData.save();

    await logFromRequest(req, 'CLASS_UPDATED', 'Class', classData._id, `Kelas ${classData.name} berhasil diupdate`, { oldValue: oldData, newValue: classData.toObject() });

    res.json({
      success: true,
      message: 'Kelas berhasil diupdate',
      data: classData
    });
  } catch (error) {
    console.error('Update class error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const deleteClass = async (req, res) => {
  try {
    const classData = await Class.findById(req.params.id);
    if (!classData) {
      return res.status(404).json({ success: false, message: 'Kelas tidak ditemukan' });
    }

    const studentCount = await Student.countDocuments({ classId: classData._id });
    if (studentCount > 0) {
      return res.status(400).json({ success: false, message: `Tidak dapat menghapus kelas dengan ${studentCount} siswa. Pindahkan siswa terlebih dahulu.` });
    }

    if (classData.homeroomTeacher) {
      await Teacher.findByIdAndUpdate(classData.homeroomTeacher, { homeroomClass: null });
    }

    await Teacher.updateMany(
      { assignedClasses: classData._id },
      { $pull: { assignedClasses: classData._id } }
    );

    await Class.findByIdAndDelete(req.params.id);

    await logFromRequest(req, 'CLASS_DELETED', 'Class', classData._id, `Kelas ${classData.name} berhasil dihapus`);

    res.json({ success: true, message: 'Kelas berhasil dihapus' });
  } catch (error) {
    console.error('Delete class error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const getClassStudents = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const { skip, limit: limitNum } = paginateResults(page, limit);

    const [students, total] = await Promise.all([
      Student.find({ classId: req.params.id, status: 'active' })
        .select('nis fullName gender profilePhoto whatsappNumber')
        .skip(skip)
        .limit(limitNum)
        .sort({ fullName: 1 }),
      Student.countDocuments({ classId: req.params.id, status: 'active' })
    ]);

    res.json({
      success: true,
      ...buildPaginationResponse(students, total, page, limit)
    });
  } catch (error) {
    console.error('Get class students error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

module.exports = {
  getAllClasses,
  getClassById,
  createClass,
  updateClass,
  deleteClass,
  getClassStudents
};
