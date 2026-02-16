import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Shield,
  Users,
  UserPlus,
  Loader2,
  Eye,
  EyeOff,
  Trash2,
  Edit,
  Check,
  X,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";

interface StaffMember {
  id: string;
  user_id: string;
  role: string;
  status: string;
  company_name: string | null;
  created_at: string;
  email?: string;
}

interface StaffPermission {
  id: string;
  role: string;
  can_approve_users: boolean;
  can_reject_users: boolean;
  can_manage_orders: boolean;
  can_view_orders: boolean;
  can_manage_suppliers: boolean;
  can_view_suppliers: boolean;
  can_manage_roasters: boolean;
  can_view_roasters: boolean;
  can_manage_commissions: boolean;
  can_view_commissions: boolean;
  can_view_reports: boolean;
  can_manage_settings: boolean;
  can_send_messages: boolean;
  can_view_messages: boolean;
  can_manage_auctions: boolean;
  can_view_auctions: boolean;
}

const StaffManagement = () => {
  const { user, isLoading: authLoading, signOut } = useAuth();
  const { language, dir } = useLanguage();
  const navigate = useNavigate();

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [permissions, setPermissions] = useState<StaffPermission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // New staff form
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<string>("viewer");
  const [showPassword, setShowPassword] = useState(false);
  const [addingStaff, setAddingStaff] = useState(false);

  const isRtl = dir === "rtl";

  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }

      const { data } = await supabase.rpc("is_verified_admin", {
        _user_id: user.id,
      });
      setIsAdmin(data === true);
    };

    if (!authLoading) {
      checkAdminRole();
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/admin");
    }
    if (isAdmin === false) {
      toast.error(language === "ar" ? "غير مصرح" : "Unauthorized");
      navigate("/");
    }
  }, [user, authLoading, isAdmin, navigate, language]);

  useEffect(() => {
    if (!user || isAdmin !== true) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch staff members
        const { data: staffData } = await supabase
          .from("user_roles")
          .select("*")
          .in("role", ["admin", "supervisor", "support", "viewer"])
          .eq("status", "approved")
          .order("created_at", { ascending: false });

        setStaff((staffData as StaffMember[]) || []);

        // Fetch permissions
        const { data: permData } = await supabase
          .from("staff_permissions")
          .select("*");

        setPermissions((permData as StaffPermission[]) || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, isAdmin]);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingStaff(true);

    try {
      // Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newEmail,
        password: newPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/admin`,
          data: {
            full_name: newName,
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // Add role
        const { error: roleError } = await supabase.from("user_roles").insert([{
          user_id: authData.user.id,
          role: newRole as 'supervisor' | 'support' | 'viewer',
          status: 'approved' as const,
          company_name: newName,
        }]);

        if (roleError) throw roleError;

        toast.success(
          language === "ar" ? "تم إضافة الموظف بنجاح" : "Staff added successfully"
        );
        setShowAddDialog(false);
        setNewEmail("");
        setNewPassword("");
        setNewName("");
        setNewRole("viewer");

        // Refresh list
        const { data: staffData } = await supabase
          .from("user_roles")
          .select("*")
          .in("role", ["admin", "supervisor", "support", "viewer"])
          .eq("status", "approved")
          .order("created_at", { ascending: false });

        setStaff((staffData as StaffMember[]) || []);
      }
    } catch (error: any) {
      console.error("Error adding staff:", error);
      toast.error(error.message || (language === "ar" ? "فشل في إضافة الموظف" : "Failed to add staff"));
    } finally {
      setAddingStaff(false);
    }
  };

  const handleDeleteStaff = async (staffId: string, userId: string) => {
    if (!confirm(language === "ar" ? "هل أنت متأكد من حذف هذا الموظف؟" : "Are you sure you want to delete this staff member?")) {
      return;
    }

    setProcessingId(staffId);
    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("id", staffId);

      if (error) throw error;

      setStaff(staff.filter((s) => s.id !== staffId));
      toast.success(language === "ar" ? "تم حذف الموظف" : "Staff deleted");
    } catch (error) {
      console.error("Error deleting staff:", error);
      toast.error(language === "ar" ? "فشل في حذف الموظف" : "Failed to delete staff");
    } finally {
      setProcessingId(null);
    }
  };

  const handleChangeRole = async (staffId: string, newRoleValue: string) => {
    setProcessingId(staffId);
    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRoleValue as 'supervisor' | 'support' | 'viewer' })
        .eq("id", staffId);

      if (error) throw error;

      setStaff(staff.map((s) => (s.id === staffId ? { ...s, role: newRoleValue } : s)));
      toast.success(language === "ar" ? "تم تغيير الدور" : "Role changed");
    } catch (error) {
      console.error("Error changing role:", error);
      toast.error(language === "ar" ? "فشل في تغيير الدور" : "Failed to change role");
    } finally {
      setProcessingId(null);
    }
  };

  const getRoleName = (role: string) => {
    if (language === "ar") {
      switch (role) {
        case "admin": return "مدير عام";
        case "supervisor": return "مشرف";
        case "support": return "دعم فني";
        case "viewer": return "مشاهد";
        default: return role;
      }
    }
    switch (role) {
      case "admin": return "Admin";
      case "supervisor": return "Supervisor";
      case "support": return "Support";
      case "viewer": return "Viewer";
      default: return role;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin": return "bg-red-500";
      case "supervisor": return "bg-blue-500";
      case "support": return "bg-green-500";
      case "viewer": return "bg-gray-500";
      default: return "bg-gray-500";
    }
  };

  const getPermissionForRole = (role: string) => {
    return permissions.find((p) => p.role === role);
  };

  if (authLoading || isLoading || isAdmin === null) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center" dir={dir}>
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </main>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <main className="min-h-screen bg-background font-arabic" dir={dir}>
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to="/admin-landing">
              <Button variant="ghost" size="icon">
                {isRtl ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Users className="w-6 h-6 text-primary" />
                {language === "ar" ? "إدارة الموظفين" : "Staff Management"}
              </h1>
              <p className="text-muted-foreground text-sm">
                {language === "ar" ? "إضافة وإدارة صلاحيات الموظفين" : "Add and manage staff permissions"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitcher />
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="w-4 h-4 ml-2" />
                  {language === "ar" ? "إضافة موظف" : "Add Staff"}
                </Button>
              </DialogTrigger>
              <DialogContent dir={dir}>
                <DialogHeader>
                  <DialogTitle>
                    {language === "ar" ? "إضافة موظف جديد" : "Add New Staff"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddStaff} className="space-y-4">
                  <div className="space-y-2">
                    <Label>{language === "ar" ? "الاسم" : "Name"}</Label>
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder={language === "ar" ? "اسم الموظف" : "Staff name"}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{language === "ar" ? "البريد الإلكتروني" : "Email"}</Label>
                    <Input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="staff@example.com"
                      required
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{language === "ar" ? "كلمة المرور" : "Password"}</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        minLength={6}
                        dir="ltr"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{language === "ar" ? "الدور" : "Role"}</Label>
                    <Select value={newRole} onValueChange={setNewRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="supervisor">{getRoleName("supervisor")}</SelectItem>
                        <SelectItem value="support">{getRoleName("support")}</SelectItem>
                        <SelectItem value="viewer">{getRoleName("viewer")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={addingStaff}>
                      {addingStaff ? (
                        <Loader2 className="w-4 h-4 animate-spin ml-2" />
                      ) : (
                        <UserPlus className="w-4 h-4 ml-2" />
                      )}
                      {language === "ar" ? "إضافة" : "Add"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-3xl font-bold text-primary">{staff.length}</p>
              <p className="text-sm text-muted-foreground">
                {language === "ar" ? "إجمالي الموظفين" : "Total Staff"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-3xl font-bold text-red-500">
                {staff.filter((s) => s.role === "admin").length}
              </p>
              <p className="text-sm text-muted-foreground">{getRoleName("admin")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-3xl font-bold text-blue-500">
                {staff.filter((s) => s.role === "supervisor").length}
              </p>
              <p className="text-sm text-muted-foreground">{getRoleName("supervisor")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-3xl font-bold text-green-500">
                {staff.filter((s) => s.role === "support").length + staff.filter((s) => s.role === "viewer").length}
              </p>
              <p className="text-sm text-muted-foreground">
                {language === "ar" ? "دعم ومشاهدين" : "Support & Viewers"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Staff Table */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{language === "ar" ? "قائمة الموظفين" : "Staff List"}</CardTitle>
          </CardHeader>
          <CardContent>
            {staff.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {language === "ar" ? "لا يوجد موظفين" : "No staff members"}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === "ar" ? "الاسم" : "Name"}</TableHead>
                    <TableHead>{language === "ar" ? "الدور" : "Role"}</TableHead>
                    <TableHead>{language === "ar" ? "تاريخ الإضافة" : "Added"}</TableHead>
                    <TableHead>{language === "ar" ? "إجراءات" : "Actions"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        {member.company_name || "---"}
                      </TableCell>
                      <TableCell>
                        <Badge className={getRoleBadgeColor(member.role)}>
                          {getRoleName(member.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(member.created_at).toLocaleDateString(
                          language === "ar" ? "ar-SA" : "en-US"
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {member.role !== "admin" && (
                            <>
                              <Select
                                value={member.role}
                                onValueChange={(value) => handleChangeRole(member.id, value)}
                                disabled={processingId === member.id}
                              >
                                <SelectTrigger className="w-28">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="supervisor">{getRoleName("supervisor")}</SelectItem>
                                  <SelectItem value="support">{getRoleName("support")}</SelectItem>
                                  <SelectItem value="viewer">{getRoleName("viewer")}</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                variant="destructive"
                                size="icon"
                                onClick={() => handleDeleteStaff(member.id, member.user_id)}
                                disabled={processingId === member.id}
                              >
                                {processingId === member.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </Button>
                            </>
                          )}
                          {member.role === "admin" && (
                            <span className="text-sm text-muted-foreground">
                              {language === "ar" ? "لا يمكن تعديله" : "Cannot modify"}
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Permissions Overview */}
        <Card>
          <CardHeader>
            <CardTitle>{language === "ar" ? "جدول الصلاحيات" : "Permissions Matrix"}</CardTitle>
            <CardDescription>
              {language === "ar" ? "صلاحيات كل دور في النظام" : "Permissions for each role"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === "ar" ? "الصلاحية" : "Permission"}</TableHead>
                    <TableHead className="text-center">{getRoleName("admin")}</TableHead>
                    <TableHead className="text-center">{getRoleName("supervisor")}</TableHead>
                    <TableHead className="text-center">{getRoleName("support")}</TableHead>
                    <TableHead className="text-center">{getRoleName("viewer")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { key: "can_approve_users", label: language === "ar" ? "الموافقة على المستخدمين" : "Approve Users" },
                    { key: "can_manage_orders", label: language === "ar" ? "إدارة الطلبات" : "Manage Orders" },
                    { key: "can_view_orders", label: language === "ar" ? "عرض الطلبات" : "View Orders" },
                    { key: "can_manage_suppliers", label: language === "ar" ? "إدارة الموردين" : "Manage Suppliers" },
                    { key: "can_view_reports", label: language === "ar" ? "عرض التقارير" : "View Reports" },
                    { key: "can_send_messages", label: language === "ar" ? "إرسال الرسائل" : "Send Messages" },
                    { key: "can_view_commissions", label: language === "ar" ? "عرض العمولات" : "View Commissions" },
                    { key: "can_manage_settings", label: language === "ar" ? "إدارة الإعدادات" : "Manage Settings" },
                  ].map((perm) => (
                    <TableRow key={perm.key}>
                      <TableCell>{perm.label}</TableCell>
                      {["admin", "supervisor", "support", "viewer"].map((role) => {
                        const rolePerm = getPermissionForRole(role);
                        const hasPermission = rolePerm?.[perm.key as keyof StaffPermission];
                        return (
                          <TableCell key={role} className="text-center">
                            {hasPermission ? (
                              <Check className="w-5 h-5 text-green-500 mx-auto" />
                            ) : (
                              <X className="w-5 h-5 text-red-500 mx-auto" />
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default StaffManagement;
