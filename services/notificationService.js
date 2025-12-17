const whatsappService = require('./whatsappService');

class NotificationService {
  constructor() {
    this.io = null;
  }

  setSocketIO(io) {
    this.io = io;
    whatsappService.setSocketIO(io);
  }

  async sendRealTimeNotification(event, data) {
    if (this.io) {
      this.io.emit(event, data);
    }
  }

  async notifyAttendance(student, status, className) {
    await this.sendRealTimeNotification('attendance:update', {
      studentId: student._id,
      studentName: student.fullName,
      className,
      status,
      time: new Date()
    });

    if (whatsappService.getStatus().connected) {
      await whatsappService.sendAttendanceNotification(student._id, status, className);
    }
  }

  async notifyPermission(permission, type) {
    await this.sendRealTimeNotification(`permission:${type}`, {
      permissionId: permission._id,
      type: permission.type,
      status: permission.status
    });

    if (whatsappService.getStatus().connected) {
      await whatsappService.sendPermissionNotification(permission, type);
    }
  }

  async notifyGeofence(student, isWithin, distance) {
    const message = isWithin 
      ? `${student.fullName} berada dalam area sekolah`
      : `${student.fullName} berada di luar area sekolah (${distance}m dari sekolah)`;

    await this.sendRealTimeNotification('geofence:alert', {
      studentId: student._id,
      studentName: student.fullName,
      isWithin,
      distance,
      message
    });
  }

  async notifySystem(type, message, data = {}) {
    await this.sendRealTimeNotification('system:notification', {
      type,
      message,
      data,
      time: new Date()
    });
  }
}

const notificationService = new NotificationService();

module.exports = notificationService;
