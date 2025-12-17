const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { Admin, Teacher, Student } = require('../models');

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Token tidak ditemukan' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret);

    let user = null;
    switch (decoded.userType) {
      case 'admin':
        user = await Admin.findById(decoded.id);
        break;
      case 'teacher':
        user = await Teacher.findById(decoded.id);
        break;
      case 'student':
        user = await Student.findById(decoded.id);
        break;
    }

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User tidak valid atau tidak aktif' });
    }

    req.user = {
      id: user._id,
      userType: decoded.userType,
      role: decoded.role || user.role,
      fullName: user.fullName,
      data: user
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token sudah kadaluarsa' });
    }
    return res.status(401).json({ success: false, message: 'Token tidak valid' });
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Tidak terautentikasi' });
    }

    const userRole = req.user.role;
    if (!roles.includes(userRole) && userRole !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }

    next();
  };
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.userType !== 'admin') {
    return res.status(403).json({ success: false, message: 'Hanya admin yang dapat mengakses' });
  }
  next();
};

const requireTeacher = (req, res, next) => {
  if (!req.user || (req.user.userType !== 'teacher' && req.user.userType !== 'admin')) {
    return res.status(403).json({ success: false, message: 'Hanya guru yang dapat mengakses' });
  }
  next();
};

const requireSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, message: 'Hanya Super Admin yang dapat mengakses' });
  }
  next();
};

const generateToken = (user, userType) => {
  return jwt.sign(
    {
      id: user._id,
      userType: userType,
      role: user.role || userType.toUpperCase()
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
};

module.exports = {
  verifyToken,
  requireRole,
  requireAdmin,
  requireTeacher,
  requireSuperAdmin,
  generateToken
};
