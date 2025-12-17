import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AttendanceData {
  day: string;
  hadir: number;
  izin: number;
  sakit: number;
  alpha: number;
}

interface AttendanceChartProps {
  data: AttendanceData[];
  title?: string;
}

export function AttendanceChart({ data, title = "Statistik Kehadiran Mingguan" }: AttendanceChartProps) {
  const maxValue = Math.max(...data.map((d) => d.hadir + d.izin + d.sakit + d.alpha));

  return (
    <Card className="glass border-white/5">
      <CardHeader className="pb-2 px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
          <CardTitle className="text-sm sm:text-base font-medium">{title}</CardTitle>
          <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs flex-wrap">
            <div className="flex items-center gap-1 sm:gap-1.5">
              <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-sm bg-emerald-500" />
              <span className="text-muted-foreground">Hadir</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5">
              <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-sm bg-cyan-500" />
              <span className="text-muted-foreground">Izin</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5">
              <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-sm bg-amber-500" />
              <span className="text-muted-foreground">Sakit</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5">
              <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-sm bg-rose-500" />
              <span className="text-muted-foreground">Alpha</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4 px-4 sm:px-6">
        <div className="flex items-end justify-between gap-1 sm:gap-2 h-36 sm:h-48">
          {data.map((item, index) => {
            const total = item.hadir + item.izin + item.sakit + item.alpha;
            const hadirHeight = (item.hadir / maxValue) * 100;
            const izinHeight = (item.izin / maxValue) * 100;
            const sakitHeight = (item.sakit / maxValue) * 100;
            const alphaHeight = (item.alpha / maxValue) * 100;

            return (
              <div
                key={item.day}
                className="flex-1 flex flex-col items-center gap-1 sm:gap-2"
                data-testid={`chart-bar-${index}`}
              >
                <div className="relative w-full flex flex-col items-center">
                  <div
                    className="w-full max-w-[24px] sm:max-w-[40px] flex flex-col-reverse rounded-t-md overflow-hidden"
                    style={{ height: `${(total / maxValue) * 120}px` }}
                  >
                    <div
                      className="w-full bg-emerald-500 transition-all duration-500"
                      style={{ height: `${hadirHeight}%` }}
                    />
                    <div
                      className="w-full bg-cyan-500 transition-all duration-500"
                      style={{ height: `${izinHeight}%` }}
                    />
                    <div
                      className="w-full bg-amber-500 transition-all duration-500"
                      style={{ height: `${sakitHeight}%` }}
                    />
                    <div
                      className="w-full bg-rose-500 transition-all duration-500"
                      style={{ height: `${alphaHeight}%` }}
                    />
                  </div>
                </div>
                <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                  {item.day}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-border/50 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="text-center">
            <p className="text-lg sm:text-2xl font-bold text-emerald-400">
              {data.reduce((acc, d) => acc + d.hadir, 0)}
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Total Hadir</p>
          </div>
          <div className="text-center">
            <p className="text-lg sm:text-2xl font-bold text-cyan-400">
              {data.reduce((acc, d) => acc + d.izin, 0)}
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Total Izin</p>
          </div>
          <div className="text-center">
            <p className="text-lg sm:text-2xl font-bold text-amber-400">
              {data.reduce((acc, d) => acc + d.sakit, 0)}
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Total Sakit</p>
          </div>
          <div className="text-center">
            <p className="text-lg sm:text-2xl font-bold text-rose-400">
              {data.reduce((acc, d) => acc + d.alpha, 0)}
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Total Alpha</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
