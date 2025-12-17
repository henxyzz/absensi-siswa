const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const teacherSchema = new mongoose.Schema({
  nip: {
    type: String,
    required: true,
    unique: true
  },
  fullName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
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
  subjects: [{
    type: String
  }],
  assignedClasses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  }],
  homeroomClass: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    default: null
  },
  profilePhoto: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  joinDate: {
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

teacherSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

teacherSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

teacherSchema.methods.toJSON = function() {
  const teacher = this.toObject();
  delete teacher.password;
  return teacher;
};

module.exports = mongoose.model('Teacher', teacherSchema);
