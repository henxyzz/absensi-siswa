import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { GraduationCap, Plus, Search, Edit, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { UserRole, type User, type Class } from "@shared/schema";

const studentFormSchema = z.object({
  username: z.string().min(3, "Username minimal 3 karakter"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  fullName: z.string().min(2, "Nama lengkap wajib diisi"),
  email: z.string().email("Email tidak valid").optional().or(z.literal("")),
  phone: z.string().optional(),
  classId: z.string().optional(),
});

type StudentFormData = z.infer<typeof studentFormSchema>;

export default function StudentsPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [deleteStudent, setDeleteStudent] = useState<User | null>(null);
  const [editStudent, setEditStudent] = useState<User | null>(null);

  const { data: students, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users", { role: UserRole.SISWA }],
  });

  const { data: classes } = useQuery<Class[]>({
    queryKey: ["/api/classes"],
  });

  const form = useForm<StudentFormData>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      username: "",
      password: "",
      fullName: "",
      email: "",
      phone: "",
      classId: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: StudentFormData) => {
      return apiRequest("POST", "/api/users", {
        ...data,
        role: UserRole.SISWA,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Berhasil", description: "Siswa berhasil ditambahkan" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<StudentFormData> }) => {
      return apiRequest("PATCH", `/api/users/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Berhasil", description: "Data siswa berhasil diperbarui" });
      setEditStudent(null);
    },
    onError: (error: Error) => {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/users/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Berhasil", description: "Siswa berhasil dihapus" });
      setDeleteStudent(null);
    },
    onError: (error: Error) => {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: StudentFormData) => {
    if (editStudent) {
      const { password, ...updateData } = data;
      updateMutation.mutate({ id: editStudent.id, data: password ? data : updateData });
    } else {
      createMutation.mutate(data);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getClassName = (classId: string | null) => {
    if (!classId) return "-";
    const classData = classes?.find((c) => c.id === classId);
    return classData?.name || "-";
  };

  const filteredStudents = students?.filter((student) => {
    const matchesSearch = student.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.username.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = !selectedClass || student.classId === selectedClass;
    return matchesSearch && matchesClass;
  });

  const openEditDialog = (student: User) => {
    setEditStudent(student);
    form.reset({
      username: student.username,
      password: "",
      fullName: student.fullName,
      email: student.email || "",
      phone: student.phone || "",
      classId: student.classId || "",
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditStudent(null);
    form.reset({
      username: "",
      password: "",
      fullName: "",
      email: "",
      phone: "",
      classId: "",
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-cyan-400" />
            Data Siswa
          </h1>
          <p className="text-muted-foreground">
            Kelola data siswa sekolah
          </p>
        </div>

        <Button onClick={openCreateDialog} className="bg-gradient-to-r from-cyan-500 to-emerald-500" data-testid="button-add-student">
          <Plus className="w-4 h-4 mr-2" />
          Tambah Siswa
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari siswa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-muted/50"
            data-testid="input-search-students"
          />
        </div>
        <Select value={selectedClass || "all"} onValueChange={(v) => setSelectedClass(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[180px] bg-muted/50" data-testid="select-class-filter">
            <SelectValue placeholder="Semua Kelas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kelas</SelectItem>
            {classes?.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Students Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          [...Array(6)].map((_, i) => (
            <Card key={i} className="glass border-white/5">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-muted" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredStudents?.length === 0 ? (
          <div className="col-span-full">
            <Card className="glass border-white/5">
              <CardContent className="p-8 text-center">
                <GraduationCap className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">Tidak ada data siswa</p>
              </CardContent>
            </Card>
          </div>
        ) : (
          filteredStudents?.map((student) => (
            <Card key={student.id} className="glass border-white/5 hover:border-cyan-500/30 transition-colors" data-testid={`student-card-${student.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Avatar className="w-12 h-12 border-2 border-cyan-500/30">
                    <AvatarImage src={student.profilePhoto || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 text-cyan-400">
                      {getInitials(student.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{student.fullName}</p>
                    <p className="text-sm text-muted-foreground">@{student.username}</p>
                    <Badge variant="outline" className="mt-2 text-xs bg-muted/50">
                      {getClassName(student.classId)}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEditDialog(student)}
                      data-testid={`button-edit-${student.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-rose-400 hover:text-rose-300"
                      onClick={() => setDeleteStudent(student)}
                      data-testid={`button-delete-${student.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {student.email && (
                  <p className="text-xs text-muted-foreground mt-3 truncate">{student.email}</p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="glass-strong">
          <DialogHeader>
            <DialogTitle>{editStudent ? "Edit Siswa" : "Tambah Siswa Baru"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Lengkap</FormLabel>
                    <FormControl>
                      <Input placeholder="Masukkan nama lengkap" className="bg-muted/50" data-testid="input-fullname" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="Username" className="bg-muted/50" data-testid="input-username" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{editStudent ? "Password Baru (opsional)" : "Password"}</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Password" className="bg-muted/50" data-testid="input-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (Opsional)</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@contoh.com" className="bg-muted/50" data-testid="input-email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="classId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kelas</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="bg-muted/50" data-testid="select-class">
                          <SelectValue placeholder="Pilih kelas" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {classes?.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-cyan-500 to-emerald-500"
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-submit-student"
              >
                {(createMutation.isPending || updateMutation.isPending) ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Memproses...
                  </>
                ) : editStudent ? (
                  "Simpan Perubahan"
                ) : (
                  "Tambah Siswa"
                )}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteStudent} onOpenChange={() => setDeleteStudent(null)}>
        <AlertDialogContent className="glass-strong">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Siswa?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus {deleteStudent?.fullName}? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteStudent && deleteMutation.mutate(deleteStudent.id)}
              className="bg-rose-500 hover:bg-rose-600"
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
