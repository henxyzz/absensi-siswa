import { type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  glowColor?: "cyan" | "emerald" | "amber" | "rose";
  className?: string;
}

const glowStyles = {
  cyan: "neon-glow-cyan",
  emerald: "neon-glow-emerald",
  amber: "neon-glow-amber",
  rose: "neon-glow-rose",
};

const iconBgStyles = {
  cyan: "from-cyan-500/20 to-cyan-600/20 text-cyan-400",
  emerald: "from-emerald-500/20 to-emerald-600/20 text-emerald-400",
  amber: "from-amber-500/20 to-amber-600/20 text-amber-400",
  rose: "from-rose-500/20 to-rose-600/20 text-rose-400",
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  glowColor = "cyan",
  className,
}: StatCardProps) {
  return (
    <Card 
      className={cn(
        "glass border-white/5 hover:border-white/10 transition-all duration-300",
        className
      )}
    >
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-2 sm:gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
              {title}
            </p>
            <p className="mt-1 sm:mt-2 text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              {value}
            </p>
            {subtitle && (
              <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-muted-foreground hidden sm:block">
                {subtitle}
              </p>
            )}
            {trend && (
              <div className="mt-1 sm:mt-2 flex items-center gap-1">
                <span
                  className={cn(
                    "text-xs sm:text-sm font-medium",
                    trend.isPositive ? "text-emerald-400" : "text-rose-400"
                  )}
                >
                  {trend.isPositive ? "+" : "-"}{Math.abs(trend.value)}%
                </span>
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  dari kemarin
                </span>
              </div>
            )}
          </div>
          <div
            className={cn(
              "w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0",
              iconBgStyles[glowColor],
              glowStyles[glowColor]
            )}
          >
            <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
