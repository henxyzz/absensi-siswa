const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  grade: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  major: {
    type: String,
    default: null
  },
  academicYear: {
    type: String,
    required: true
  },
  homeroomTeacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    default: null
  },
  assignedTeachers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher'
  }],
  capacity: {
    type: Number,
    default: 40
  },
  isActive: {
    type: Boolean,
    default: true
  },
  schedule: {
    startTime: { type: String, default: '07:00' },
    endTime: { type: String, default: '15:00' }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, {
  timestamps: true
});

classSchema.virtual('students', {
  ref: 'Student',
  localField: '_id',
  foreignField: 'classId'
});

classSchema.set('toObject', { virtuals: true });
classSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Class', classSchema);
