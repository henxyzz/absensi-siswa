const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['hadir', 'izin', 'sakit', 'alpha', 'terlambat'],
    required: true
  },
  checkInTime: {
    type: Date,
    default: null
  },
  checkOutTime: {
    type: Date,
    default: null
  },
  location: {
    latitude: Number,
    longitude: Number,
    accuracy: Number,
    address: String
  },
  isWithinGeofence: {
    type: Boolean,
    default: null
  },
  method: {
    type: String,
    enum: ['manual', 'qr', 'whatsapp', 'geolocation', 'auto'],
    default: 'manual'
  },
  notes: {
    type: String,
    default: null
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    default: null
  },
  notificationSent: {
    student: { type: Boolean, default: false },
    parent: { type: Boolean, default: false }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'creatorModel'
  },
  creatorModel: {
    type: String,
    enum: ['Admin', 'Teacher', 'Student', 'System']
  }
}, {
  timestamps: true
});

attendanceSchema.index({ studentId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ classId: 1, date: 1 });
attendanceSchema.index({ date: 1, status: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
