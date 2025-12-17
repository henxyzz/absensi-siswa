import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { School, Plus, Edit, Trash2, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { UserRole, type Class, type User } from "@shared/schema";

const classFormSchema = z.object({
  name: z.string().min(2, "Nama kelas wajib diisi"),
  grade: z.string().min(1, "Tingkat wajib diisi"),
});

type ClassFormData = z.infer<typeof classFormSchema>;

export default function ClassesPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteClass, setDeleteClass] = useState<Class | null>(null);
  const [editClass, setEditClass] = useState<Class | null>(null);

  const { data: classes, isLoading } = useQuery<Class[]>({
    queryKey: ["/api/classes"],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const form = useForm<ClassFormData>({
    resolver: zodResolver(classFormSchema),
    defaultValues: {
      name: "",
      grade: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ClassFormData) => {
      return apiRequest("POST", "/api/classes", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
      toast({ title: "Berhasil", description: "Kelas berhasil ditambahkan" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ClassFormData }) => {
      return apiRequest("PATCH", `/api/classes/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
      toast({ title: "Berhasil", description: "Kelas berhasil diperbarui" });
      setEditClass(null);
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/classes/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
      toast({ title: "Berhasil", description: "Kelas berhasil dihapus" });
      setDeleteClass(null);
    },
    onError: (error: Error) => {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: ClassFormData) => {
    if (editClass) {
      updateMutation.mutate({ id: editClass.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getStudentCount = (classId: string) => {
    return users?.filter((u) => u.classId === classId && u.role === UserRole.SISWA).length || 0;
  };

  const getTeacherName = (teacherId: string | null) => {
    if (!teacherId) return null;
    const teacher = users?.find((u) => u.id === teacherId);
    return teacher?.fullName || null;
  };

  const openEditDialog = (classData: Class) => {
    setEditClass(classData);
    form.reset({
      name: classData.name,
      grade: classData.grade,
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditClass(null);
    form.reset({
      name: "",
      grade: "",
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <School className="w-6 h-6 text-cyan-400" />
            Manajemen Kelas
          </h1>
          <p className="text-muted-foreground">
            Kelola data kelas sekolah
          </p>
        </div>

        <Button onClick={openCreateDialog} className="bg-gradient-to-r from-cyan-500 to-emerald-500" data-testid="button-add-class">
          <Plus className="w-4 h-4 mr-2" />
          Tambah Kelas
        </Button>
      </div>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          [...Array(6)].map((_, i) => (
            <Card key={i} className="glass border-white/5">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-6 bg-muted rounded w-1/2" />
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-1/4" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : !classes || classes.length === 0 ? (
          <div className="col-span-full">
            <Card className="glass border-white/5">
              <CardContent className="p-8 text-center">
                <School className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">Belum ada data kelas</p>
              </CardContent>
            </Card>
          </div>
        ) : (
          classes.map((classData) => {
            const studentCount = getStudentCount(classData.id);
            const teacherName = getTeacherName(classData.teacherId);
            
            return (
              <Card key={classData.id} className="glass border-white/5 hover:border-cyan-500/30 transition-colors" data-testid={`class-card-${classData.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg">{classData.name}</CardTitle>
                      <Badge variant="outline" className="mt-1 bg-muted/50">
                        {classData.grade}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEditDialog(classData)}
                        data-testid={`button-edit-${classData.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-rose-400 hover:text-rose-300"
                        onClick={() => setDeleteClass(classData)}
                        data-testid={`button-delete-${classData.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4 text-cyan-400" />
                      <span className="text-muted-foreground">Jumlah Siswa:</span>
                      <span className="font-medium">{studentCount}</span>
                    </div>
                    {teacherName && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Wali Kelas:</span>
                        <p className="font-medium">{teacherName}</p>
                      </div>
                    )}
                    <div className="pt-2">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min((studentCount / 40) * 100, 100)}%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {studentCount}/40 kapasitas
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="glass-strong">
          <DialogHeader>
            <DialogTitle>{editClass ? "Edit Kelas" : "Tambah Kelas Baru"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Kelas</FormLabel>
                    <FormControl>
                      <Input placeholder="Contoh: XII-IPA-1" className="bg-muted/50" data-testid="input-classname" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="grade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tingkat</FormLabel>
                    <FormControl>
                      <Input placeholder="Contoh: XII" className="bg-muted/50" data-testid="input-grade" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-cyan-500 to-emerald-500"
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-submit-class"
              >
                {(createMutation.isPending || updateMutation.isPending) ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Memproses...
                  </>
                ) : editClass ? (
                  "Simpan Perubahan"
                ) : (
                  "Tambah Kelas"
                )}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteClass} onOpenChange={() => setDeleteClass(null)}>
        <AlertDialogContent className="glass-strong">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Kelas?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus kelas {deleteClass?.name}? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteClass && deleteMutation.mutate(deleteClass.id)}
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
