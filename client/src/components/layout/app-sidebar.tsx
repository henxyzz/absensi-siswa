import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  ClipboardCheck,
  MapPin,
  Bell,
  Settings,
  LogOut,
  School,
  UserCog,
  MessageSquare,
  FileText,
  Database,
  HelpCircle,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { UserRole, type UserRoleType } from "@shared/schema";

interface NavItem {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  roles: UserRoleType[];
  badge?: string;
}

const mainNavItems: NavItem[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN_SEKOLAH, UserRole.GURU, UserRole.SISWA, UserRole.ORANG_TUA],
  },
  {
    title: "Absensi",
    url: "/attendance",
    icon: ClipboardCheck,
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN_SEKOLAH, UserRole.GURU, UserRole.SISWA],
  },
  {
    title: "Pelacakan GPS",
    url: "/tracking",
    icon: MapPin,
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN_SEKOLAH, UserRole.GURU],
    badge: "Live",
  },
  {
    title: "Izin Keluar",
    url: "/leave-requests",
    icon: FileText,
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN_SEKOLAH, UserRole.GURU, UserRole.SISWA],
  },
];

const managementNavItems: NavItem[] = [
  {
    title: "Siswa",
    url: "/students",
    icon: GraduationCap,
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN_SEKOLAH, UserRole.GURU],
  },
  {
    title: "Guru",
    url: "/teachers",
    icon: Users,
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN_SEKOLAH],
  },
  {
    title: "Kelas",
    url: "/classes",
    icon: School,
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN_SEKOLAH],
  },
  {
    title: "Pengguna",
    url: "/users",
    icon: UserCog,
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN_SEKOLAH],
  },
];

const systemNavItems: NavItem[] = [
  {
    title: "WhatsApp Bot",
    url: "/whatsapp",
    icon: MessageSquare,
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN_SEKOLAH],
  },
  {
    title: "Notifikasi",
    url: "/notifications",
    icon: Bell,
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN_SEKOLAH, UserRole.GURU, UserRole.SISWA, UserRole.ORANG_TUA],
  },
  {
    title: "Database",
    url: "/database",
    icon: Database,
    roles: [UserRole.SUPER_ADMIN],
  },
  {
    title: "Pengaturan",
    url: "/settings",
    icon: Settings,
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN_SEKOLAH],
  },
];

function getRoleBadgeColor(role: string) {
  switch (role) {
    case UserRole.SUPER_ADMIN:
      return "bg-rose-500/20 text-rose-400 border-rose-500/30";
    case UserRole.ADMIN_SEKOLAH:
      return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    case UserRole.GURU:
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    case UserRole.SISWA:
      return "bg-cyan-500/20 text-cyan-400 border-cyan-500/30";
    case UserRole.ORANG_TUA:
      return "bg-purple-500/20 text-purple-400 border-purple-500/30";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function getRoleLabel(role: string) {
  switch (role) {
    case UserRole.SUPER_ADMIN:
      return "Super Admin";
    case UserRole.ADMIN_SEKOLAH:
      return "Admin Sekolah";
    case UserRole.GURU:
      return "Guru";
    case UserRole.SISWA:
      return "Siswa";
    case UserRole.ORANG_TUA:
      return "Orang Tua";
    default:
      return role;
  }
}

export function AppSidebar() {
  const { user, logout, hasRole } = useAuth();
  const [location] = useLocation();

  const filterByRole = (items: NavItem[]) => {
    return items.filter((item) => hasRole(item.roles));
  };

  const isActive = (url: string) => location === url;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center neon-glow-cyan">
              <ClipboardCheck className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sidebar-foreground tracking-tight">AbsensiKu</span>
            <span className="text-xs text-muted-foreground">Sistem Absensi Digital</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2 mb-2">
            Menu Utama
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filterByRole(mainNavItems).map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    className={`min-h-[44px] ${isActive(item.url) ? "bg-sidebar-accent neon-border-cyan" : ""}`}
                  >
                    <Link href={item.url} data-testid={`nav-${item.url.slice(1)}`}>
                      <item.icon className={`w-5 h-5 ${isActive(item.url) ? "text-cyan-400" : ""}`} />
                      <span className="text-sm">{item.title}</span>
                      {item.badge && (
                        <Badge 
                          variant="outline" 
                          className="ml-auto text-[10px] px-1.5 py-0 bg-emerald-500/20 text-emerald-400 border-emerald-500/30 pulse-live"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {filterByRole(managementNavItems).length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2 mb-2 mt-4">
              Manajemen
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filterByRole(managementNavItems).map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      className={`min-h-[44px] ${isActive(item.url) ? "bg-sidebar-accent neon-border-cyan" : ""}`}
                    >
                      <Link href={item.url} data-testid={`nav-${item.url.slice(1)}`}>
                        <item.icon className={`w-5 h-5 ${isActive(item.url) ? "text-cyan-400" : ""}`} />
                        <span className="text-sm">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {filterByRole(systemNavItems).length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2 mb-2 mt-4">
              Sistem
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filterByRole(systemNavItems).map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      className={`min-h-[44px] ${isActive(item.url) ? "bg-sidebar-accent neon-border-cyan" : ""}`}
                    >
                      <Link href={item.url} data-testid={`nav-${item.url.slice(1)}`}>
                        <item.icon className={`w-5 h-5 ${isActive(item.url) ? "text-cyan-400" : ""}`} />
                        <span className="text-sm">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="w-10 h-10 border-2 border-cyan-500/30">
            <AvatarImage src={user?.profilePhoto || undefined} alt={user?.fullName} />
            <AvatarFallback className="bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 text-cyan-400">
              {user?.fullName ? getInitials(user.fullName) : "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.fullName || "Pengguna"}
            </p>
            <Badge 
              variant="outline" 
              className={`text-[10px] px-1.5 py-0 ${getRoleBadgeColor(user?.role || "")}`}
            >
              {getRoleLabel(user?.role || "")}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <SidebarMenuButton
            asChild
            className="flex-1 justify-center min-h-[44px]"
          >
            <Link href="/help" data-testid="nav-help">
              <HelpCircle className="w-5 h-5" />
              <span className="text-sm">Bantuan</span>
            </Link>
          </SidebarMenuButton>
          <SidebarMenuButton
            onClick={logout}
            className="flex-1 justify-center text-rose-400 hover:text-rose-300 min-h-[44px]"
            data-testid="button-logout"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm">Keluar</span>
          </SidebarMenuButton>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
