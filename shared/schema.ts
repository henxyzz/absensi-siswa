import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, real, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ==================== ENUMS ====================
export const UserRole = {
  SUPER_ADMIN: "super_admin",
  ADMIN_SEKOLAH: "admin_sekolah",
  GURU: "guru",
  SISWA: "siswa",
  ORANG_TUA: "orang_tua",
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];

export const AttendanceStatus = {
  HADIR: "hadir",
  IZIN: "izin",
  SAKIT: "sakit",
  ALPHA: "alpha",
} as const;

export type AttendanceStatusType = typeof AttendanceStatus[keyof typeof AttendanceStatus];

export const LeaveStatus = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  COMPLETED: "completed",
} as const;

export type LeaveStatusType = typeof LeaveStatus[keyof typeof LeaveStatus];

// ==================== TABLES ====================

// Schools table
export const schools = pgTable("schools", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  address: text("address"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  radiusMeters: integer("radius_meters").default(100),
  createdAt: timestamp("created_at").defaultNow(),
});

// Classes table
export const classes = pgTable("classes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  grade: text("grade").notNull(),
  schoolId: varchar("school_id").references(() => schools.id),
  teacherId: varchar("teacher_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Users table with role-based access
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default(UserRole.SISWA),
  profilePhoto: text("profile_photo"),
  phone: text("phone"),
  address: text("address"),
  schoolId: varchar("school_id").references(() => schools.id),
  classId: varchar("class_id").references(() => classes.id),
  parentId: varchar("parent_id"),
  isActive: boolean("is_active").default(true),
  isFirstLogin: boolean("is_first_login").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Attendance records
export const attendances = pgTable("attendances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  schoolId: varchar("school_id").references(() => schools.id),
  date: timestamp("date").defaultNow(),
  checkInTime: timestamp("check_in_time"),
  checkOutTime: timestamp("check_out_time"),
  status: text("status").notNull().default(AttendanceStatus.ALPHA),
  checkInPhoto: text("check_in_photo"),
  checkOutPhoto: text("check_out_photo"),
  checkInLatitude: real("check_in_latitude"),
  checkInLongitude: real("check_in_longitude"),
  checkOutLatitude: real("check_out_latitude"),
  checkOutLongitude: real("check_out_longitude"),
  isLocationValid: boolean("is_location_valid").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Leave requests (izin keluar)
export const leaveRequests = pgTable("leave_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  approvedById: varchar("approved_by_id").references(() => users.id),
  reason: text("reason").notNull(),
  status: text("status").notNull().default(LeaveStatus.PENDING),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  expectedReturnTime: timestamp("expected_return_time"),
  actualReturnTime: timestamp("actual_return_time"),
  isOutOfRadius: boolean("is_out_of_radius").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// GPS location tracking
export const locationLogs = pgTable("location_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  leaveRequestId: varchar("leave_request_id").references(() => leaveRequests.id),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  accuracy: real("accuracy"),
  timestamp: timestamp("timestamp").defaultNow(),
  isWithinRadius: boolean("is_within_radius").default(true),
});

// Audit logs
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: varchar("entity_id"),
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// WhatsApp notifications
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  recipientPhone: text("recipient_phone"),
  type: text("type").notNull(),
  message: text("message").notNull(),
  status: text("status").default("pending"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// System settings
export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: jsonb("value"),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ==================== RELATIONS ====================
export const usersRelations = relations(users, ({ one, many }) => ({
  school: one(schools, { fields: [users.schoolId], references: [schools.id] }),
  class: one(classes, { fields: [users.classId], references: [classes.id] }),
  parent: one(users, { fields: [users.parentId], references: [users.id] }),
  attendances: many(attendances),
  leaveRequests: many(leaveRequests),
  locationLogs: many(locationLogs),
}));

export const classesRelations = relations(classes, ({ one, many }) => ({
  school: one(schools, { fields: [classes.schoolId], references: [schools.id] }),
  students: many(users),
}));

export const attendancesRelations = relations(attendances, ({ one }) => ({
  user: one(users, { fields: [attendances.userId], references: [users.id] }),
  school: one(schools, { fields: [attendances.schoolId], references: [schools.id] }),
}));

export const leaveRequestsRelations = relations(leaveRequests, ({ one, many }) => ({
  user: one(users, { fields: [leaveRequests.userId], references: [users.id] }),
  approvedBy: one(users, { fields: [leaveRequests.approvedById], references: [users.id] }),
  locationLogs: many(locationLogs),
}));

export const locationLogsRelations = relations(locationLogs, ({ one }) => ({
  user: one(users, { fields: [locationLogs.userId], references: [users.id] }),
  leaveRequest: one(leaveRequests, { fields: [locationLogs.leaveRequestId], references: [leaveRequests.id] }),
}));

// ==================== INSERT SCHEMAS ====================
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSchoolSchema = createInsertSchema(schools).omit({
  id: true,
  createdAt: true,
});

export const insertClassSchema = createInsertSchema(classes).omit({
  id: true,
  createdAt: true,
});

export const insertAttendanceSchema = createInsertSchema(attendances).omit({
  id: true,
  createdAt: true,
});

export const insertLeaveRequestSchema = createInsertSchema(leaveRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLocationLogSchema = createInsertSchema(locationLogs).omit({
  id: true,
  timestamp: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertSettingSchema = createInsertSchema(settings).omit({
  id: true,
  updatedAt: true,
});

// ==================== TYPES ====================
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type School = typeof schools.$inferSelect;
export type InsertSchool = z.infer<typeof insertSchoolSchema>;

export type Class = typeof classes.$inferSelect;
export type InsertClass = z.infer<typeof insertClassSchema>;

export type Attendance = typeof attendances.$inferSelect;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;

export type LeaveRequest = typeof leaveRequests.$inferSelect;
export type InsertLeaveRequest = z.infer<typeof insertLeaveRequestSchema>;

export type LocationLog = typeof locationLogs.$inferSelect;
export type InsertLocationLog = z.infer<typeof insertLocationLogSchema>;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingSchema>;

// ==================== LOGIN SCHEMA ====================
export const loginSchema = z.object({
  username: z.string().min(1, "Username wajib diisi"),
  password: z.string().min(1, "Password wajib diisi"),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ==================== DASHBOARD STATS TYPE ====================
export type DashboardStats = {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  todayPresent: number;
  todayAbsent: number;
  todayLate: number;
  todayLeave: number;
  activeLeaveRequests: number;
  attendanceRate: number;
};
