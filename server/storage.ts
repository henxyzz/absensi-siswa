import { 
  users, schools, classes, attendances, leaveRequests, 
  locationLogs, auditLogs, notifications, settings,
  type User, type InsertUser,
  type School, type InsertSchool,
  type Class, type InsertClass,
  type Attendance, type InsertAttendance,
  type LeaveRequest, type InsertLeaveRequest,
  type LocationLog, type InsertLocationLog,
  type AuditLog, type InsertAuditLog,
  type Notification, type InsertNotification,
  type Setting, type InsertSetting,
  type DashboardStats,
  UserRole, AttendanceStatus, LeaveStatus
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, sql, desc, count } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  getUsers(filters?: { role?: string; schoolId?: string; classId?: string }): Promise<User[]>;
  
  // Schools
  getSchool(id: string): Promise<School | undefined>;
  createSchool(school: InsertSchool): Promise<School>;
  updateSchool(id: string, data: Partial<InsertSchool>): Promise<School | undefined>;
  getSchools(): Promise<School[]>;
  
  // Classes
  getClass(id: string): Promise<Class | undefined>;
  createClass(classData: InsertClass): Promise<Class>;
  updateClass(id: string, data: Partial<InsertClass>): Promise<Class | undefined>;
  deleteClass(id: string): Promise<boolean>;
  getClasses(schoolId?: string): Promise<Class[]>;
  
  // Attendance
  getAttendance(id: string): Promise<Attendance | undefined>;
  createAttendance(attendance: InsertAttendance): Promise<Attendance>;
  updateAttendance(id: string, data: Partial<InsertAttendance>): Promise<Attendance | undefined>;
  getTodayAttendance(userId: string): Promise<Attendance | undefined>;
  getAttendances(filters: { userId?: string; date?: Date; schoolId?: string }): Promise<Attendance[]>;
  
  // Leave Requests
  getLeaveRequest(id: string): Promise<LeaveRequest | undefined>;
  createLeaveRequest(request: InsertLeaveRequest): Promise<LeaveRequest>;
  updateLeaveRequest(id: string, data: Partial<InsertLeaveRequest>): Promise<LeaveRequest | undefined>;
  getLeaveRequests(filters?: { userId?: string; status?: string }): Promise<LeaveRequest[]>;
  getActiveLeaveRequests(): Promise<LeaveRequest[]>;
  
  // Location Logs
  createLocationLog(log: InsertLocationLog): Promise<LocationLog>;
  getLocationLogs(filters: { userId?: string; leaveRequestId?: string }): Promise<LocationLog[]>;
  
  // Audit Logs
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(limit?: number): Promise<AuditLog[]>;
  
  // Notifications
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotifications(userId?: string): Promise<Notification[]>;
  updateNotification(id: string, data: Partial<InsertNotification>): Promise<Notification | undefined>;
  
  // Settings
  getSetting(key: string): Promise<Setting | undefined>;
  setSetting(key: string, value: unknown, description?: string): Promise<Setting>;
  
  // Dashboard
  getDashboardStats(schoolId?: string): Promise<DashboardStats>;
  
  // Seed
  seedDemoData(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // ==================== USERS ====================
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return true;
  }

  async getUsers(filters?: { role?: string; schoolId?: string; classId?: string }): Promise<User[]> {
    let query = db.select().from(users);
    
    const conditions = [];
    if (filters?.role) conditions.push(eq(users.role, filters.role));
    if (filters?.schoolId) conditions.push(eq(users.schoolId, filters.schoolId));
    if (filters?.classId) conditions.push(eq(users.classId, filters.classId));
    
    if (conditions.length > 0) {
      return db.select().from(users).where(and(...conditions));
    }
    return db.select().from(users);
  }

  // ==================== SCHOOLS ====================
  async getSchool(id: string): Promise<School | undefined> {
    const [school] = await db.select().from(schools).where(eq(schools.id, id));
    return school || undefined;
  }

  async createSchool(school: InsertSchool): Promise<School> {
    const [result] = await db.insert(schools).values(school).returning();
    return result;
  }

  async updateSchool(id: string, data: Partial<InsertSchool>): Promise<School | undefined> {
    const [school] = await db.update(schools).set(data).where(eq(schools.id, id)).returning();
    return school || undefined;
  }

  async getSchools(): Promise<School[]> {
    return db.select().from(schools);
  }

  // ==================== CLASSES ====================
  async getClass(id: string): Promise<Class | undefined> {
    const [classData] = await db.select().from(classes).where(eq(classes.id, id));
    return classData || undefined;
  }

  async createClass(classData: InsertClass): Promise<Class> {
    const [result] = await db.insert(classes).values(classData).returning();
    return result;
  }

  async updateClass(id: string, data: Partial<InsertClass>): Promise<Class | undefined> {
    const [classData] = await db.update(classes).set(data).where(eq(classes.id, id)).returning();
    return classData || undefined;
  }

  async deleteClass(id: string): Promise<boolean> {
    await db.delete(classes).where(eq(classes.id, id));
    return true;
  }

  async getClasses(schoolId?: string): Promise<Class[]> {
    if (schoolId) {
      return db.select().from(classes).where(eq(classes.schoolId, schoolId));
    }
    return db.select().from(classes);
  }

  // ==================== ATTENDANCE ====================
  async getAttendance(id: string): Promise<Attendance | undefined> {
    const [attendance] = await db.select().from(attendances).where(eq(attendances.id, id));
    return attendance || undefined;
  }

  async createAttendance(attendance: InsertAttendance): Promise<Attendance> {
    const [result] = await db.insert(attendances).values(attendance).returning();
    return result;
  }

  async updateAttendance(id: string, data: Partial<InsertAttendance>): Promise<Attendance | undefined> {
    const [attendance] = await db.update(attendances).set(data).where(eq(attendances.id, id)).returning();
    return attendance || undefined;
  }

  async getTodayAttendance(userId: string): Promise<Attendance | undefined> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [attendance] = await db.select().from(attendances)
      .where(and(
        eq(attendances.userId, userId),
        gte(attendances.date, today),
        lte(attendances.date, tomorrow)
      ));
    return attendance || undefined;
  }

  async getAttendances(filters: { userId?: string; date?: Date; schoolId?: string }): Promise<Attendance[]> {
    const conditions = [];
    if (filters.userId) conditions.push(eq(attendances.userId, filters.userId));
    if (filters.schoolId) conditions.push(eq(attendances.schoolId, filters.schoolId));
    if (filters.date) {
      const startOfDay = new Date(filters.date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(filters.date);
      endOfDay.setHours(23, 59, 59, 999);
      conditions.push(gte(attendances.date, startOfDay));
      conditions.push(lte(attendances.date, endOfDay));
    }

    if (conditions.length > 0) {
      return db.select().from(attendances).where(and(...conditions)).orderBy(desc(attendances.createdAt));
    }
    return db.select().from(attendances).orderBy(desc(attendances.createdAt));
  }

  // ==================== LEAVE REQUESTS ====================
  async getLeaveRequest(id: string): Promise<LeaveRequest | undefined> {
    const [request] = await db.select().from(leaveRequests).where(eq(leaveRequests.id, id));
    return request || undefined;
  }

  async createLeaveRequest(request: InsertLeaveRequest): Promise<LeaveRequest> {
    const [result] = await db.insert(leaveRequests).values(request).returning();
    return result;
  }

  async updateLeaveRequest(id: string, data: Partial<InsertLeaveRequest>): Promise<LeaveRequest | undefined> {
    const [request] = await db.update(leaveRequests).set({ ...data, updatedAt: new Date() }).where(eq(leaveRequests.id, id)).returning();
    return request || undefined;
  }

  async getLeaveRequests(filters?: { userId?: string; status?: string }): Promise<LeaveRequest[]> {
    const conditions = [];
    if (filters?.userId) conditions.push(eq(leaveRequests.userId, filters.userId));
    if (filters?.status) conditions.push(eq(leaveRequests.status, filters.status));

    if (conditions.length > 0) {
      return db.select().from(leaveRequests).where(and(...conditions)).orderBy(desc(leaveRequests.createdAt));
    }
    return db.select().from(leaveRequests).orderBy(desc(leaveRequests.createdAt));
  }

  async getActiveLeaveRequests(): Promise<LeaveRequest[]> {
    return db.select().from(leaveRequests)
      .where(eq(leaveRequests.status, LeaveStatus.APPROVED))
      .orderBy(desc(leaveRequests.createdAt));
  }

  // ==================== LOCATION LOGS ====================
  async createLocationLog(log: InsertLocationLog): Promise<LocationLog> {
    const [result] = await db.insert(locationLogs).values(log).returning();
    return result;
  }

  async getLocationLogs(filters: { userId?: string; leaveRequestId?: string }): Promise<LocationLog[]> {
    const conditions = [];
    if (filters.userId) conditions.push(eq(locationLogs.userId, filters.userId));
    if (filters.leaveRequestId) conditions.push(eq(locationLogs.leaveRequestId, filters.leaveRequestId));

    if (conditions.length > 0) {
      return db.select().from(locationLogs).where(and(...conditions)).orderBy(desc(locationLogs.timestamp));
    }
    return db.select().from(locationLogs).orderBy(desc(locationLogs.timestamp));
  }

  // ==================== AUDIT LOGS ====================
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [result] = await db.insert(auditLogs).values(log).returning();
    return result;
  }

  async getAuditLogs(limit: number = 100): Promise<AuditLog[]> {
    return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);
  }

  // ==================== NOTIFICATIONS ====================
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [result] = await db.insert(notifications).values(notification).returning();
    return result;
  }

  async getNotifications(userId?: string): Promise<Notification[]> {
    if (userId) {
      return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
    }
    return db.select().from(notifications).orderBy(desc(notifications.createdAt));
  }

  async updateNotification(id: string, data: Partial<InsertNotification>): Promise<Notification | undefined> {
    const [notification] = await db.update(notifications).set(data).where(eq(notifications.id, id)).returning();
    return notification || undefined;
  }

  // ==================== SETTINGS ====================
  async getSetting(key: string): Promise<Setting | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting || undefined;
  }

  async setSetting(key: string, value: unknown, description?: string): Promise<Setting> {
    const existing = await this.getSetting(key);
    if (existing) {
      const [result] = await db.update(settings)
        .set({ value, description, updatedAt: new Date() })
        .where(eq(settings.key, key))
        .returning();
      return result;
    }
    const [result] = await db.insert(settings).values({ key, value, description }).returning();
    return result;
  }

  // ==================== DASHBOARD ====================
  async getDashboardStats(schoolId?: string): Promise<DashboardStats> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get counts
    const studentsQuery = schoolId
      ? db.select({ count: count() }).from(users).where(and(eq(users.role, UserRole.SISWA), eq(users.schoolId, schoolId)))
      : db.select({ count: count() }).from(users).where(eq(users.role, UserRole.SISWA));
    
    const teachersQuery = schoolId
      ? db.select({ count: count() }).from(users).where(and(eq(users.role, UserRole.GURU), eq(users.schoolId, schoolId)))
      : db.select({ count: count() }).from(users).where(eq(users.role, UserRole.GURU));

    const classesQuery = schoolId
      ? db.select({ count: count() }).from(classes).where(eq(classes.schoolId, schoolId))
      : db.select({ count: count() }).from(classes);

    const [studentsResult] = await studentsQuery;
    const [teachersResult] = await teachersQuery;
    const [classesResult] = await classesQuery;

    // Today's attendance
    const todayAttendances = await db.select().from(attendances)
      .where(and(
        gte(attendances.date, today),
        lte(attendances.date, tomorrow)
      ));

    const todayPresent = todayAttendances.filter(a => a.status === AttendanceStatus.HADIR).length;
    const todayAbsent = todayAttendances.filter(a => a.status === AttendanceStatus.ALPHA).length;
    const todayLate = todayAttendances.filter(a => a.status === AttendanceStatus.IZIN).length;
    const todayLeave = todayAttendances.filter(a => a.status === AttendanceStatus.SAKIT).length;

    // Active leave requests
    const activeLeaves = await this.getActiveLeaveRequests();

    const totalStudents = Number(studentsResult?.count) || 0;
    const attendanceRate = totalStudents > 0 ? Math.round((todayPresent / totalStudents) * 100) : 0;

    return {
      totalStudents,
      totalTeachers: Number(teachersResult?.count) || 0,
      totalClasses: Number(classesResult?.count) || 0,
      todayPresent,
      todayAbsent,
      todayLate,
      todayLeave,
      activeLeaveRequests: activeLeaves.length,
      attendanceRate,
    };
  }

  async seedDemoData(): Promise<void> {
    const existingUsers = await db.select().from(users).limit(1);
    if (existingUsers.length > 0) {
      console.log("Data sudah ada, skip seeding");
      return;
    }

    console.log("Membuat data awal production...");

    const bcrypt = await import("bcrypt");
    const adminPassword = await bcrypt.hash("superadmin123", 10);

    const [school] = await db.insert(schools).values({
      name: "SMA Negeri 1 Jakarta",
      address: "Jl. Pendidikan No. 1, Jakarta Pusat",
      latitude: -6.2088,
      longitude: 106.8456,
      radiusMeters: 150,
    }).returning();

    const classData = [
      { name: "XII-IPA-1", grade: "XII", schoolId: school.id },
      { name: "XII-IPA-2", grade: "XII", schoolId: school.id },
      { name: "XII-IPS-1", grade: "XII", schoolId: school.id },
      { name: "XI-IPA-1", grade: "XI", schoolId: school.id },
      { name: "XI-IPA-2", grade: "XI", schoolId: school.id },
      { name: "X-IPA-1", grade: "X", schoolId: school.id },
    ];
    await db.insert(classes).values(classData);

    await db.insert(users).values({
      username: "superadmin",
      password: adminPassword,
      fullName: "Super Administrator",
      email: "superadmin@absensi.id",
      role: UserRole.SUPER_ADMIN,
      phone: "081200000001",
      isFirstLogin: false,
    });

    await db.insert(users).values({
      username: "admin",
      password: adminPassword,
      fullName: "Admin Sekolah",
      email: "admin@sman1.sch.id",
      role: UserRole.ADMIN_SEKOLAH,
      phone: "081200000002",
      schoolId: school.id,
      isFirstLogin: false,
    });

    console.log("Data awal production berhasil dibuat!");
    console.log("Login: superadmin / superadmin123 atau admin / superadmin123");
  }
}

export const storage = new DatabaseStorage();
