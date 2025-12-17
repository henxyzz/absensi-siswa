const { Student, Class } = require('../models');
const { logFromRequest } = require('../utils/auditLogger');
const { paginateResults, buildPaginationResponse, generateRandomPassword, generateNIS } = require('../utils/helpers');

const getAllStudents = async (req, res) => {
  try {
    const { page = 1, limit = 10, classId, status, search } = req.query;
    const { skip, limit: limitNum } = paginateResults(page, limit);

    const filter = {};
    if (classId) filter.classId = classId;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { nis: { $regex: search, $options: 'i' } }
      ];
    }

    if (req.user.userType === 'teacher') {
      const teacher = req.user.data;
      const allowedClasses = [...(teacher.assignedClasses || [])];
      if (teacher.homeroomClass) allowedClasses.push(teacher.homeroomClass);
      filter.classId = { $in: allowedClasses };
    }

    const [students, total] = await Promise.all([
      Student.find(filter)
        .select('-password')
        .populate('classId', 'name grade')
        .skip(skip)
        .limit(limitNum)
        .sort({ fullName: 1 }),
      Student.countDocuments(filter)
    ]);

    res.json({
      success: true,
      ...buildPaginationResponse(students, total, page, limit)
    });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const getStudentById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .select('-password')
      .populate('classId', 'name grade academicYear');

    if (!student) {
      return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan' });
    }

    if (req.user.userType === 'teacher') {
      const teacher = req.user.data;
      const allowedClasses = [...(teacher.assignedClasses || [])].map(c => c.toString());
      if (teacher.homeroomClass) allowedClasses.push(teacher.homeroomClass.toString());
      
      if (!allowedClasses.includes(student.classId._id.toString())) {
        return res.status(403).json({ success: false, message: 'Tidak memiliki akses ke siswa ini' });
      }
    }

    res.json({ success: true, data: student });
  } catch (error) {
    console.error('Get student error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const createStudent = async (req, res) => {
  try {
    const { nis, nisn, fullName, email, phone, whatsappNumber, gender, birthDate, birthPlace, address, classId, parentWhatsapp } = req.body;

    if (!nis || !fullName || !whatsappNumber || !gender || !birthDate || !classId) {
      return res.status(400).json({ success: false, message: 'Data wajib belum lengkap' });
    }

    const existingStudent = await Student.findOne({ nis });
    if (existingStudent) {
      return res.status(400).json({ success: false, message: 'NIS sudah terdaftar' });
    }

    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(400).json({ success: false, message: 'Kelas tidak ditemukan' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Foto profil wajib diupload' });
    }

    const password = generateRandomPassword();

    const student = new Student({
      nis,
      nisn,
      fullName,
      email,
      password,
      phone,
      whatsappNumber,
      gender,
      birthDate,
      birthPlace,
      address: address ? JSON.parse(address) : {},
      classId,
      parentWhatsapp,
      profilePhoto: `/uploads/profiles/${req.file.filename}`,
      createdBy: req.user.id
    });

    await student.save();

    await logFromRequest(req, 'STUDENT_CREATED', 'Student', student._id, `Siswa ${fullName} berhasil didaftarkan`);

    res.status(201).json({
      success: true,
      message: 'Siswa berhasil didaftarkan',
      data: {
        student: student.toJSON(),
        temporaryPassword: password
      }
    });
  } catch (error) {
    console.error('Create student error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const updateStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan' });
    }

    const oldData = student.toObject();
    const { fullName, email, phone, whatsappNumber, birthPlace, address, classId, parentWhatsapp, status } = req.body;

    if (fullName) student.fullName = fullName;
    if (email) student.email = email;
    if (phone) student.phone = phone;
    if (whatsappNumber) student.whatsappNumber = whatsappNumber;
    if (birthPlace) student.birthPlace = birthPlace;
    if (address) student.address = JSON.parse(address);
    if (classId) student.classId = classId;
    if (parentWhatsapp) student.parentWhatsapp = parentWhatsapp;
    if (status) student.status = status;

    if (req.file) {
      student.profilePhoto = `/uploads/profiles/${req.file.filename}`;
    }

    await student.save();

    await logFromRequest(req, 'STUDENT_UPDATED', 'Student', student._id, `Data siswa ${student.fullName} berhasil diupdate`, { oldValue: oldData, newValue: student.toObject() });

    res.json({
      success: true,
      message: 'Data siswa berhasil diupdate',
      data: student.toJSON()
    });
  } catch (error) {
    console.error('Update student error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const deleteStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan' });
    }

    await Student.findByIdAndDelete(req.params.id);

    await logFromRequest(req, 'STUDENT_DELETED', 'Student', student._id, `Siswa ${student.fullName} berhasil dihapus`);

    res.json({ success: true, message: 'Siswa berhasil dihapus' });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const bulkCreateStudents = async (req, res) => {
  try {
    const { students, classId } = req.body;

    if (!students || !Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ success: false, message: 'Data siswa tidak valid' });
    }

    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(400).json({ success: false, message: 'Kelas tidak ditemukan' });
    }

    const results = { success: [], failed: [] };

    for (const studentData of students) {
      try {
        const password = generateRandomPassword();
        const student = new Student({
          ...studentData,
          classId,
          password,
          profilePhoto: '/uploads/profiles/default.jpg',
          createdBy: req.user.id
        });
        await student.save();
        results.success.push({ nis: studentData.nis, fullName: studentData.fullName, password });
      } catch (error) {
        results.failed.push({ nis: studentData.nis, error: error.message });
      }
    }

    res.json({
      success: true,
      message: `${results.success.length} siswa berhasil, ${results.failed.length} gagal`,
      data: results
    });
  } catch (error) {
    console.error('Bulk create students error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

module.exports = {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  bulkCreateStudents
};
