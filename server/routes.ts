import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import session from "express-session";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { 
  loginSchema, insertUserSchema, insertClassSchema, 
  insertAttendanceSchema, insertLeaveRequestSchema,
  UserRole, AttendanceStatus, LeaveStatus
} from "@shared/schema";
import { z } from "zod";

const JWT_SECRET = process.env.SESSION_SECRET || "absensi-secret-key-2024";
const UPLOAD_DIR = "./uploads";

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer config for file uploads
const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: uploadStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
});

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        role: string;
        schoolId?: string | null;
      };
    }
  }
}

// Auth middleware
const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || 
                  (req.session as any)?.token;
    
    if (!token) {
      return res.status(401).json({ message: "Tidak terautentikasi" });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await storage.getUser(decoded.id);
    
    if (!user) {
      return res.status(401).json({ message: "User tidak ditemukan" });
    }

    req.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      schoolId: user.schoolId,
    };
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token tidak valid" });
  }
};

// Role-based access control middleware
const requireRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Akses ditolak" });
    }
    next();
  };
};

// Calculate distance between two coordinates in meters
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Initialize Socket.IO for real-time updates
  const io = new SocketIOServer(httpServer, {
    path: '/ws',
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Socket.IO connection handling
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('join-school', (schoolId: string) => {
      socket.join(`school-${schoolId}`);
    });

    socket.on('location-update', async (data: { userId: string; lat: number; lng: number; leaveRequestId?: string }) => {
      try {
        // Save location log
        const log = await storage.createLocationLog({
          userId: data.userId,
          latitude: data.lat,
          longitude: data.lng,
          leaveRequestId: data.leaveRequestId,
          isWithinRadius: true, // Will be calculated based on school location
        });

        // Broadcast to admins/teachers
        const user = await storage.getUser(data.userId);
        if (user?.schoolId) {
          io.to(`school-${user.schoolId}`).emit('student-location', {
            userId: data.userId,
            latitude: data.lat,
            longitude: data.lng,
            timestamp: new Date(),
          });
        }
      } catch (error) {
        console.error('Location update error:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  // Seed demo data on startup
  await storage.seedDemoData();

  // ==================== AUTH ROUTES ====================
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Username atau password salah" });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Username atau password salah" });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Store token in session
      (req.session as any).token = token;

      // Log audit
      await storage.createAuditLog({
        userId: user.id,
        action: 'LOGIN',
        entityType: 'user',
        entityId: user.id,
        details: { ip: req.ip },
      });

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword, token });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      }
      console.error('Login error:', error);
      res.status(500).json({ message: "Terjadi kesalahan server" });
    }
  });

  app.post('/api/auth/logout', authenticate, async (req, res) => {
    try {
      await storage.createAuditLog({
        userId: req.user!.id,
        action: 'LOGOUT',
        entityType: 'user',
        entityId: req.user!.id,
      });
      
      (req.session as any).token = null;
      req.session.destroy(() => {});
      res.json({ message: "Berhasil logout" });
    } catch (error) {
      res.status(500).json({ message: "Terjadi kesalahan" });
    }
  });

  app.get('/api/auth/me', authenticate, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "User tidak ditemukan" });
      }
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      res.status(500).json({ message: "Terjadi kesalahan" });
    }
  });

  // ==================== DASHBOARD ROUTES ====================
  app.get('/api/dashboard/stats', authenticate, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats(req.user?.schoolId || undefined);
      res.json(stats);
    } catch (error) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({ message: "Terjadi kesalahan" });
    }
  });

  // ==================== USER ROUTES ====================
  app.get('/api/users', authenticate, requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN_SEKOLAH), async (req, res) => {
    try {
      const { role, classId } = req.query;
      const filters: any = {};
      if (role) filters.role = role as string;
      if (classId) filters.classId = classId as string;
      if (req.user?.role === UserRole.ADMIN_SEKOLAH && req.user?.schoolId) {
        filters.schoolId = req.user.schoolId;
      }
      
      const users = await storage.getUsers(filters);
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ message: "Terjadi kesalahan" });
    }
  });

  app.get('/api/users/:id', authenticate, async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User tidak ditemukan" });
      }
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Terjadi kesalahan" });
    }
  });

  app.post('/api/users', authenticate, requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN_SEKOLAH), async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username sudah digunakan" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
        schoolId: req.user?.schoolId || userData.schoolId,
      });

      await storage.createAuditLog({
        userId: req.user!.id,
        action: 'CREATE_USER',
        entityType: 'user',
        entityId: user.id,
        details: { username: user.username, role: user.role },
      });

      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      }
      console.error('Create user error:', error);
      res.status(500).json({ message: "Terjadi kesalahan" });
    }
  });

  app.patch('/api/users/:id', authenticate, async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // If updating password, hash it
      if (updateData.password) {
        updateData.password = await bcrypt.hash(updateData.password, 10);
      }

      const user = await storage.updateUser(id, updateData);
      if (!user) {
        return res.status(404).json({ message: "User tidak ditemukan" });
      }

      await storage.createAuditLog({
        userId: req.user!.id,
        action: 'UPDATE_USER',
        entityType: 'user',
        entityId: id,
      });

      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Terjadi kesalahan" });
    }
  });

  app.delete('/api/users/:id', authenticate, requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN_SEKOLAH), async (req, res) => {
    try {
      await storage.deleteUser(req.params.id);
      await storage.createAuditLog({
        userId: req.user!.id,
        action: 'DELETE_USER',
        entityType: 'user',
        entityId: req.params.id,
      });
      res.json({ message: "User berhasil dihapus" });
    } catch (error) {
      res.status(500).json({ message: "Terjadi kesalahan" });
    }
  });

  // ==================== CLASS ROUTES ====================
  app.get('/api/classes', authenticate, async (req, res) => {
    try {
      const schoolId = req.user?.schoolId || (req.query.schoolId as string);
      const classes = await storage.getClasses(schoolId);
      res.json(classes);
    } catch (error) {
      res.status(500).json({ message: "Terjadi kesalahan" });
    }
  });

  app.post('/api/classes', authenticate, requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN_SEKOLAH), async (req, res) => {
    try {
      const classData = insertClassSchema.parse(req.body);
      const newClass = await storage.createClass({
        ...classData,
        schoolId: req.user?.schoolId || classData.schoolId,
      });
      res.status(201).json(newClass);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      }
      res.status(500).json({ message: "Terjadi kesalahan" });
    }
  });

  app.patch('/api/classes/:id', authenticate, requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN_SEKOLAH), async (req, res) => {
    try {
      const updated = await storage.updateClass(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ message: "Kelas tidak ditemukan" });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Terjadi kesalahan" });
    }
  });

  app.delete('/api/classes/:id', authenticate, requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN_SEKOLAH), async (req, res) => {
    try {
      await storage.deleteClass(req.params.id);
      res.json({ message: "Kelas berhasil dihapus" });
    } catch (error) {
      res.status(500).json({ message: "Terjadi kesalahan" });
    }
  });

  // ==================== SCHOOL ROUTES ====================
  app.get('/api/schools', authenticate, async (req, res) => {
    try {
      const schools = await storage.getSchools();
      res.json(schools);
    } catch (error) {
      res.status(500).json({ message: "Terjadi kesalahan" });
    }
  });

  app.get('/api/schools/:id', authenticate, async (req, res) => {
    try {
      const school = await storage.getSchool(req.params.id);
      if (!school) {
        return res.status(404).json({ message: "Sekolah tidak ditemukan" });
      }
      res.json(school);
    } catch (error) {
      res.status(500).json({ message: "Terjadi kesalahan" });
    }
  });

  // ==================== ATTENDANCE ROUTES ====================
  app.get('/api/attendance', authenticate, async (req, res) => {
    try {
      const { date, userId } = req.query;
      const filters: any = {};
      
      if (date) filters.date = new Date(date as string);
      if (userId) filters.userId = userId as string;
      if (req.user?.schoolId) filters.schoolId = req.user.schoolId;

      const attendances = await storage.getAttendances(filters);
      res.json(attendances);
    } catch (error) {
      res.status(500).json({ message: "Terjadi kesalahan" });
    }
  });

  app.get('/api/attendance/today', authenticate, async (req, res) => {
    try {
      const attendance = await storage.getTodayAttendance(req.user!.id);
      res.json(attendance || null);
    } catch (error) {
      res.status(500).json({ message: "Terjadi kesalahan" });
    }
  });

  app.post('/api/attendance/checkin', authenticate, upload.single('photo'), async (req, res) => {
    try {
      const { latitude, longitude } = req.body;
      
      // Check if already checked in today
      const existingAttendance = await storage.getTodayAttendance(req.user!.id);
      if (existingAttendance?.checkInTime) {
        return res.status(400).json({ message: "Anda sudah absen masuk hari ini" });
      }

      // Get school for location validation
      let isLocationValid = true;
      if (req.user?.schoolId) {
        const school = await storage.getSchool(req.user.schoolId);
        if (school?.latitude && school?.longitude && latitude && longitude) {
          const distance = calculateDistance(
            parseFloat(latitude),
            parseFloat(longitude),
            school.latitude,
            school.longitude
          );
          isLocationValid = distance <= (school.radiusMeters || 100);
        }
      }

      const photoPath = req.file ? `/uploads/${req.file.filename}` : undefined;

      let attendance;
      if (existingAttendance) {
        attendance = await storage.updateAttendance(existingAttendance.id, {
          checkInTime: new Date(),
          checkInLatitude: latitude ? parseFloat(latitude) : undefined,
          checkInLongitude: longitude ? parseFloat(longitude) : undefined,
          checkInPhoto: photoPath,
          isLocationValid,
          status: AttendanceStatus.HADIR,
        });
      } else {
        attendance = await storage.createAttendance({
          userId: req.user!.id,
          schoolId: req.user?.schoolId,
          date: new Date(),
          checkInTime: new Date(),
          checkInLatitude: latitude ? parseFloat(latitude) : undefined,
          checkInLongitude: longitude ? parseFloat(longitude) : undefined,
          checkInPhoto: photoPath,
          isLocationValid,
          status: AttendanceStatus.HADIR,
        });
      }

      // Emit real-time update
      if (req.user?.schoolId) {
        io.to(`school-${req.user.schoolId}`).emit('attendance-update', {
          type: 'checkin',
          userId: req.user.id,
          attendance,
        });
      }

      await storage.createAuditLog({
        userId: req.user!.id,
        action: 'CHECK_IN',
        entityType: 'attendance',
        entityId: attendance!.id,
        details: { isLocationValid, latitude, longitude },
      });

      res.json(attendance);
    } catch (error) {
      console.error('Check-in error:', error);
      res.status(500).json({ message: "Terjadi kesalahan" });
    }
  });

  app.post('/api/attendance/checkout', authenticate, upload.single('photo'), async (req, res) => {
    try {
      const { latitude, longitude } = req.body;
      
      const attendance = await storage.getTodayAttendance(req.user!.id);
      if (!attendance) {
        return res.status(400).json({ message: "Anda belum absen masuk hari ini" });
      }
      if (attendance.checkOutTime) {
        return res.status(400).json({ message: "Anda sudah absen pulang hari ini" });
      }

      const photoPath = req.file ? `/uploads/${req.file.filename}` : undefined;

      const updated = await storage.updateAttendance(attendance.id, {
        checkOutTime: new Date(),
        checkOutLatitude: latitude ? parseFloat(latitude) : undefined,
        checkOutLongitude: longitude ? parseFloat(longitude) : undefined,
        checkOutPhoto: photoPath,
      });

      // Emit real-time update
      if (req.user?.schoolId) {
        io.to(`school-${req.user.schoolId}`).emit('attendance-update', {
          type: 'checkout',
          userId: req.user.id,
          attendance: updated,
        });
      }

      await storage.createAuditLog({
        userId: req.user!.id,
        action: 'CHECK_OUT',
        entityType: 'attendance',
        entityId: attendance.id,
      });

      res.json(updated);
    } catch (error) {
      console.error('Check-out error:', error);
      res.status(500).json({ message: "Terjadi kesalahan" });
    }
  });

  // ==================== LEAVE REQUEST ROUTES ====================
  app.get('/api/leave-requests', authenticate, async (req, res) => {
    try {
      const { status } = req.query;
      const filters: any = {};
      
      if (status) filters.status = status as string;
      
      // Students can only see their own requests
      if (req.user?.role === UserRole.SISWA) {
        filters.userId = req.user.id;
      }

      const requests = await storage.getLeaveRequests(filters);
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Terjadi kesalahan" });
    }
  });

  app.get('/api/leave-requests/active', authenticate, async (req, res) => {
    try {
      const requests = await storage.getActiveLeaveRequests();
      
      // Get user details for each request
      const requestsWithUsers = await Promise.all(
        requests.map(async (request) => {
          const user = await storage.getUser(request.userId);
          const latestLogs = await storage.getLocationLogs({ leaveRequestId: request.id });
          return {
            ...request,
            user: user ? { id: user.id, fullName: user.fullName, profilePhoto: user.profilePhoto } : null,
            latestLocation: latestLogs[0] || null,
          };
        })
      );
      
      res.json(requestsWithUsers);
    } catch (error) {
      res.status(500).json({ message: "Terjadi kesalahan" });
    }
  });

  app.post('/api/leave-requests', authenticate, async (req, res) => {
    try {
      const requestData = insertLeaveRequestSchema.parse({
        ...req.body,
        userId: req.user!.id,
        startTime: new Date(req.body.startTime),
        expectedReturnTime: req.body.expectedReturnTime ? new Date(req.body.expectedReturnTime) : undefined,
      });

      const request = await storage.createLeaveRequest(requestData);

      // Notify admins/teachers
      if (req.user?.schoolId) {
        io.to(`school-${req.user.schoolId}`).emit('leave-request-new', {
          request,
          userId: req.user.id,
        });
      }

      await storage.createAuditLog({
        userId: req.user!.id,
        action: 'CREATE_LEAVE_REQUEST',
        entityType: 'leave_request',
        entityId: request.id,
      });

      res.status(201).json(request);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      }
      console.error('Create leave request error:', error);
      res.status(500).json({ message: "Terjadi kesalahan" });
    }
  });

  app.patch('/api/leave-requests/:id/approve', authenticate, requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN_SEKOLAH, UserRole.GURU), async (req, res) => {
    try {
      const request = await storage.updateLeaveRequest(req.params.id, {
        status: LeaveStatus.APPROVED,
        approvedById: req.user!.id,
      });

      if (!request) {
        return res.status(404).json({ message: "Permintaan tidak ditemukan" });
      }

      // Notify student
      io.emit('leave-request-approved', { requestId: request.id, userId: request.userId });

      await storage.createAuditLog({
        userId: req.user!.id,
        action: 'APPROVE_LEAVE_REQUEST',
        entityType: 'leave_request',
        entityId: req.params.id,
      });

      res.json(request);
    } catch (error) {
      res.status(500).json({ message: "Terjadi kesalahan" });
    }
  });

  app.patch('/api/leave-requests/:id/reject', authenticate, requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN_SEKOLAH, UserRole.GURU), async (req, res) => {
    try {
      const request = await storage.updateLeaveRequest(req.params.id, {
        status: LeaveStatus.REJECTED,
        approvedById: req.user!.id,
      });

      if (!request) {
        return res.status(404).json({ message: "Permintaan tidak ditemukan" });
      }

      await storage.createAuditLog({
        userId: req.user!.id,
        action: 'REJECT_LEAVE_REQUEST',
        entityType: 'leave_request',
        entityId: req.params.id,
      });

      res.json(request);
    } catch (error) {
      res.status(500).json({ message: "Terjadi kesalahan" });
    }
  });

  app.patch('/api/leave-requests/:id/complete', authenticate, async (req, res) => {
    try {
      const request = await storage.updateLeaveRequest(req.params.id, {
        status: LeaveStatus.COMPLETED,
        actualReturnTime: new Date(),
      });

      if (!request) {
        return res.status(404).json({ message: "Permintaan tidak ditemukan" });
      }

      await storage.createAuditLog({
        userId: req.user!.id,
        action: 'COMPLETE_LEAVE_REQUEST',
        entityType: 'leave_request',
        entityId: req.params.id,
      });

      res.json(request);
    } catch (error) {
      res.status(500).json({ message: "Terjadi kesalahan" });
    }
  });

  // ==================== LOCATION TRACKING ROUTES ====================
  // POST /api/location-logs - Save location updates
  app.post('/api/location-logs', authenticate, async (req, res) => {
    try {
      const { latitude, longitude, leaveRequestId, accuracy } = req.body;

      if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        return res.status(400).json({ message: "Latitude dan longitude harus berupa angka" });
      }

      // Check if within school radius
      let isWithinRadius = true;
      if (req.user?.schoolId) {
        const school = await storage.getSchool(req.user.schoolId);
        if (school?.latitude && school?.longitude) {
          const distance = calculateDistance(latitude, longitude, school.latitude, school.longitude);
          isWithinRadius = distance <= (school.radiusMeters || 100);
        }
      }

      const log = await storage.createLocationLog({
        userId: req.user!.id,
        latitude,
        longitude,
        accuracy,
        leaveRequestId,
        isWithinRadius,
      });

      // Alert if outside radius
      if (!isWithinRadius && leaveRequestId) {
        await storage.updateLeaveRequest(leaveRequestId, { isOutOfRadius: true });
        
        if (req.user?.schoolId) {
          io.to(`school-${req.user.schoolId}`).emit('radius-alert', {
            userId: req.user.id,
            leaveRequestId,
            latitude,
            longitude,
          });
        }

        // Create notification for out of radius
        await storage.createNotification({
          userId: req.user!.id,
          type: 'RADIUS_ALERT',
          message: `Siswa keluar dari radius yang diizinkan`,
        });
      }

      // Broadcast location update to admins/teachers
      if (req.user?.schoolId) {
        io.to(`school-${req.user.schoolId}`).emit('student-location', {
          userId: req.user.id,
          latitude,
          longitude,
          timestamp: new Date(),
          leaveRequestId,
        });
      }

      res.json(log);
    } catch (error) {
      console.error('Location log error:', error);
      res.status(500).json({ message: "Terjadi kesalahan" });
    }
  });

  // GET /api/location-logs/:userId - Get location history for a user
  app.get('/api/location-logs/:userId', authenticate, async (req, res) => {
    try {
      const { userId } = req.params;
      const { leaveRequestId } = req.query;

      // Users can only view their own location logs unless they have admin/teacher role
      const isAdminOrTeacher = [UserRole.SUPER_ADMIN, UserRole.ADMIN_SEKOLAH, UserRole.GURU].includes(req.user!.role as any);
      if (!isAdminOrTeacher && req.user!.id !== userId) {
        return res.status(403).json({ message: "Akses ditolak" });
      }

      const filters: { userId?: string; leaveRequestId?: string } = { userId };
      if (leaveRequestId) {
        filters.leaveRequestId = leaveRequestId as string;
      }

      const logs = await storage.getLocationLogs(filters);
      res.json(logs);
    } catch (error) {
      console.error('Get location logs error:', error);
      res.status(500).json({ message: "Terjadi kesalahan" });
    }
  });

  // GET /api/location-logs - Get all location logs (for current user if student, or all if admin)
  app.get('/api/location-logs', authenticate, async (req, res) => {
    try {
      const { leaveRequestId } = req.query;
      const isAdminOrTeacher = [UserRole.SUPER_ADMIN, UserRole.ADMIN_SEKOLAH, UserRole.GURU].includes(req.user!.role as any);

      const filters: { userId?: string; leaveRequestId?: string } = {};
      
      // Students can only see their own logs
      if (!isAdminOrTeacher) {
        filters.userId = req.user!.id;
      }
      
      if (leaveRequestId) {
        filters.leaveRequestId = leaveRequestId as string;
      }

      const logs = await storage.getLocationLogs(filters);
      res.json(logs);
    } catch (error) {
      console.error('Get location logs error:', error);
      res.status(500).json({ message: "Terjadi kesalahan" });
    }
  });

  app.post('/api/location', authenticate, async (req, res) => {
    try {
      const { latitude, longitude, leaveRequestId } = req.body;

      // Check if within school radius
      let isWithinRadius = true;
      if (req.user?.schoolId) {
        const school = await storage.getSchool(req.user.schoolId);
        if (school?.latitude && school?.longitude) {
          const distance = calculateDistance(latitude, longitude, school.latitude, school.longitude);
          isWithinRadius = distance <= (school.radiusMeters || 100);
        }
      }

      const log = await storage.createLocationLog({
        userId: req.user!.id,
        latitude,
        longitude,
        leaveRequestId,
        isWithinRadius,
      });

      // Alert if outside radius
      if (!isWithinRadius && leaveRequestId) {
        await storage.updateLeaveRequest(leaveRequestId, { isOutOfRadius: true });
        
        if (req.user?.schoolId) {
          io.to(`school-${req.user.schoolId}`).emit('radius-alert', {
            userId: req.user.id,
            leaveRequestId,
            latitude,
            longitude,
          });
        }

        // Create notification
        await storage.createNotification({
          userId: req.user!.id,
          type: 'RADIUS_ALERT',
          message: `Siswa keluar dari radius yang diizinkan`,
        });
      }

      res.json(log);
    } catch (error) {
      console.error('Location log error:', error);
      res.status(500).json({ message: "Terjadi kesalahan" });
    }
  });

  app.get('/api/location/:userId', authenticate, requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN_SEKOLAH, UserRole.GURU), async (req, res) => {
    try {
      const logs = await storage.getLocationLogs({ userId: req.params.userId });
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Terjadi kesalahan" });
    }
  });

  // ==================== NOTIFICATION ROUTES ====================
  app.get('/api/notifications', authenticate, async (req, res) => {
    try {
      const notifications = await storage.getNotifications(req.user!.id);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Terjadi kesalahan" });
    }
  });

  // ==================== AUDIT LOG ROUTES ====================
  app.get('/api/audit-logs', authenticate, requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN_SEKOLAH), async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const logs = await storage.getAuditLogs(limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Terjadi kesalahan" });
    }
  });

  // ==================== FILE UPLOAD ROUTE ====================
  app.post('/api/upload', authenticate, upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "File tidak ditemukan" });
    }
    res.json({ 
      path: `/uploads/${req.file.filename}`,
      filename: req.file.filename,
    });
  });

  // Serve uploaded files
  app.use('/uploads', (req, res, next) => {
    const filePath = path.join(UPLOAD_DIR, req.path);
    if (fs.existsSync(filePath)) {
      res.sendFile(path.resolve(filePath));
    } else {
      res.status(404).json({ message: "File tidak ditemukan" });
    }
  });

  return httpServer;
}
