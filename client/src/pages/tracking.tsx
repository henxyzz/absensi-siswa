import { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, AlertTriangle, Clock, User, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { type LeaveRequest, type User as UserType } from "@shared/schema";

interface ActiveLeaveWithUser extends LeaveRequest {
  user: Partial<UserType> | null;
  latestLocation: { latitude: number; longitude: number; timestamp?: string } | null;
}

export default function TrackingPage() {
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  const { data: activeLeaves, isLoading, refetch } = useQuery<ActiveLeaveWithUser[]>({
    queryKey: ["/api/leave-requests/active"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getTimeSince = (date: string | Date) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Baru saja";
    if (diffMins < 60) return `${diffMins} menit lalu`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours} jam lalu`;
  };

  const selectedLeave = activeLeaves?.find((l) => l.id === selectedStudent);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MapPin className="w-6 h-6 text-cyan-400" />
            Pelacakan GPS Real-time
          </h1>
          <p className="text-muted-foreground">
            Pantau lokasi siswa yang sedang izin keluar
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} data-testid="button-refresh-tracking">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Area */}
        <div className="lg:col-span-2">
          <Card className="glass border-white/5 h-[500px]">
            <CardContent className="p-0 h-full">
              <div
                ref={mapRef}
                className="w-full h-full rounded-lg bg-muted/30 flex flex-col items-center justify-center relative overflow-hidden"
              >
                {/* Simplified map representation */}
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-emerald-500/5" />
                
                {!activeLeaves || activeLeaves.length === 0 ? (
                  <div className="text-center z-10">
                    <MapPin className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-muted-foreground">Tidak ada siswa yang sedang dilacak</p>
                  </div>
                ) : (
                  <>
                    {/* Grid lines for visual */}
                    <div className="absolute inset-0 grid grid-cols-8 grid-rows-8 opacity-10">
                      {[...Array(64)].map((_, i) => (
                        <div key={i} className="border border-foreground/20" />
                      ))}
                    </div>
                    
                    {/* Student markers */}
                    {activeLeaves.map((leave, index) => {
                      const isSelected = selectedStudent === leave.id;
                      const isOutOfRadius = leave.isOutOfRadius;
                      
                      // Position markers in a circular pattern for demo
                      const angle = (index / activeLeaves.length) * 2 * Math.PI;
                      const radius = 30;
                      const x = 50 + radius * Math.cos(angle);
                      const y = 50 + radius * Math.sin(angle);
                      
                      return (
                        <button
                          key={leave.id}
                          onClick={() => setSelectedStudent(leave.id)}
                          className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${
                            isSelected ? "z-20 scale-125" : "z-10"
                          }`}
                          style={{ left: `${x}%`, top: `${y}%` }}
                          data-testid={`marker-${leave.id}`}
                        >
                          <div
                            className={`relative w-12 h-12 rounded-full border-2 ${
                              isOutOfRadius
                                ? "border-rose-500 neon-glow-rose"
                                : "border-cyan-500 neon-glow-cyan"
                            } ${isSelected ? "ring-4 ring-white/20" : ""}`}
                          >
                            <Avatar className="w-full h-full">
                              <AvatarImage src={leave.user?.profilePhoto || undefined} />
                              <AvatarFallback className="bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 text-xs">
                                {leave.user?.fullName ? getInitials(leave.user.fullName) : "?"}
                              </AvatarFallback>
                            </Avatar>
                            {isOutOfRadius && (
                              <div className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center pulse-live">
                                <AlertTriangle className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}

                    {/* School center marker */}
                    <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
                      <div className="w-4 h-4 bg-emerald-500 rounded-full relative">
                        <div className="absolute inset-0 bg-emerald-500/50 rounded-full animate-ping" />
                      </div>
                    </div>

                    {/* Radius circle */}
                    <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 border-2 border-dashed border-emerald-500/30 rounded-full" />
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Student List */}
        <Card className="glass border-white/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <User className="w-4 h-4 text-cyan-400" />
              Siswa Aktif
              <Badge variant="outline" className="ml-auto">
                {activeLeaves?.length || 0}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[420px]">
              {isLoading ? (
                <div className="p-4 space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-20 bg-muted/30 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : !activeLeaves || activeLeaves.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Tidak ada siswa yang sedang dilacak</p>
                </div>
              ) : (
                <div className="p-4 space-y-2">
                  {activeLeaves.map((leave) => (
                    <button
                      key={leave.id}
                      onClick={() => setSelectedStudent(leave.id)}
                      className={`w-full p-3 rounded-lg text-left transition-colors ${
                        selectedStudent === leave.id
                          ? "bg-cyan-500/10 border border-cyan-500/30"
                          : "bg-muted/30 hover:bg-muted/50"
                      }`}
                      data-testid={`student-item-${leave.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative">
                          <Avatar className="w-10 h-10 border border-white/10">
                            <AvatarImage src={leave.user?.profilePhoto || undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 text-xs">
                              {leave.user?.fullName ? getInitials(leave.user.fullName) : "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div
                            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${
                              leave.isOutOfRadius ? "bg-rose-500" : "bg-emerald-500"
                            }`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {leave.user?.fullName || "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {leave.reason}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {leave.isOutOfRadius ? (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 bg-rose-500/20 text-rose-400 border-rose-500/30"
                              >
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Di Luar Radius
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                              >
                                Dalam Area
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {getTimeSince(leave.startTime)}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Selected Student Details */}
      {selectedLeave && (
        <Card className="glass border-white/5 animate-fade-in">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Detail Izin Keluar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Nama Siswa</p>
                <p className="font-medium">{selectedLeave.user?.fullName || "Unknown"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Alasan</p>
                <p className="font-medium">{selectedLeave.reason}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Waktu Keluar</p>
                <p className="font-medium">
                  {new Date(selectedLeave.startTime).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estimasi Kembali</p>
                <p className="font-medium">
                  {selectedLeave.expectedReturnTime
                    ? new Date(selectedLeave.expectedReturnTime).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "-"}
                </p>
              </div>
            </div>
            {selectedLeave.latestLocation && (
              <div className="mt-4 p-3 rounded-lg bg-muted/30">
                <p className="text-sm text-muted-foreground mb-1">Lokasi Terakhir</p>
                <p className="font-mono text-sm">
                  {selectedLeave.latestLocation.latitude.toFixed(6)}, {selectedLeave.latestLocation.longitude.toFixed(6)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
