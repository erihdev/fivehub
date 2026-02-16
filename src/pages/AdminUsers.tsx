import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AdminBackButton from "@/components/admin/AdminBackButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { 
  Users, 
  Search, 
  Mail, 
  Phone, 
  Building2, 
  MapPin,
  Loader2,
  Sprout,
  Package,
  Flame,
  Coffee,
  Wrench,
  Shield,
  CheckCircle,
  Clock,
  XCircle
} from "lucide-react";

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  status: string;
  company_name: string | null;
  company_email: string | null;
  company_phone: string | null;
  city: string | null;
  created_at: string;
  auth_email: string | null;
}

const AdminUsers = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    const checkAdminAndFetch = async () => {
      if (!user) {
        if (!authLoading) navigate("/auth");
        return;
      }

      const { data: adminCheck } = await supabase.rpc("is_verified_admin", {
        _user_id: user.id,
      });

      if (!adminCheck) {
        navigate("/");
        return;
      }

      setIsAdmin(true);
      fetchUsers();
    };

    checkAdminAndFetch();
  }, [user, authLoading, navigate]);

  const fetchUsers = async () => {
    setLoading(true);
    // Use the admin-only RPC that includes auth email
    const { data, error } = await supabase.rpc("get_all_users_for_admin");

    if (!error && data) {
      setUsers(data as UserRole[]);
    } else {
      console.error("Error fetching users:", error);
    }
    setLoading(false);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "farm": return <Sprout className="w-4 h-4 text-green-500" />;
      case "supplier": return <Package className="w-4 h-4 text-blue-500" />;
      case "roaster": return <Flame className="w-4 h-4 text-orange-500" />;
      case "cafe": return <Coffee className="w-4 h-4 text-pink-500" />;
      case "maintenance": return <Wrench className="w-4 h-4 text-gray-500" />;
      case "admin": return <Shield className="w-4 h-4 text-purple-500" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  const getRoleName = (role: string) => {
    const names: Record<string, string> = {
      farm: language === "ar" ? "مزرعة" : "Farm",
      supplier: language === "ar" ? "مورد" : "Supplier",
      roaster: language === "ar" ? "محمصة" : "Roaster",
      cafe: language === "ar" ? "مقهى" : "Cafe",
      maintenance: language === "ar" ? "صيانة" : "Maintenance",
      admin: language === "ar" ? "مالك المنصة" : "Platform Owner",
    };
    return names[role] || role;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle className="w-3 h-3 mr-1" />
            {language === "ar" ? "معتمد" : "Approved"}
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            <Clock className="w-3 h-3 mr-1" />
            {language === "ar" ? "قيد المراجعة" : "Pending"}
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            <XCircle className="w-3 h-3 mr-1" />
            {language === "ar" ? "مرفوض" : "Rejected"}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredUsers = users.filter((u) => {
    const emailToSearch = u.auth_email || u.company_email || "";
    const matchesSearch = 
      (u.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (emailToSearch.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.company_phone?.includes(searchTerm) || false) ||
      (u.city?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    const matchesStatus = statusFilter === "all" || u.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background" dir={language === "ar" ? "rtl" : "ltr"}>
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <AdminBackButton />
            <div className="flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-bold">
                {language === "ar" ? "إدارة المستخدمين" : "User Management"}
              </h1>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          {["farm", "supplier", "roaster", "cafe", "maintenance", "admin"].map((role) => {
            const count = users.filter((u) => u.role === role && u.status === "approved").length;
            return (
              <Card key={role} className="text-center">
                <CardContent className="pt-4">
                  <div className="flex justify-center mb-2">{getRoleIcon(role)}</div>
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-xs text-muted-foreground">{getRoleName(role)}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={language === "ar" ? "بحث بالاسم، الإيميل، الهاتف..." : "Search by name, email, phone..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder={language === "ar" ? "الدور" : "Role"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === "ar" ? "الكل" : "All"}</SelectItem>
                  <SelectItem value="farm">{language === "ar" ? "مزرعة" : "Farm"}</SelectItem>
                  <SelectItem value="supplier">{language === "ar" ? "مورد" : "Supplier"}</SelectItem>
                  <SelectItem value="roaster">{language === "ar" ? "محمصة" : "Roaster"}</SelectItem>
                  <SelectItem value="cafe">{language === "ar" ? "مقهى" : "Cafe"}</SelectItem>
                  <SelectItem value="maintenance">{language === "ar" ? "صيانة" : "Maintenance"}</SelectItem>
                  <SelectItem value="admin">{language === "ar" ? "أدمن" : "Admin"}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder={language === "ar" ? "الحالة" : "Status"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === "ar" ? "الكل" : "All"}</SelectItem>
                  <SelectItem value="approved">{language === "ar" ? "معتمد" : "Approved"}</SelectItem>
                  <SelectItem value="pending">{language === "ar" ? "قيد المراجعة" : "Pending"}</SelectItem>
                  <SelectItem value="rejected">{language === "ar" ? "مرفوض" : "Rejected"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {language === "ar" ? `المستخدمين (${filteredUsers.length})` : `Users (${filteredUsers.length})`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === "ar" ? "الدور" : "Role"}</TableHead>
                    <TableHead>{language === "ar" ? "اسم الشركة" : "Company"}</TableHead>
                    <TableHead>{language === "ar" ? "الإيميل" : "Email"}</TableHead>
                    <TableHead>{language === "ar" ? "الهاتف" : "Phone"}</TableHead>
                    <TableHead>{language === "ar" ? "المدينة" : "City"}</TableHead>
                    <TableHead>{language === "ar" ? "الحالة" : "Status"}</TableHead>
                    <TableHead>{language === "ar" ? "تاريخ التسجيل" : "Registered"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getRoleIcon(u.role)}
                          <span>{getRoleName(u.role)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          {u.company_name || "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          {(u.auth_email || u.company_email) ? (
                            <a href={`mailto:${u.auth_email || u.company_email}`} className="text-primary hover:underline">
                              {u.auth_email || u.company_email}
                            </a>
                          ) : "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <a href={`tel:${u.company_phone}`} className="text-primary hover:underline">
                            {u.company_phone || "-"}
                          </a>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          {u.city || "-"}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(u.status)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(u.created_at).toLocaleDateString(language === "ar" ? "ar-SA" : "en-US")}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {language === "ar" ? "لا يوجد مستخدمين" : "No users found"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminUsers;
