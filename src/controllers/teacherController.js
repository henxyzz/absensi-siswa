const { Teacher, Class } = require('../models');
const { logFromRequest } = require('../utils/auditLogger');
const { paginateResults, buildPaginationResponse, generateRandomPassword } = require('../utils/helpers');
const path = require('path');

const getAllTeachers = async (req, res) => {
  try {
    const { page = 1, limit = 10, isActive, search } = req.query;
    const { skip, limit: limitNum } = paginateResults(page, limit);

    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { nip: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const [teachers, total] = await Promise.all([
      Teacher.find(filter)
        .select('-password')
        .populate('assignedClasses', 'name grade')
        .populate('homeroomClass', 'name grade')
        .skip(skip)
        .limit(limitNum)
        .sort({ fullName: 1 }),
      Teacher.countDocuments(filter)
    ]);

    res.json({
      success: true,
      ...buildPaginationResponse(teachers, total, page, limit)
    });
  } catch (error) {
    console.error('Get teachers error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const getTeacherById = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id)
      .select('-password')
      .populate('assignedClasses', 'name grade academicYear')
      .populate('homeroomClass', 'name grade academicYear');

    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Guru tidak ditemukan' });
    }

    res.json({ success: true, data: teacher });
  } catch (error) {
    console.error('Get teacher error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const createTeacher = async (req, res) => {
  try {
    const { nip, fullName, email, phone, whatsappNumber, gender, birthDate, birthPlace, address, subjects } = req.body;

    if (!nip || !fullName || !email || !phone || !whatsappNumber || !gender || !birthDate) {
      return res.status(400).json({ success: false, message: 'Data wajib belum lengkap' });
    }

    const existingTeacher = await Teacher.findOne({ $or: [{ nip }, { email }] });
    if (existingTeacher) {
      return res.status(400).json({ success: false, message: 'NIP atau email sudah terdaftar' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Foto profil wajib diupload' });
    }

    const password = generateRandomPassword();

    const teacher = new Teacher({
      nip,
      fullName,
      email,
      password,
      phone,
      whatsappNumber,
      gender,
      birthDate,
      birthPlace,
      address: address ? JSON.parse(address) : {},
      subjects: subjects ? JSON.parse(subjects) : [],
      profilePhoto: `/uploads/profiles/${req.file.filename}`,
      createdBy: req.user.id
    });

    await teacher.save();

    await logFromRequest(req, 'TEACHER_CREATED', 'Teacher', teacher._id, `Guru ${fullName} berhasil didaftarkan`);

    res.status(201).json({
      success: true,
      message: 'Guru berhasil didaftarkan',
      data: {
        teacher: teacher.toJSON(),
        temporaryPassword: password
      }
    });
  } catch (error) {
    console.error('Create teacher error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const updateTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Guru tidak ditemukan' });
    }

    const oldData = teacher.toObject();
    const { fullName, email, phone, whatsappNumber, birthPlace, address, subjects, isActive } = req.body;

    if (fullName) teacher.fullName = fullName;
    if (email) teacher.email = email;
    if (phone) teacher.phone = phone;
    if (whatsappNumber) teacher.whatsappNumber = whatsappNumber;
    if (birthPlace) teacher.birthPlace = birthPlace;
    if (address) teacher.address = JSON.parse(address);
    if (subjects) teacher.subjects = JSON.parse(subjects);
    if (isActive !== undefined) teacher.isActive = isActive === 'true' || isActive === true;

    if (req.file) {
      teacher.profilePhoto = `/uploads/profiles/${req.file.filename}`;
    }

    await teacher.save();

    await logFromRequest(req, 'TEACHER_UPDATED', 'Teacher', teacher._id, `Data guru ${teacher.fullName} berhasil diupdate`, { oldValue: oldData, newValue: teacher.toObject() });

    res.json({
      success: true,
      message: 'Data guru berhasil diupdate',
      data: teacher.toJSON()
    });
  } catch (error) {
    console.error('Update teacher error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const deleteTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Guru tidak ditemukan' });
    }

    if (teacher.homeroomClass) {
      await Class.findByIdAndUpdate(teacher.homeroomClass, { homeroomTeacher: null });
    }

    await Class.updateMany(
      { assignedTeachers: teacher._id },
      { $pull: { assignedTeachers: teacher._id } }
    );

    await Teacher.findByIdAndDelete(req.params.id);

    await logFromRequest(req, 'TEACHER_DELETED', 'Teacher', teacher._id, `Guru ${teacher.fullName} berhasil dihapus`);

    res.json({ success: true, message: 'Guru berhasil dihapus' });
  } catch (error) {
    console.error('Delete teacher error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const assignTeacherToClass = async (req, res) => {
  try {
    const { classIds } = req.body;
    const teacher = await Teacher.findById(req.params.id);

    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Guru tidak ditemukan' });
    }

    await Class.updateMany(
      { assignedTeachers: teacher._id },
      { $pull: { assignedTeachers: teacher._id } }
    );

    teacher.assignedClasses = classIds;
    await teacher.save();

    await Class.updateMany(
      { _id: { $in: classIds } },
      { $addToSet: { assignedTeachers: teacher._id } }
    );

    await logFromRequest(req, 'TEACHER_UPDATED', 'Teacher', teacher._id, `Guru ${teacher.fullName} di-assign ke kelas`);

    res.json({
      success: true,
      message: 'Guru berhasil di-assign ke kelas',
      data: teacher
    });
  } catch (error) {
    console.error('Assign teacher error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const getTeacherClasses = async (req, res) => {
  try {
    const teacherId = req.user.userType === 'teacher' ? req.user.id : req.params.id;
    
    const teacher = await Teacher.findById(teacherId)
      .populate('assignedClasses', 'name grade academicYear capacity')
      .populate('homeroomClass', 'name grade academicYear capacity');

    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Guru tidak ditemukan' });
    }

    res.json({
      success: true,
      data: {
        assignedClasses: teacher.assignedClasses,
        homeroomClass: teacher.homeroomClass
      }
    });
  } catch (error) {
    console.error('Get teacher classes error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

module.exports = {
  getAllTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  assignTeacherToClass,
  getTeacherClasses
};
