const AuditLog = require('../models/AuditLog');

const logAction = async ({
  action,
  entityType,
  entityId = null,
  userId = null,
  userModel = 'System',
  userName = 'System',
  userRole = null,
  description,
  oldValue = null,
  newValue = null,
  req = null,
  metadata = {}
}) => {
  try {
    const logEntry = new AuditLog({
      action,
      entityType,
      entityId,
      userId,
      userModel,
      userName,
      userRole,
      description,
      oldValue,
      newValue,
      ipAddress: req ? (req.ip || req.connection?.remoteAddress) : null,
      userAgent: req ? req.get('User-Agent') : null,
      metadata
    });

    await logEntry.save();
    return logEntry;
  } catch (error) {
    console.error('Audit log error:', error);
    return null;
  }
};

const logFromRequest = async (req, action, entityType, entityId, description, extra = {}) => {
  return logAction({
    action,
    entityType,
    entityId,
    userId: req.user?.id,
    userModel: req.user?.userType ? capitalizeFirst(req.user.userType) : 'System',
    userName: req.user?.fullName || 'System',
    userRole: req.user?.role,
    description,
    req,
    ...extra
  });
};

const capitalizeFirst = (str) => str.charAt(0).toUpperCase() + str.slice(1);

module.exports = {
  logAction,
  logFromRequest
};
