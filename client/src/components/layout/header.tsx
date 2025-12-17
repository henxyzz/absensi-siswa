import { Bell, Moon, Sun, Volume2, VolumeX, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useTheme } from "@/lib/theme";
import { useSpeech } from "@/hooks/use-speech";
import { useState } from "react";

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { isSpeechEnabled, isSpeaking, toggleSpeech } = useSpeech();
  const [notificationCount] = useState(3);

  return (
    <header className="sticky top-0 z-50 h-14 border-b border-border bg-background/80 backdrop-blur-xl safe-area-top">
      <div className="flex h-full items-center justify-between gap-2 sm:gap-4 px-3 sm:px-4">
        <div className="flex items-center gap-2 sm:gap-4">
          <SidebarTrigger data-testid="button-sidebar-toggle" className="h-10 w-10 touch-target" />
          {title && (
            <h1 className="text-base sm:text-lg font-semibold text-foreground hidden sm:block">
              {title}
            </h1>
          )}
        </div>

        <div className="flex-1 max-w-md hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Cari siswa, guru, atau kelas..."
              className="pl-9 bg-muted/50 border-transparent focus:border-primary/50"
              data-testid="input-search"
            />
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSpeech}
            className={`relative h-10 w-10 touch-target ${isSpeechEnabled ? "text-cyan-400" : "text-muted-foreground"}`}
            data-testid="button-speech-toggle"
          >
            {isSpeechEnabled ? (
              <Volume2 className="w-5 h-5" />
            ) : (
              <VolumeX className="w-5 h-5" />
            )}
            {isSpeaking && (
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
              </span>
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-10 w-10 touch-target"
            data-testid="button-theme-toggle"
          >
            {theme === "dark" ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="relative h-10 w-10 touch-target"
            data-testid="button-notifications"
          >
            <Bell className="w-5 h-5" />
            {notificationCount > 0 && (
              <Badge 
                className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-rose-500 border-rose-500"
              >
                {notificationCount}
              </Badge>
            )}
          </Button>

          <div className="h-6 w-px bg-border mx-1 hidden sm:block" />

          <div className="hidden sm:flex items-center gap-2 text-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-500 relative status-online" />
            <span className="text-muted-foreground">Online</span>
          </div>
        </div>
      </div>
    </header>
  );
}
