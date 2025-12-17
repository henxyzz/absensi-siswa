const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
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
  type: {
    type: String,
    enum: ['izin', 'sakit'],
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    mimetype: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    default: null
  },
  notificationSent: {
    student: { type: Boolean, default: false },
    parent: { type: Boolean, default: false },
    teacher: { type: Boolean, default: false }
  },
  submittedVia: {
    type: String,
    enum: ['web', 'whatsapp', 'mobile'],
    default: 'web'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'creatorModel'
  },
  creatorModel: {
    type: String,
    enum: ['Student', 'Parent', 'Teacher', 'Admin']
  }
}, {
  timestamps: true
});

permissionSchema.index({ studentId: 1, startDate: 1 });
permissionSchema.index({ classId: 1, status: 1 });
permissionSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Permission', permissionSchema);
