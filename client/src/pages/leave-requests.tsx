import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FileText, Plus, Check, X, Clock, Loader2, MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useSpeech } from "@/hooks/use-speech";
import { useAuth } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useGeolocation, GeolocationStatusBadge } from "@/lib/useGeolocation.tsx";
import { UserRole, LeaveStatus, type LeaveRequest, type User } from "@shared/schema";

const leaveRequestFormSchema = z.object({
  reason: z.string().min(5, "Alasan minimal 5 karakter"),
  expectedReturnTime: z.string().optional(),
});

type LeaveRequestFormData = z.infer<typeof leaveRequestFormSchema>;

export default function LeaveRequestsPage() {
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const { announce } = useSpeech();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const isStudent = hasRole([UserRole.SISWA]);
  const canApprove = hasRole([UserRole.SUPER_ADMIN, UserRole.ADMIN_SEKOLAH, UserRole.GURU]);

  const { data: leaveRequests, isLoading } = useQuery<LeaveRequest[]>({
    queryKey: ["/api/leave-requests"],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: canApprove,
  });

  const activeLeaveRequest = useMemo(() => {
    if (!isStudent || !leaveRequests) return null;
    return leaveRequests.find((r) => r.status === LeaveStatus.APPROVED && r.userId === user?.id) || null;
  }, [leaveRequests, isStudent, user?.id]);

  const shouldTrack = isStudent && !!activeLeaveRequest;

  const {
    trackingStatus,
    permissionStatus,
    lastUpdateTime,
    isWithinRadius,
    error: geoError,
    position,
    requestPermission,
    startTracking,
    stopTracking,
  } = useGeolocation({
    leaveRequestId: activeLeaveRequest?.id,
    enabled: shouldTrack,
  });

  useEffect(() => {
    if (shouldTrack && permissionStatus === "prompt") {
      requestPermission();
    }
  }, [shouldTrack, permissionStatus, requestPermission]);

  const form = useForm<LeaveRequestFormData>({
    resolver: zodResolver(leaveRequestFormSchema),
    defaultValues: {
      reason: "",
      expectedReturnTime: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: LeaveRequestFormData) => {
      return apiRequest("POST", "/api/leave-requests", {
        reason: data.reason,
        startTime: new Date().toISOString(),
        expectedReturnTime: data.expectedReturnTime
          ? new Date(data.expectedReturnTime).toISOString()
          : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
      toast({ title: "Berhasil", description: "Permintaan izin telah diajukan" });
      announce("Permintaan izin telah diajukan");
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/leave-requests/${id}/approve`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
      toast({ title: "Berhasil", description: "Izin telah disetujui" });
      announce("Izin telah disetujui");
    },
    onError: (error: Error) => {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/leave-requests/${id}/reject`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
      toast({ title: "Berhasil", description: "Izin telah ditolak" });
      announce("Izin telah ditolak");
    },
    onError: (error: Error) => {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/leave-requests/${id}/complete`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
      toast({ title: "Berhasil", description: "Izin telah diselesaikan" });
      announce("Izin telah diselesaikan");
    },
    onError: (error: Error) => {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: LeaveRequestFormData) => {
    createMutation.mutate(data);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      [LeaveStatus.PENDING]: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      [LeaveStatus.APPROVED]: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      [LeaveStatus.REJECTED]: "bg-rose-500/20 text-rose-400 border-rose-500/30",
      [LeaveStatus.COMPLETED]: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    };
    const labels = {
      [LeaveStatus.PENDING]: "Menunggu",
      [LeaveStatus.APPROVED]: "Disetujui",
      [LeaveStatus.REJECTED]: "Ditolak",
      [LeaveStatus.COMPLETED]: "Selesai",
    };
    return (
      <Badge variant="outline" className={styles[status as keyof typeof styles] || ""}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const getUserName = (userId: string) => {
    const requestUser = users?.find((u) => u.id === userId);
    return requestUser?.fullName || "Unknown";
  };

  const pendingRequests = leaveRequests?.filter((r) => r.status === LeaveStatus.PENDING) || [];
  const activeRequests = leaveRequests?.filter((r) => r.status === LeaveStatus.APPROVED) || [];
  const completedRequests = leaveRequests?.filter(
    (r) => r.status === LeaveStatus.COMPLETED || r.status === LeaveStatus.REJECTED
  ) || [];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6 text-cyan-400" />
            Izin Keluar
          </h1>
          <p className="text-muted-foreground">
            {isStudent ? "Ajukan dan pantau status izin keluar Anda" : "Kelola permintaan izin keluar siswa"}
          </p>
        </div>

        {isStudent && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-cyan-500 to-emerald-500" data-testid="button-new-leave">
                <Plus className="w-4 h-4 mr-2" />
                Ajukan Izin
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-strong">
              <DialogHeader>
                <DialogTitle>Ajukan Izin Keluar</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Alasan</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tuliskan alasan izin keluar..."
                            className="bg-muted/50"
                            data-testid="input-reason"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="expectedReturnTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estimasi Waktu Kembali (Opsional)</FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            className="bg-muted/50"
                            data-testid="input-return-time"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-cyan-500 to-emerald-500"
                    disabled={createMutation.isPending}
                    data-testid="button-submit-leave"
                  >
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Memproses...
                      </>
                    ) : (
                      "Ajukan Izin"
                    )}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Geolocation Tracking Status Card for Students with Active Leave */}
      {isStudent && activeLeaveRequest && (
        <Card className="glass border-white/5 border-l-4 border-l-cyan-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Navigation className="w-4 h-4 text-cyan-400" />
              Pelacakan Lokasi
            </CardTitle>
            <CardDescription>
              Lokasi Anda dilacak selama izin keluar aktif
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <GeolocationStatusBadge
              trackingStatus={trackingStatus}
              permissionStatus={permissionStatus}
              lastUpdateTime={lastUpdateTime}
              isWithinRadius={isWithinRadius}
              error={geoError}
            />
            
            {position && (
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3 h-3" />
                  <span>Lat: {position.latitude.toFixed(6)}, Lng: {position.longitude.toFixed(6)}</span>
                </div>
                <div>Akurasi: ±{position.accuracy.toFixed(0)} meter</div>
              </div>
            )}

            {permissionStatus === "denied" && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-sm text-rose-400">
                <p className="font-medium">Izin Lokasi Ditolak</p>
                <p className="text-xs mt-1">
                  Untuk melacak lokasi Anda, aktifkan izin lokasi di pengaturan browser Anda.
                </p>
              </div>
            )}

            {permissionStatus === "unsupported" && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm text-amber-400">
                <p className="font-medium">Geolokasi Tidak Didukung</p>
                <p className="text-xs mt-1">
                  Browser Anda tidak mendukung geolokasi. Gunakan browser modern.
                </p>
              </div>
            )}

            {isWithinRadius === false && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-sm text-rose-400">
                <p className="font-medium">⚠️ Anda di Luar Radius</p>
                <p className="text-xs mt-1">
                  Anda berada di luar radius yang diizinkan. Guru/admin akan diberitahu.
                </p>
              </div>
            )}

            {trackingStatus === "error" && geoError && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => startTracking()}
                className="w-full"
              >
                <Navigation className="w-4 h-4 mr-2" />
                Coba Lagi
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {canApprove && pendingRequests.length > 0 && (
        <Card className="glass border-white/5 border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              Menunggu Persetujuan
              <Badge variant="outline" className="ml-2 bg-amber-500/20 text-amber-400 border-amber-500/30">
                {pendingRequests.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between gap-4 p-4 rounded-lg bg-muted/30"
                  data-testid={`pending-request-${request.id}`}
                >
                  <div>
                    <p className="font-medium">{getUserName(request.userId)}</p>
                    <p className="text-sm text-muted-foreground">{request.reason}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(request.startTime).toLocaleString("id-ID")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                      onClick={() => approveMutation.mutate(request.id)}
                      disabled={approveMutation.isPending}
                      data-testid={`button-approve-${request.id}`}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Setujui
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-rose-400 border-rose-500/30 hover:bg-rose-500/20"
                      onClick={() => rejectMutation.mutate(request.id)}
                      disabled={rejectMutation.isPending}
                      data-testid={`button-reject-${request.id}`}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Tolak
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {activeRequests.length > 0 && (
        <Card className="glass border-white/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 pulse-live" />
              Izin Aktif
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between gap-4 p-4 rounded-lg bg-muted/30"
                  data-testid={`active-request-${request.id}`}
                >
                  <div>
                    <p className="font-medium">
                      {isStudent ? "Izin Anda" : getUserName(request.userId)}
                    </p>
                    <p className="text-sm text-muted-foreground">{request.reason}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Mulai: {new Date(request.startTime).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                      {request.expectedReturnTime && (
                        <> • Estimasi kembali: {new Date(request.expectedReturnTime).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(request.status)}
                    {(isStudent || canApprove) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => completeMutation.mutate(request.id)}
                        disabled={completeMutation.isPending}
                        data-testid={`button-complete-${request.id}`}
                      >
                        Sudah Kembali
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="glass border-white/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Riwayat Izin</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  {canApprove && <th className="text-left p-4 text-sm font-medium text-muted-foreground">Nama</th>}
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Alasan</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Waktu</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {leaveRequests?.map((request) => (
                  <tr key={request.id} className="border-b border-border/30 hover:bg-muted/30" data-testid={`request-row-${request.id}`}>
                    {canApprove && (
                      <td className="p-4">
                        <p className="font-medium">{getUserName(request.userId)}</p>
                      </td>
                    )}
                    <td className="p-4">
                      <p className="text-sm">{request.reason}</p>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {new Date(request.startTime).toLocaleString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="p-4">{getStatusBadge(request.status)}</td>
                  </tr>
                ))}
                {(!leaveRequests || leaveRequests.length === 0) && (
                  <tr>
                    <td colSpan={canApprove ? 4 : 3} className="p-8 text-center text-muted-foreground">
                      Belum ada riwayat izin
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
