const bcrypt = require('bcryptjs');

const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123';

const config = {
  app: {
    name: 'Sistem Absensi Sekolah',
    port: process.env.PORT || 8080,
    env: process.env.NODE_ENV || 'development'
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || require('crypto').randomBytes(32).toString('hex'),
    expiresIn: '24h'
  },
  
  mongodb: {
    uri: process.env.MONGODB_URI
  },
  
  bootstrap: {
    enabled: true,
    admin: {
      username: process.env.ADMIN_USERNAME || 'superadmin',
      password: bcrypt.hashSync(DEFAULT_ADMIN_PASSWORD, 10),
      fullName: process.env.ADMIN_FULLNAME || 'Super Administrator',
      role: 'SUPER_ADMIN',
      email: process.env.ADMIN_EMAIL || 'admin@school.com'
    }
  },
  
  roles: {
    SUPER_ADMIN: {
      level: 1,
      permissions: ['*']
    },
    ADMIN: {
      level: 2,
      permissions: ['manage_class', 'manage_teacher', 'manage_student', 'manage_attendance', 'view_reports']
    },
    AUDITOR: {
      level: 3,
      permissions: ['view_class', 'view_teacher', 'view_student', 'view_attendance', 'view_reports']
    },
    GURU: {
      level: 4,
      permissions: ['view_own_class', 'manage_attendance', 'approve_permission', 'export_csv']
    },
    SISWA: {
      level: 5,
      permissions: ['view_own_profile', 'submit_attendance', 'submit_permission']
    },
    ORANG_TUA: {
      level: 6,
      permissions: ['view_child_profile', 'view_child_attendance']
    }
  },
  
  upload: {
    maxFileSize: 5 * 1024 * 1024,
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/jpg'],
    profilePath: 'src/uploads/profiles',
    documentPath: 'src/uploads/documents'
  },
  
  whatsapp: {
    sessionPath: './wa_sessions',
    autoReconnect: true
  },
  
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 100,
    loginMax: 5
  },
  
  geofence: {
    schoolLat: -6.200000,
    schoolLng: 106.816666,
    radiusMeters: 100
  }
};

module.exports = config;
