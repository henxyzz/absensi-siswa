import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Camera, MapPin, CheckCircle, Clock, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useSpeech } from "@/hooks/use-speech";
import { useAuth } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { UserRole, AttendanceStatus, type Attendance, type User } from "@shared/schema";

export default function AttendancePage() {
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const { announce } = useSpeech();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const isStudent = hasRole([UserRole.SISWA]);

  const { data: todayAttendance, isLoading: attendanceLoading } = useQuery<Attendance | null>({
    queryKey: ["/api/attendance/today"],
    enabled: isStudent,
  });

  const { data: allAttendances } = useQuery<Attendance[]>({
    queryKey: ["/api/attendance", { date: new Date().toISOString().split('T')[0] }],
    enabled: !isStudent,
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: !isStudent,
  });

  const checkInMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/attendance/checkin", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      toast({ title: "Berhasil", description: "Absen masuk berhasil dicatat" });
      announce("Absen masuk berhasil dicatat");
      stopCamera();
      setCapturedPhoto(null);
    },
    onError: (error: Error) => {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/attendance/checkout", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      toast({ title: "Berhasil", description: "Absen pulang berhasil dicatat" });
      announce("Absen pulang berhasil dicatat");
      stopCamera();
      setCapturedPhoto(null);
    },
    onError: (error: Error) => {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    },
  });

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (error) {
      toast({
        title: "Gagal mengakses kamera",
        description: "Pastikan izin kamera telah diberikan",
        variant: "destructive",
      });
    }
  }, [toast]);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setIsCameraActive(false);
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const photoData = canvas.toDataURL("image/jpeg", 0.8);
        setCapturedPhoto(photoData);
        stopCamera();
      }
    }
  }, [stopCamera]);

  const getLocation = useCallback(() => {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError("Geolocation tidak didukung browser Anda");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError("Izin lokasi ditolak");
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError("Informasi lokasi tidak tersedia");
            break;
          case error.TIMEOUT:
            setLocationError("Waktu permintaan lokasi habis");
            break;
          default:
            setLocationError("Terjadi kesalahan mendapatkan lokasi");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  const handleCheckIn = async () => {
    if (!capturedPhoto || !location) {
      toast({
        title: "Data tidak lengkap",
        description: "Silakan ambil foto dan aktifkan lokasi",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    
    // Convert base64 to blob
    const response = await fetch(capturedPhoto);
    const blob = await response.blob();
    formData.append("photo", blob, "selfie.jpg");
    formData.append("latitude", location.lat.toString());
    formData.append("longitude", location.lng.toString());

    checkInMutation.mutate(formData);
  };

  const handleCheckOut = async () => {
    if (!capturedPhoto) {
      toast({
        title: "Foto diperlukan",
        description: "Silakan ambil foto selfie",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    const response = await fetch(capturedPhoto);
    const blob = await response.blob();
    formData.append("photo", blob, "selfie.jpg");
    if (location) {
      formData.append("latitude", location.lat.toString());
      formData.append("longitude", location.lng.toString());
    }

    checkOutMutation.mutate(formData);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      [AttendanceStatus.HADIR]: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      [AttendanceStatus.IZIN]: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
      [AttendanceStatus.SAKIT]: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      [AttendanceStatus.ALPHA]: "bg-rose-500/20 text-rose-400 border-rose-500/30",
    };
    const labels = {
      [AttendanceStatus.HADIR]: "Hadir",
      [AttendanceStatus.IZIN]: "Izin",
      [AttendanceStatus.SAKIT]: "Sakit",
      [AttendanceStatus.ALPHA]: "Alpha",
    };
    return (
      <Badge variant="outline" className={styles[status as keyof typeof styles] || ""}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  if (isStudent) {
    const hasCheckedIn = !!todayAttendance?.checkInTime;
    const hasCheckedOut = !!todayAttendance?.checkOutTime;

    return (
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 animate-fade-in safe-area-x">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Absensi</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {new Date().toLocaleDateString("id-ID", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        {/* Status Card */}
        <Card className="glass border-white/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  hasCheckedIn ? "bg-emerald-500/20" : "bg-muted"
                }`}>
                  {hasCheckedIn ? (
                    <CheckCircle className="w-6 h-6 text-emerald-400" />
                  ) : (
                    <Clock className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="font-medium">Status Hari Ini</p>
                  <p className="text-sm text-muted-foreground">
                    {hasCheckedIn
                      ? `Masuk: ${new Date(todayAttendance!.checkInTime!).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`
                      : "Belum absen masuk"}
                    {hasCheckedOut && ` • Pulang: ${new Date(todayAttendance!.checkOutTime!).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`}
                  </p>
                </div>
              </div>
              {todayAttendance && getStatusBadge(todayAttendance.status)}
            </div>
          </CardContent>
        </Card>

        {/* Camera and Location */}
        {(!hasCheckedIn || (hasCheckedIn && !hasCheckedOut)) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Camera Section */}
            <Card className="glass border-white/5">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Camera className="w-4 h-4 text-cyan-400" />
                  Foto Selfie
                </CardTitle>
                <CardDescription>
                  Ambil foto selfie untuk verifikasi kehadiran
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative aspect-video bg-muted rounded-lg overflow-hidden mb-4">
                  {capturedPhoto ? (
                    <img
                      src={capturedPhoto}
                      alt="Captured"
                      className="w-full h-full object-cover"
                    />
                  ) : isCameraActive ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <Camera className="w-12 h-12 mb-2 opacity-50" />
                      <p className="text-sm">Kamera tidak aktif</p>
                    </div>
                  )}
                </div>
                <canvas ref={canvasRef} className="hidden" />
                
                <div className="flex gap-2">
                  {!isCameraActive && !capturedPhoto && (
                    <Button onClick={startCamera} className="flex-1 h-11 sm:h-10 touch-target active-scale" data-testid="button-start-camera">
                      <Camera className="w-4 h-4 mr-2" />
                      Aktifkan Kamera
                    </Button>
                  )}
                  {isCameraActive && (
                    <>
                      <Button onClick={capturePhoto} className="flex-1 h-11 sm:h-10 touch-target active-scale" data-testid="button-capture">
                        Ambil Foto
                      </Button>
                      <Button variant="outline" onClick={stopCamera} className="h-11 sm:h-10 touch-target active-scale">
                        Batal
                      </Button>
                    </>
                  )}
                  {capturedPhoto && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setCapturedPhoto(null);
                          startCamera();
                        }}
                        className="flex-1 h-11 sm:h-10 touch-target active-scale"
                      >
                        Ulangi
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Location Section */}
            <Card className="glass border-white/5">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-cyan-400" />
                  Lokasi GPS
                </CardTitle>
                <CardDescription>
                  Verifikasi lokasi Anda berada dalam area sekolah
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-muted rounded-lg mb-4 flex flex-col items-center justify-center">
                  {location ? (
                    <div className="text-center">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-emerald-400" />
                      </div>
                      <p className="text-sm font-medium text-foreground">Lokasi Terdeteksi</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                      </p>
                    </div>
                  ) : locationError ? (
                    <div className="text-center text-rose-400">
                      <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">{locationError}</p>
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Lokasi belum diaktifkan</p>
                    </div>
                  )}
                </div>

                <Button
                  onClick={getLocation}
                  variant={location ? "outline" : "default"}
                  className="w-full h-11 sm:h-10 touch-target active-scale"
                  data-testid="button-get-location"
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  {location ? "Perbarui Lokasi" : "Aktifkan Lokasi"}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Action Button */}
        {(!hasCheckedIn || (hasCheckedIn && !hasCheckedOut)) && (
          <Card className="glass border-white/5">
            <CardContent className="p-4 sm:p-6">
              <Button
                onClick={hasCheckedIn ? handleCheckOut : handleCheckIn}
                disabled={
                  (!hasCheckedIn && (!capturedPhoto || !location)) ||
                  (hasCheckedIn && !capturedPhoto) ||
                  checkInMutation.isPending ||
                  checkOutMutation.isPending
                }
                className="w-full h-12 sm:h-14 text-base sm:text-lg bg-gradient-to-r from-cyan-500 to-emerald-500 neon-glow-cyan touch-target active-scale"
                data-testid={hasCheckedIn ? "button-checkout" : "button-checkin"}
              >
                {checkInMutation.isPending || checkOutMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Memproses...
                  </>
                ) : hasCheckedIn ? (
                  <>
                    <Clock className="w-5 h-5 mr-2" />
                    Absen Pulang
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Absen Masuk
                  </>
                )}
              </Button>
              {!hasCheckedIn && (!capturedPhoto || !location) && (
                <p className="text-sm text-muted-foreground text-center mt-3">
                  Silakan ambil foto dan aktifkan lokasi terlebih dahulu
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {hasCheckedIn && hasCheckedOut && (
          <Card className="glass border-white/5">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Absensi Lengkap</h3>
              <p className="text-muted-foreground">
                Anda sudah menyelesaikan absensi hari ini
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Admin/Teacher view - Show all attendance
  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 animate-fade-in safe-area-x">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Daftar Kehadiran</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          {new Date().toLocaleDateString("id-ID", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      <Card className="glass border-white/5">
        <CardContent className="p-0">
          <div className="overflow-x-auto -mx-4 sm:mx-0 scrollbar-hide">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">Nama</th>
                  <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">Masuk</th>
                  <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">Pulang</th>
                  <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">Status</th>
                  <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">Lokasi</th>
                </tr>
              </thead>
              <tbody>
                {allAttendances?.map((att) => {
                  const attendanceUser = users?.find((u) => u.id === att.userId);
                  return (
                    <tr key={att.id} className="border-b border-border/30 hover:bg-muted/30" data-testid={`attendance-row-${att.id}`}>
                      <td className="p-3 sm:p-4">
                        <p className="font-medium text-sm sm:text-base whitespace-nowrap">{attendanceUser?.fullName || "Unknown"}</p>
                      </td>
                      <td className="p-3 sm:p-4 text-xs sm:text-sm whitespace-nowrap">
                        {att.checkInTime
                          ? new Date(att.checkInTime).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </td>
                      <td className="p-3 sm:p-4 text-xs sm:text-sm whitespace-nowrap">
                        {att.checkOutTime
                          ? new Date(att.checkOutTime).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </td>
                      <td className="p-3 sm:p-4">{getStatusBadge(att.status)}</td>
                      <td className="p-3 sm:p-4">
                        {att.isLocationValid ? (
                          <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                            Valid
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-rose-500/20 text-rose-400 border-rose-500/30">
                            Invalid
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {(!allAttendances || allAttendances.length === 0) && (
                  <tr>
                    <td colSpan={5} className="p-6 sm:p-8 text-center text-sm sm:text-base text-muted-foreground">
                      Belum ada data kehadiran hari ini
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
