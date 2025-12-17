const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: [
      'LOGIN', 'LOGOUT', 'LOGIN_FAILED',
      'CREATE', 'UPDATE', 'DELETE',
      'ATTENDANCE_MARKED', 'PERMISSION_SUBMITTED', 'PERMISSION_APPROVED', 'PERMISSION_REJECTED',
      'PROFILE_UPDATED', 'PASSWORD_CHANGED',
      'CLASS_CREATED', 'CLASS_UPDATED', 'CLASS_DELETED',
      'TEACHER_CREATED', 'TEACHER_UPDATED', 'TEACHER_DELETED',
      'STUDENT_CREATED', 'STUDENT_UPDATED', 'STUDENT_DELETED',
      'WA_MESSAGE_SENT', 'WA_MESSAGE_RECEIVED', 'WA_BOT_CONNECTED', 'WA_BOT_DISCONNECTED',
      'EXPORT_DATA', 'IMPORT_DATA',
      'SYSTEM_ERROR', 'SECURITY_ALERT'
    ]
  },
  entityType: {
    type: String,
    required: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'userModel',
    default: null
  },
  userModel: {
    type: String,
    enum: ['Admin', 'Teacher', 'Student', 'Parent', 'System'],
    default: 'System'
  },
  userName: {
    type: String,
    default: 'System'
  },
  userRole: {
    type: String,
    default: null
  },
  description: {
    type: String,
    required: true
  },
  oldValue: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  newValue: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
