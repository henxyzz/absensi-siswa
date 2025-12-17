import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AuthProvider, ProtectedRoute } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";
import { SmartGuide } from "@/components/smart-guide/smart-guide";

import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import AttendancePage from "@/pages/attendance";
import TrackingPage from "@/pages/tracking";
import LeaveRequestsPage from "@/pages/leave-requests";
import StudentsPage from "@/pages/students";
import UsersPage from "@/pages/users";
import ClassesPage from "@/pages/classes";
import NotFound from "@/pages/not-found";

function AppLayout({ children }: { children: React.ReactNode }) {
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3.5rem",
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto">{children}</main>
        </SidebarInset>
      </div>
      <SmartGuide />
    </SidebarProvider>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/">
        <ProtectedRoute>
          <AppLayout>
            <DashboardPage />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard">
        <ProtectedRoute>
          <AppLayout>
            <DashboardPage />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/attendance">
        <ProtectedRoute>
          <AppLayout>
            <AttendancePage />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/tracking">
        <ProtectedRoute>
          <AppLayout>
            <TrackingPage />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/leave-requests">
        <ProtectedRoute>
          <AppLayout>
            <LeaveRequestsPage />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/students">
        <ProtectedRoute>
          <AppLayout>
            <StudentsPage />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/users">
        <ProtectedRoute>
          <AppLayout>
            <UsersPage />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/classes">
        <ProtectedRoute>
          <AppLayout>
            <ClassesPage />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthProvider>
            <Router />
            <Toaster />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
