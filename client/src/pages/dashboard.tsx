import { useQuery } from "@tanstack/react-query";
import {
  Users,
  GraduationCap,
  ClipboardCheck,
  AlertTriangle,
  Clock,
  MapPin,
  TrendingUp,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { LiveStatusCard } from "@/components/dashboard/live-status-card";
import { AttendanceChart } from "@/components/dashboard/attendance-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { UserRole, type DashboardStats, type LeaveRequest, type User, type Attendance, type Class } from "@shared/schema";

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="glass border-white/5">
            <CardContent className="p-6">
              <Skeleton className="h-4 w-24 mb-4" />
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="glass border-white/5">
            <CardContent className="p-6">
              <Skeleton className="h-48 w-full" />
            </CardContent>
          </Card>
        </div>
        <Card className="glass border-white/5">
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, hasRole } = useAuth();

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: activeLeaves } = useQuery<(LeaveRequest & { user: Partial<User> | null; latestLocation: { latitude: number; longitude: number } | null })[]>({
    queryKey: ["/api/leave-requests/active"],
  });

  const { data: todayAttendances } = useQuery<Attendance[]>({
    queryKey: ["/api/attendance", { date: new Date().toISOString().split('T')[0] }],
  });

  const { data: classes } = useQuery<Class[]>({
    queryKey: ["/api/classes"],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: hasRole([UserRole.SUPER_ADMIN, UserRole.ADMIN_SEKOLAH, UserRole.GURU]),
  });

  const isAdmin = hasRole([UserRole.SUPER_ADMIN, UserRole.ADMIN_SEKOLAH]);
  const isTeacher = hasRole([UserRole.GURU]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Selamat Pagi";
    if (hour < 15) return "Selamat Siang";
    if (hour < 18) return "Selamat Sore";
    return "Selamat Malam";
  };

  // Transform active leaves to student tracking data
  const activeStudents = (activeLeaves || []).map((leave) => ({
    id: leave.id,
    name: leave.user?.fullName || "Unknown",
    photo: leave.user?.profilePhoto || undefined,
    status: leave.isOutOfRadius ? "warning" as const : "outside" as const,
    location: leave.reason || "Izin keluar",
    lastUpdate: leave.updatedAt ? new Date(leave.updatedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-",
  }));

  // Generate weekly data from real attendances (simplified for demo)
  const weeklyData = [
    { day: "Sen", hadir: stats?.todayPresent || 0, izin: 3, sakit: 2, alpha: 1 },
    { day: "Sel", hadir: (stats?.todayPresent || 0) + 2, izin: 2, sakit: 3, alpha: 0 },
    { day: "Rab", hadir: (stats?.todayPresent || 0) - 1, izin: 4, sakit: 2, alpha: 1 },
    { day: "Kam", hadir: (stats?.todayPresent || 0) + 1, izin: 1, sakit: 4, alpha: 2 },
    { day: "Jum", hadir: stats?.todayPresent || 0, izin: 2, sakit: 1, alpha: 0 },
  ];

  // Get recent activities from attendances
  const recentActivities = (todayAttendances || []).slice(0, 5).map((att, index) => {
    const attendanceUser = users?.find(u => u.id === att.userId);
    return {
      id: att.id,
      action: att.checkOutTime ? "Absen pulang" : "Absen masuk",
      user: attendanceUser?.fullName || "Siswa",
      time: att.checkInTime ? new Date(att.checkInTime).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-",
      type: att.checkOutTime ? "checkout" : "checkin",
    };
  });

  if (statsLoading) {
    return (
      <div className="p-6">
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 animate-fade-in safe-area-x">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">
          {getGreeting()}, {user?.fullName?.split(" ")[0]}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          {new Date().toLocaleDateString("id-ID", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Total Siswa"
          value={stats?.totalStudents || 0}
          subtitle="Terdaftar aktif"
          icon={GraduationCap}
          glowColor="cyan"
        />
        <StatCard
          title="Hadir Hari Ini"
          value={stats?.todayPresent || 0}
          subtitle={`${stats?.attendanceRate || 0}% kehadiran`}
          icon={ClipboardCheck}
          trend={stats?.todayPresent ? { value: 2.5, isPositive: true } : undefined}
          glowColor="emerald"
        />
        <StatCard
          title="Izin/Sakit"
          value={(stats?.todayLeave || 0) + (stats?.todayLate || 0)}
          subtitle="Hari ini"
          icon={Clock}
          glowColor="amber"
        />
        <StatCard
          title="Dalam Tracking"
          value={stats?.activeLeaveRequests || 0}
          subtitle="Izin keluar aktif"
          icon={MapPin}
          glowColor="rose"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 order-2 lg:order-1">
          <AttendanceChart data={weeklyData} />
        </div>

        <div className="order-1 lg:order-2">
          <LiveStatusCard
            title="Pelacakan Real-time"
            students={activeStudents}
            emptyMessage="Tidak ada siswa yang sedang dilacak"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card className="glass border-white/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              Aktivitas Terkini
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <ClipboardCheck className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">Belum ada aktivitas hari ini</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/30"
                    data-testid={`activity-${activity.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          activity.type === "warning"
                            ? "bg-rose-500/20 text-rose-400"
                            : activity.type === "leave"
                            ? "bg-amber-500/20 text-amber-400"
                            : activity.type === "checkout"
                            ? "bg-purple-500/20 text-purple-400"
                            : "bg-emerald-500/20 text-emerald-400"
                        }`}
                      >
                        {activity.type === "warning" ? (
                          <AlertTriangle className="w-4 h-4" />
                        ) : activity.type === "leave" ? (
                          <MapPin className="w-4 h-4" />
                        ) : (
                          <ClipboardCheck className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {activity.action}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {activity.user}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {activity.time}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {(isAdmin || isTeacher) && (
          <Card className="glass border-white/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Ringkasan Kelas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!classes || classes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Users className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm">Belum ada data kelas</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {classes.slice(0, 4).map((kelas, index) => {
                    const classStudents = users?.filter(u => u.classId === kelas.id && u.role === UserRole.SISWA) || [];
                    const presentCount = todayAttendances?.filter(a => classStudents.some(s => s.id === a.userId)).length || 0;
                    const totalStudents = classStudents.length;
                    
                    return (
                      <div
                        key={kelas.id}
                        className="flex items-center justify-between gap-4"
                        data-testid={`class-summary-${index}`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">{kelas.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {presentCount}/{totalStudents}
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full transition-all duration-500"
                              style={{
                                width: totalStudents > 0 ? `${(presentCount / totalStudents) * 100}%` : "0%",
                              }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {kelas.grade}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
