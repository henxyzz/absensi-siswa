import { useState, useEffect } from "react";
import { HelpCircle, X, ChevronRight, Volume2, VolumeX, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";
import { UserRole } from "@shared/schema";
import { useSpeech, type SpeechLanguage } from "@/hooks/use-speech";

interface GuideStep {
  id: string;
  title: string;
  description: string;
  target?: string;
}

interface HelpTopic {
  id: string;
  question: string;
  answer: string;
  roles: string[];
}

const guideSteps: Record<string, GuideStep[]> = {
  siswa: [
    { id: "1", title: "Selamat Datang!", description: "Ini adalah sistem absensi digital sekolah Anda. Mari kita pelajari cara menggunakannya." },
    { id: "2", title: "Dashboard", description: "Di sini Anda bisa melihat ringkasan kehadiran dan informasi penting." },
    { id: "3", title: "Absensi", description: "Klik menu Absensi untuk melakukan absen masuk dan pulang dengan foto selfie." },
    { id: "4", title: "Izin Keluar", description: "Jika perlu keluar sekolah, ajukan izin melalui menu Izin Keluar." },
  ],
  guru: [
    { id: "1", title: "Selamat Datang!", description: "Anda masuk sebagai Guru. Mari pelajari fitur-fitur yang tersedia." },
    { id: "2", title: "Dashboard", description: "Lihat statistik kehadiran siswa dan aktivitas terkini." },
    { id: "3", title: "Pelacakan GPS", description: "Pantau lokasi siswa yang sedang izin keluar secara real-time." },
    { id: "4", title: "Persetujuan Izin", description: "Kelola permintaan izin keluar dari siswa." },
  ],
  admin: [
    { id: "1", title: "Selamat Datang!", description: "Anda memiliki akses admin penuh. Mari pelajari fitur-fitur yang tersedia." },
    { id: "2", title: "Manajemen Pengguna", description: "Kelola data siswa, guru, dan pengguna lainnya." },
    { id: "3", title: "Monitoring", description: "Pantau kehadiran dan lokasi siswa secara real-time." },
    { id: "4", title: "Laporan", description: "Export laporan kehadiran dalam format PDF atau Excel." },
  ],
};

const helpTopics: HelpTopic[] = [
  {
    id: "1",
    question: "Bagaimana cara absen masuk?",
    answer: "Buka menu Absensi, izinkan akses kamera dan lokasi, lalu ambil foto selfie dan klik tombol Absen Masuk.",
    roles: [UserRole.SISWA],
  },
  {
    id: "2",
    question: "Mengapa lokasi saya tidak valid?",
    answer: "Pastikan Anda berada dalam radius sekolah yang ditentukan dan GPS aktif pada perangkat Anda.",
    roles: [UserRole.SISWA, UserRole.GURU],
  },
  {
    id: "3",
    question: "Bagaimana mengajukan izin keluar?",
    answer: "Buka menu Izin Keluar, isi alasan dan estimasi waktu kembali, lalu kirim permintaan untuk disetujui guru/admin.",
    roles: [UserRole.SISWA],
  },
  {
    id: "4",
    question: "Bagaimana menyetujui izin siswa?",
    answer: "Buka menu Izin Keluar, lihat daftar permintaan pending, lalu klik Setujui atau Tolak.",
    roles: [UserRole.GURU, UserRole.ADMIN_SEKOLAH, UserRole.SUPER_ADMIN],
  },
  {
    id: "5",
    question: "Bagaimana memantau lokasi siswa?",
    answer: "Buka menu Pelacakan GPS untuk melihat peta real-time lokasi siswa yang sedang izin keluar.",
    roles: [UserRole.GURU, UserRole.ADMIN_SEKOLAH, UserRole.SUPER_ADMIN],
  },
  {
    id: "6",
    question: "Bagaimana menambah siswa baru?",
    answer: "Buka menu Siswa, klik tombol Tambah Siswa, isi data lengkap, dan simpan.",
    roles: [UserRole.ADMIN_SEKOLAH, UserRole.SUPER_ADMIN],
  },
];

const translations: Record<SpeechLanguage, { title: string; help: string; close: string; speak: string }> = {
  id: { title: "Panduan Cerdas", help: "Bantuan", close: "Tutup", speak: "Suara" },
  en: { title: "Smart Guide", help: "Help", close: "Close", speak: "Voice" },
  zh: { title: "智能向导", help: "帮助", close: "关闭", speak: "语音" },
};

export function SmartGuide() {
  const { user, hasRole } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  
  const { 
    isSpeechEnabled, 
    isSpeaking, 
    language, 
    toggleSpeech, 
    setLanguage, 
    speak, 
    cancel 
  } = useSpeech();

  const t = translations[language];

  useEffect(() => {
    // Check if first login
    if (user?.isFirstLogin) {
      setShowOnboarding(true);
    }
  }, [user?.isFirstLogin]);

  const getRoleGuide = () => {
    if (hasRole([UserRole.SUPER_ADMIN, UserRole.ADMIN_SEKOLAH])) return guideSteps.admin;
    if (hasRole([UserRole.GURU])) return guideSteps.guru;
    return guideSteps.siswa;
  };

  const getFilteredHelpTopics = () => {
    if (!user) return [];
    return helpTopics.filter((topic) => topic.roles.includes(user.role));
  };

  const handleNextStep = () => {
    const steps = getRoleGuide();
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      speak(steps[currentStep + 1].description);
    } else {
      setShowOnboarding(false);
      setCurrentStep(0);
    }
  };

  const handleSkipOnboarding = () => {
    setShowOnboarding(false);
    setCurrentStep(0);
    cancel();
  };

  if (!user) return null;

  const steps = getRoleGuide();
  const filteredTopics = getFilteredHelpTopics();

  return (
    <>
      {/* Onboarding Overlay */}
      {showOnboarding && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md glass-strong animate-scale-in">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                  {currentStep + 1} / {steps.length}
                </Badge>
                <Button variant="ghost" size="sm" onClick={handleSkipOnboarding}>
                  Lewati
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center neon-glow-cyan">
                  <HelpCircle className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{steps[currentStep].title}</h3>
                <p className="text-muted-foreground">{steps[currentStep].description}</p>
              </div>
              
              <div className="flex items-center justify-between gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleSpeech}
                  className={`relative ${isSpeechEnabled ? "text-cyan-400" : "text-muted-foreground"}`}
                >
                  {isSpeechEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  {isSpeaking && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                    </span>
                  )}
                </Button>
                
                <Button
                  onClick={handleNextStep}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-emerald-500"
                >
                  {currentStep === steps.length - 1 ? "Selesai" : "Lanjut"}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>

              <div className="flex justify-center gap-1 mt-4">
                {steps.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === currentStep ? "bg-cyan-400" : "bg-muted"
                    }`}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Floating Help Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-emerald-500 neon-glow-cyan shadow-lg"
        size="icon"
        data-testid="button-smart-guide"
      >
        {isOpen ? <X className="w-6 h-6" /> : <HelpCircle className="w-6 h-6" />}
      </Button>

      {/* Help Panel */}
      {isOpen && (
        <Card className="fixed bottom-24 right-6 z-40 w-80 glass-strong animate-slide-in-right">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base font-medium">{t.title}</CardTitle>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleSpeech}
                  className={`h-8 w-8 relative ${isSpeechEnabled ? "text-cyan-400" : "text-muted-foreground"}`}
                >
                  {isSpeechEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  {isSpeaking && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                    </span>
                  )}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Globe className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setLanguage("id")}>
                      Indonesia
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLanguage("en")}>
                      English
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLanguage("zh")}>
                      中文
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[300px]">
              <div className="p-4 space-y-2">
                {filteredTopics.map((topic) => (
                  <div
                    key={topic.id}
                    className="rounded-lg bg-muted/30 overflow-hidden"
                  >
                    <button
                      onClick={() => {
                        setExpandedTopic(expandedTopic === topic.id ? null : topic.id);
                        if (expandedTopic !== topic.id) {
                          speak(topic.answer);
                        }
                      }}
                      className="w-full p-3 text-left text-sm font-medium text-foreground hover:bg-muted/50 transition-colors flex items-center justify-between gap-2"
                      data-testid={`help-topic-${topic.id}`}
                    >
                      <span>{topic.question}</span>
                      <ChevronRight
                        className={`w-4 h-4 text-muted-foreground transition-transform ${
                          expandedTopic === topic.id ? "rotate-90" : ""
                        }`}
                      />
                    </button>
                    {expandedTopic === topic.id && (
                      <div className="px-3 pb-3 text-sm text-muted-foreground animate-fade-in">
                        {topic.answer}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-border/50">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  setShowOnboarding(true);
                  setCurrentStep(0);
                  setIsOpen(false);
                }}
              >
                Lihat Panduan Lagi
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
