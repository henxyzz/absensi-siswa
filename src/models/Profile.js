const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'userModel'
  },
  userModel: {
    type: String,
    required: true,
    enum: ['Admin', 'Teacher', 'Student', 'Parent']
  },
  uniqueId: {
    type: String,
    required: true,
    unique: true
  },
  fullName: {
    type: String,
    required: true
  },
  gender: {
    type: String,
    enum: ['L', 'P'],
    required: true
  },
  birthDate: {
    type: Date,
    required: true
  },
  birthPlace: {
    type: String,
    default: null
  },
  address: {
    street: String,
    city: String,
    province: String,
    postalCode: String
  },
  phone: {
    type: String,
    required: true
  },
  whatsappNumber: {
    type: String,
    required: true
  },
  email: {
    type: String,
    lowercase: true
  },
  profilePhoto: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['ADMIN', 'GURU', 'SISWA', 'ORANG_TUA'],
    required: true
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    default: null
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'graduated', 'transferred'],
    default: 'active'
  },
  additionalInfo: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

profileSchema.index({ whatsappNumber: 1 });
profileSchema.index({ role: 1, status: 1 });

module.exports = mongoose.model('Profile', profileSchema);
