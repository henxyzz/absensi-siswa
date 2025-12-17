const { Admin, Teacher, Student } = require('../models');
const { generateToken } = require('../middleware/auth');
const { logAction } = require('../utils/auditLogger');
const config = require('../config/config');

const bootstrapAdmin = async () => {
  try {
    if (!config.bootstrap.enabled) return;
    
    const existingAdmin = await Admin.findOne({ username: config.bootstrap.admin.username });
    if (!existingAdmin) {
      const admin = new Admin({
        ...config.bootstrap.admin,
        isBootstrapped: true
      });
      await admin.save();
      console.log('Bootstrap admin created successfully');
      
      await logAction({
        action: 'CREATE',
        entityType: 'Admin',
        entityId: admin._id,
        description: 'Bootstrap admin created from config.js'
      });
    }
  } catch (error) {
    console.error('Bootstrap admin error:', error);
  }
};

const adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username dan password wajib diisi' });
    }

    let admin = await Admin.findOne({ username: username.toLowerCase() });
    
    if (!admin && config.bootstrap.enabled) {
      if (username.toLowerCase() === config.bootstrap.admin.username.toLowerCase()) {
        const bcrypt = require('bcryptjs');
        const isMatch = await bcrypt.compare(password, config.bootstrap.admin.password);
        if (isMatch) {
          admin = new Admin({
            ...config.bootstrap.admin,
            username: username.toLowerCase(),
            isBootstrapped: true
          });
          await admin.save();
        }
      }
    }

    if (!admin) {
      await logAction({
        action: 'LOGIN_FAILED',
        entityType: 'Admin',
        description: `Login gagal untuk username: ${username}`,
        req
      });
      return res.status(401).json({ success: false, message: 'Username atau password salah' });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      await logAction({
        action: 'LOGIN_FAILED',
        entityType: 'Admin',
        entityId: admin._id,
        description: 'Password salah',
        req
      });
      return res.status(401).json({ success: false, message: 'Username atau password salah' });
    }

    if (!admin.isActive) {
      return res.status(403).json({ success: false, message: 'Akun tidak aktif' });
    }

    admin.lastLogin = new Date();
    await admin.save();

    const token = generateToken(admin, 'admin');

    await logAction({
      action: 'LOGIN',
      entityType: 'Admin',
      entityId: admin._id,
      userId: admin._id,
      userModel: 'Admin',
      userName: admin.fullName,
      userRole: admin.role,
      description: 'Admin login berhasil',
      req
    });


    res.json({
      success: true,
      message: 'Login berhasil',
      data: {
        token,
        user: admin.toJSON()
      }
    });
   

    // Redirect ke dashboard
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).send('Terjadi kesalahan server');
  }
};

const teacherLogin = async (req, res) => {
  try {
    const { nip, password } = req.body;

    if (!nip || !password) {
      return res.status(400).json({ success: false, message: 'NIP dan password wajib diisi' });
    }

    const teacher = await Teacher.findOne({ nip });
    if (!teacher) {
      return res.status(401).json({ success: false, message: 'NIP atau password salah' });
    }

    const isMatch = await teacher.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'NIP atau password salah' });
    }

    if (!teacher.isActive) {
      return res.status(403).json({ success: false, message: 'Akun tidak aktif' });
    }

    teacher.lastLogin = new Date();
    await teacher.save();

    const token = generateToken(teacher, 'teacher');

    await logAction({
      action: 'LOGIN',
      entityType: 'Teacher',
      entityId: teacher._id,
      userId: teacher._id,
      userModel: 'Teacher',
      userName: teacher.fullName,
      userRole: 'GURU',
      description: 'Guru login berhasil',
      req
    });

    res.json({
      success: true,
      message: 'Login berhasil',
      data: {
        token,
        user: teacher.toJSON()
      }
    });
  } catch (error) {
    console.error('Teacher login error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const studentLogin = async (req, res) => {
  try {
    const { nis, password } = req.body;

    if (!nis || !password) {
      return res.status(400).json({ success: false, message: 'NIS dan password wajib diisi' });
    }

    const student = await Student.findOne({ nis }).populate('classId');
    if (!student) {
      return res.status(401).json({ success: false, message: 'NIS atau password salah' });
    }

    const isMatch = await student.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'NIS atau password salah' });
    }

    if (student.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Akun tidak aktif' });
    }

    student.lastLogin = new Date();
    await student.save();

    const token = generateToken(student, 'student');

    await logAction({
      action: 'LOGIN',
      entityType: 'Student',
      entityId: student._id,
      userId: student._id,
      userModel: 'Student',
      userName: student.fullName,
      userRole: 'SISWA',
      description: 'Siswa login berhasil',
      req
    });

  
    res.json({
      success: true,
      message: 'Login berhasil',
      data: {
        token,
        user: student.toJSON()
      }
    });
  } catch (error) {
    console.error('Student login error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const getProfile = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        userType: req.user.userType,
        role: req.user.role,
        user: req.user.data.toJSON()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Password lama dan baru wajib diisi' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password minimal 6 karakter' });
    }

    const user = req.user.data;
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Password lama salah' });
    }

    user.password = newPassword;
    await user.save();

    await logAction({
      action: 'PASSWORD_CHANGED',
      entityType: req.user.userType.charAt(0).toUpperCase() + req.user.userType.slice(1),
      entityId: user._id,
      userId: user._id,
      userModel: req.user.userType.charAt(0).toUpperCase() + req.user.userType.slice(1),
      userName: user.fullName,
      description: 'Password berhasil diubah',
      req
    });

    res.json({ success: true, message: 'Password berhasil diubah' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

module.exports = {
  bootstrapAdmin,
  adminLogin,
  teacherLogin,
  studentLogin,
  getProfile,
  changePassword
};
