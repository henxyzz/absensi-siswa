import { MapPin, Clock, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ActiveStudent {
  id: string;
  name: string;
  photo?: string;
  status: "inside" | "outside" | "warning";
  location: string;
  lastUpdate: string;
}

interface LiveStatusCardProps {
  title: string;
  students: ActiveStudent[];
  emptyMessage?: string;
}

const statusStyles = {
  inside: {
    badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    label: "Dalam Area",
    dot: "bg-emerald-500",
  },
  outside: {
    badge: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    label: "Izin Keluar",
    dot: "bg-amber-500",
  },
  warning: {
    badge: "bg-rose-500/20 text-rose-400 border-rose-500/30",
    label: "Di Luar Radius",
    dot: "bg-rose-500",
  },
};

export function LiveStatusCard({ title, students, emptyMessage = "Tidak ada data" }: LiveStatusCardProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="glass border-white/5">
      <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm sm:text-base font-medium flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 pulse-live" />
            {title}
          </CardTitle>
          <Badge variant="outline" className="text-[10px] bg-muted/50">
            {students.length} aktif
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[200px] sm:h-[280px]">
          {students.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[160px] sm:h-[200px] text-muted-foreground">
              <MapPin className="w-6 h-6 sm:w-8 sm:h-8 mb-2 opacity-50" />
              <p className="text-xs sm:text-sm">{emptyMessage}</p>
            </div>
          ) : (
            <div className="space-y-1 px-3 sm:px-4 pb-4">
              {students.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors touch-target"
                  data-testid={`live-student-${student.id}`}
                >
                  <div className="relative shrink-0">
                    <Avatar className="w-8 h-8 sm:w-10 sm:h-10 border border-white/10">
                      <AvatarImage src={student.photo} alt={student.name} />
                      <AvatarFallback className="bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 text-[10px] sm:text-xs">
                        {getInitials(student.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border-2 border-card ${statusStyles[student.status].dot}`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-foreground truncate">
                      {student.name}
                    </p>
                    <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{student.location}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 sm:gap-1 shrink-0">
                    <Badge
                      variant="outline"
                      className={`text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0 ${statusStyles[student.status].badge}`}
                    >
                      {student.status === "warning" && (
                        <AlertTriangle className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                      )}
                      <span className="hidden sm:inline">{statusStyles[student.status].label}</span>
                      <span className="sm:hidden">{student.status === "inside" ? "Dalam" : student.status === "outside" ? "Keluar" : "Alert"}</span>
                    </Badge>
                    <div className="flex items-center gap-1 text-[9px] sm:text-[10px] text-muted-foreground">
                      <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      {student.lastUpdate}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
