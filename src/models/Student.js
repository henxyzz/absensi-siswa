const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const studentSchema = new mongoose.Schema({
  nis: {
    type: String,
    required: true,
    unique: true
  },
  nisn: {
    type: String,
    unique: true,
    sparse: true
  },
  fullName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  phone: {
    type: String
  },
  whatsappNumber: {
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
    type: String
  },
  address: {
    street: String,
    city: String,
    province: String,
    postalCode: String
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  profilePhoto: {
    type: String,
    required: true
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Parent',
    default: null
  },
  parentWhatsapp: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'graduated', 'transferred', 'dropped'],
    default: 'active'
  },
  enrollmentDate: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, {
  timestamps: true
});

studentSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

studentSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

studentSchema.methods.toJSON = function() {
  const student = this.toObject();
  delete student.password;
  return student;
};

module.exports = mongoose.model('Student', studentSchema);
