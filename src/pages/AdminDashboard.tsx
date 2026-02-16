import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Coffee,
  Shield,
  Users,
  Building2,
  Flame,
  CheckCircle,
  Clock,
  Loader2,
  Check,
  X,
  DollarSign,
  BarChart3,
  TrendingUp,
  Gavel,
  Sparkles,
  FileText,
  RefreshCw,
  ShoppingCart,
  ChevronDown,
  ChevronUp,
  Truck,
  Printer,
  MessageSquare,
  AlertTriangle,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import { useCommissionNotifications } from "@/hooks/useCommissionNotifications";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import PlatformStats from "@/components/admin/PlatformStats";
import ActivityLog from "@/components/admin/ActivityLog";
import CommissionStats from "@/components/admin/CommissionStats";
import LiveSessionsManager from "@/components/admin/LiveSessionsManager";
import fivehubLogo from "@/assets/fivehub-logo-official.png";

interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'supplier' | 'roaster';
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  company_name: string | null;
  company_phone: string | null;
  company_email: string | null;
  commercial_register: string | null;
  city: string | null;
  created_at: string;
  profile?: {
    full_name: string | null;
  };
}

const AdminDashboard = () => {
  const { user, isLoading: authLoading, signOut } = useAuth();
  const { language, t, dir } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Enable admin notifications for new registrations and commissions
  useAdminNotifications();
  useCommissionNotifications();
  
  const [users, setUsers] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [roastersExpanded, setRoastersExpanded] = useState(false);
  const [suppliersExpanded, setSuppliersExpanded] = useState(false);
  const [commissionsExpanded, setCommissionsExpanded] = useState(false);
  const [approvedExpanded, setApprovedExpanded] = useState(false);
  const [pendingExpanded, setPendingExpanded] = useState(false);
  const [financialExpanded, setFinancialExpanded] = useState<string | false>(false);
  

  const isRtl = dir === 'rtl';

  // Check if user is admin
  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }
      
      try {
        const { data, error } = await supabase.rpc('is_verified_admin', {
          _user_id: user.id
        });
        
        if (error) {
          console.error('Error checking admin status:', error);
          setIsAdmin(false);
          return;
        }
        
        setIsAdmin(data === true);
      } catch (error) {
        console.error('Error checking admin:', error);
        setIsAdmin(false);
      }
    };
    
    if (!authLoading) {
      checkAdminRole();
    }
  }, [user, authLoading]);

  // Admin login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        toast({
          title: language === 'ar' ? 'خطأ' : 'Error',
          description: language === 'ar' ? 'بيانات الدخول غير صحيحة' : 'Invalid credentials',
          variant: "destructive",
        });
        setLoginLoading(false);
        return;
      }

      // Check if user is admin
      const { data: adminCheck } = await supabase.rpc("is_verified_admin", {
        _user_id: authData.user.id,
      });

      if (!adminCheck) {
        await supabase.auth.signOut();
        toast({
          title: language === 'ar' ? 'غير مصرح' : 'Unauthorized',
          description: language === 'ar' ? 'غير مصرح لك بالدخول' : 'You are not authorized',
          variant: "destructive",
        });
        setLoginLoading(false);
        return;
      }

      toast({
        title: language === 'ar' ? 'مرحباً' : 'Welcome',
        description: language === 'ar' ? 'مرحباً بك في لوحة التحكم' : 'Welcome to admin dashboard',
      });
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'حدث خطأ أثناء تسجيل الدخول' : 'Login error occurred',
        variant: "destructive",
      });
    } finally {
      setLoginLoading(false);
    }
  };

  useEffect(() => {
    if (!user || isAdmin !== true) return;
    
    const fetchUsers = async () => {
      setIsLoading(true);
      try {
        // Use user_roles directly to show full data
        const { data, error } = await supabase
          .from('user_roles')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        // Transform data
        const transformedData = (data || []).map(item => ({
          ...item,
          profile: null
        }));
        
        setUsers(transformedData as UserRole[]);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();

    // Subscribe to changes
    const channel = supabase
      .channel('admin-users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_roles' }, () => {
        fetchUsers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isAdmin]);

  const handleApprove = async (roleId: string, userId: string) => {
    setProcessingId(roleId);
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ 
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', roleId);

      if (error) throw error;

      toast({
        title: language === 'ar' ? 'تمت الموافقة' : 'Approved',
        description: language === 'ar' ? 'تم تفعيل الحساب بنجاح' : 'Account activated successfully',
      });
    } catch (error) {
      console.error('Error approving:', error);
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل في تفعيل الحساب' : 'Failed to activate account',
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (roleId: string) => {
    setProcessingId(roleId);
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ 
          status: 'rejected',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', roleId);

      if (error) throw error;

      toast({
        title: language === 'ar' ? 'تم الرفض' : 'Rejected',
        description: language === 'ar' ? 'تم رفض الطلب' : 'Request rejected',
      });
    } catch (error) {
      console.error('Error rejecting:', error);
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل في رفض الطلب' : 'Failed to reject request',
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const pendingUsers = users.filter(u => u.status === 'pending');
  const approvedUsers = users.filter(u => u.status === 'approved');
  const suppliers = users.filter(u => u.role === 'supplier' && u.status === 'approved');
  const roasters = users.filter(u => u.role === 'roaster' && u.status === 'approved');

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'supplier': return Building2;
      case 'roaster': return Flame;
      case 'admin': return Shield;
      default: return Users;
    }
  };

  const getRoleName = (role: string) => {
    if (language === 'ar') {
      switch (role) {
        case 'supplier': return 'مورد';
        case 'roaster': return 'محمصة';
        case 'admin': return 'مدير';
        default: return role;
      }
    }
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500">{language === 'ar' ? 'قيد المراجعة' : 'Pending'}</Badge>;
      case 'approved':
        return <Badge className="bg-green-500">{language === 'ar' ? 'مفعّل' : 'Approved'}</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500">{language === 'ar' ? 'مرفوض' : 'Rejected'}</Badge>;
      case 'suspended':
        return <Badge className="bg-gray-500">{language === 'ar' ? 'موقوف' : 'Suspended'}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Show loading only when checking auth
  if (authLoading) {
    return (
      <main className="min-h-screen bg-background font-arabic flex items-center justify-center" dir={dir}>
        <Loader2 className="w-10 h-10 text-coffee-gold animate-spin" />
      </main>
    );
  }

  // Show login form if not logged in or not admin
  if (!user || isAdmin === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4" dir={dir}>
        <Card className="w-full max-w-md border-slate-700 bg-slate-800/50 backdrop-blur-sm">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <img src={fivehubLogo} alt="FiveHub" className="h-16" />
            </div>
            <div className="flex items-center justify-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              <CardTitle className="text-xl text-white">
                {language === 'ar' ? 'لوحة تحكم المدير' : 'Admin Dashboard'}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">
                  {language === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  required
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300">
                  {language === 'ar' ? 'كلمة المرور' : 'Password'}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 pr-10"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                disabled={loginLoading}
                className="w-full bg-primary hover:bg-primary/90"
              >
                {loginLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                ) : (
                  <Shield className="w-4 h-4 ml-2" />
                )}
                {language === 'ar' ? 'دخول' : 'Login'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading while fetching data
  if (isLoading || isAdmin === null) {
    return (
      <main className="min-h-screen bg-background font-arabic flex items-center justify-center" dir={dir}>
        <Loader2 className="w-10 h-10 text-coffee-gold animate-spin" />
      </main>
    );
  }

  // Block access for non-admins (extra safety)
  if (!isAdmin) {
    return null;
  }

  return (
    <main className="min-h-screen bg-background font-arabic overflow-x-hidden" dir={dir}>

      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-12">
        {/* Back Button */}
        <Link to="/admin-landing">
          <Button variant="outline" size="sm" className="gap-2 mb-4 border-primary/30 hover:bg-primary/10 hover:border-primary">
            {isRtl ? <ChevronUp className="w-4 h-4 rotate-90" /> : <ChevronUp className="w-4 h-4 -rotate-90" />}
            {language === 'ar' ? 'العودة للوحة الرئيسية' : 'Back to Main Panel'}
          </Button>
        </Link>
        {/* User Distribution Section - Standalone */}
        <Card className="mb-6 salmani-border overflow-hidden">
          <CardHeader className="bg-gradient-to-l from-primary to-primary/80 text-primary-foreground py-4">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                {language === 'ar' ? 'توزيع المستخدمين' : 'User Distribution'}
              </div>
              <Link to="/staff-management">
                <Button variant="secondary" size="sm" className="gap-2">
                  <Shield className="w-4 h-4" />
                  {language === 'ar' ? 'إدارة الموظفين' : 'Staff Management'}
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div 
                onClick={() => setPendingExpanded(!pendingExpanded)}
                className={`cursor-pointer hover:shadow-lg hover:scale-105 transition-all border-2 rounded-xl p-4 text-center ${pendingExpanded ? 'border-yellow-500 bg-yellow-500/10' : 'border-yellow-500 bg-yellow-500/5'}`}
              >
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-500" />
                </div>
                <p className="text-2xl font-bold text-yellow-600">{pendingUsers.length}</p>
                <p className="text-xs font-medium text-yellow-600 flex items-center justify-center gap-1">
                  {language === 'ar' ? 'الطلبات المعلقة' : 'Pending Requests'}
                  {pendingExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </p>
              </div>

              <div 
                onClick={() => setApprovedExpanded(!approvedExpanded)}
                className={`cursor-pointer hover:shadow-lg hover:scale-105 transition-all border-2 rounded-xl p-4 text-center ${approvedExpanded ? 'border-green-500 bg-green-500/10' : 'border-green-500 bg-green-500/5'}`}
              >
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <p className="text-2xl font-bold text-green-600">{approvedUsers.length}</p>
                <p className="text-xs font-medium text-green-600 flex items-center justify-center gap-1">
                  {language === 'ar' ? 'العملاء المفعلين' : 'Active Clients'}
                  {approvedExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </p>
              </div>

              <div 
                onClick={() => setSuppliersExpanded(!suppliersExpanded)}
                className={`cursor-pointer hover:shadow-lg hover:scale-105 transition-all border-2 rounded-xl p-4 text-center ${suppliersExpanded ? 'border-coffee-gold bg-coffee-gold/10' : 'border-coffee-gold bg-coffee-gold/5'}`}
              >
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-coffee-gold/20 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-coffee-gold" />
                </div>
                <p className="text-2xl font-bold text-coffee-gold">{suppliers.length}</p>
                <p className="text-xs font-medium text-coffee-gold flex items-center justify-center gap-1">
                  {language === 'ar' ? 'موردين' : 'Suppliers'}
                  {suppliersExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </p>
              </div>

              <div 
                onClick={() => setRoastersExpanded(!roastersExpanded)}
                className={`cursor-pointer hover:shadow-lg hover:scale-105 transition-all border-2 rounded-xl p-4 text-center ${roastersExpanded ? 'border-orange-500 bg-orange-500/10' : 'border-orange-500 bg-orange-500/5'}`}
              >
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-orange-500/20 flex items-center justify-center">
                  <Flame className="w-5 h-5 text-orange-500" />
                </div>
                <p className="text-2xl font-bold text-orange-500">{roasters.length}</p>
                <p className="text-xs font-medium text-orange-500 flex items-center justify-center gap-1">
                  {language === 'ar' ? 'محامص' : 'Roasters'}
                  {roastersExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Users Expanded Section */}
        {pendingExpanded && (
          <Card className="mb-6 border-2 border-yellow-500 overflow-hidden animate-fade-in">
            <CardHeader className="bg-gradient-to-l from-yellow-600 to-yellow-400 text-white py-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="w-5 h-5" />
                {language === 'ar' ? 'الطلبات المعلقة' : 'Pending Requests'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {pendingUsers.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  {language === 'ar' ? 'لا توجد طلبات معلقة' : 'No pending requests'}
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-80 overflow-auto">
                  {pendingUsers.map((user) => {
                    const RoleIcon = getRoleIcon(user.role);
                    return (
                      <div 
                        key={user.id} 
                        className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
                            <RoleIcon className="w-4 h-4 text-yellow-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{user.company_name || '---'}</p>
                            <p className="text-xs text-muted-foreground">{getRoleName(user.role)}</p>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          {user.city && <p>📍 {user.city}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <Link to="/pending-users" className="block mt-4">
                <Button variant="outline" className="w-full border-yellow-500 text-yellow-600 hover:bg-yellow-50">
                  {language === 'ar' ? 'عرض جميع الطلبات' : 'View All Requests'}
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Approved Users Expanded Section */}
        {approvedExpanded && (
          <Card className="mb-6 border-2 border-green-500 overflow-hidden animate-fade-in">
            <CardHeader className="bg-gradient-to-l from-green-600 to-green-400 text-white py-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle className="w-5 h-5" />
                {language === 'ar' ? 'العملاء المفعلين' : 'Active Clients'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {approvedUsers.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  {language === 'ar' ? 'لا يوجد عملاء مفعلين' : 'No active clients'}
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-80 overflow-auto">
                  {approvedUsers.map((user) => {
                    const RoleIcon = getRoleIcon(user.role);
                    return (
                      <div 
                        key={user.id} 
                        className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                            <RoleIcon className="w-4 h-4 text-green-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{user.company_name || '---'}</p>
                            <p className="text-xs text-muted-foreground">{getRoleName(user.role)}</p>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          {user.city && <p>📍 {user.city}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <Link to="/approved-users" className="block mt-4">
                <Button variant="outline" className="w-full border-green-500 text-green-600 hover:bg-green-50">
                  {language === 'ar' ? 'عرض جميع العملاء' : 'View All Clients'}
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Suppliers Expanded Section */}
        {suppliersExpanded && (
          <Card className="mb-6 border-2 border-coffee-gold overflow-hidden animate-fade-in">
            <CardHeader className="bg-gradient-to-l from-dal-burnt to-dal-orange text-white py-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="w-5 h-5" />
                {language === 'ar' ? 'إدارة الموردين' : 'Suppliers Management'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                <Link to="/manage-suppliers" className="block">
                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors text-center">
                    <Users className="w-6 h-6 mx-auto mb-2 text-coffee-gold" />
                    <p className="text-xs font-medium">{language === 'ar' ? 'قائمة الموردين' : 'Suppliers List'}</p>
                  </div>
                </Link>
                <Link to="/supplier-performance-report" className="block">
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-colors text-center">
                    <TrendingUp className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                    <p className="text-xs font-medium">{language === 'ar' ? 'أداء الموردين' : 'Performance'}</p>
                  </div>
                </Link>
                <Link to="/supplier-leaderboard" className="block">
                  <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 hover:bg-purple-100 dark:hover:bg-purple-950/50 transition-colors text-center">
                    <BarChart3 className="w-6 h-6 mx-auto mb-2 text-purple-500" />
                    <p className="text-xs font-medium">{language === 'ar' ? 'ترتيب الموردين' : 'Leaderboard'}</p>
                  </div>
                </Link>
                <Link to="/live-cupping-sessions" className="block">
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors text-center">
                    <Coffee className="w-6 h-6 mx-auto mb-2 text-red-500" />
                    <p className="text-xs font-medium">{language === 'ar' ? 'جلسات التحميص' : 'Sessions'}</p>
                  </div>
                </Link>
                <Link to="/active-offers" className="block">
                  <div className="p-3 rounded-lg bg-pink-50 dark:bg-pink-950/30 hover:bg-pink-100 dark:hover:bg-pink-950/50 transition-colors text-center">
                    <Sparkles className="w-6 h-6 mx-auto mb-2 text-pink-500" />
                    <p className="text-xs font-medium">{language === 'ar' ? 'العروض' : 'Offers'}</p>
                  </div>
                </Link>
                <Link to="/harvest-contracts" className="block">
                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors text-center">
                    <FileText className="w-6 h-6 mx-auto mb-2 text-amber-600" />
                    <p className="text-xs font-medium">{language === 'ar' ? 'عقود المحاصيل' : 'Contracts'}</p>
                  </div>
                </Link>
                <Link to="/live-auctions" className="block">
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors text-center">
                    <Gavel className="w-6 h-6 mx-auto mb-2 text-red-500" />
                    <p className="text-xs font-medium">{language === 'ar' ? 'إدارة المزادات' : 'Auctions'}</p>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Roasters Expanded Section */}
        {roastersExpanded && (
          <Card className="mb-6 border-2 border-orange-500 overflow-hidden animate-fade-in">
            <CardHeader className="bg-gradient-to-l from-orange-600 to-orange-400 text-white py-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Flame className="w-5 h-5" />
                {language === 'ar' ? 'إدارة المحامص' : 'Roasters Management'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {/* Roasters Links */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Link to="/manage-roasters" className="block">
                  <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30 hover:bg-orange-100 dark:hover:bg-orange-950/50 transition-colors text-center">
                    <Users className="w-6 h-6 mx-auto mb-2 text-orange-500" />
                    <p className="text-xs font-medium">{language === 'ar' ? 'قائمة المحامص' : 'Roasters List'}</p>
                  </div>
                </Link>
                <Link to="/delayed-shipments-report" className="block">
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors text-center">
                    <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-red-500" />
                    <p className="text-xs font-medium">{language === 'ar' ? 'الشحنات المتأخرة' : 'Delayed'}</p>
                  </div>
                </Link>
                <Link to="/shipping-analytics" className="block">
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-colors text-center">
                    <Truck className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                    <p className="text-xs font-medium">{language === 'ar' ? 'تحليلات الشحن' : 'Analytics'}</p>
                  </div>
                </Link>
                <Link to="/shipping-label" className="block">
                  <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-950/50 transition-colors text-center">
                    <Printer className="w-6 h-6 mx-auto mb-2 text-green-500" />
                    <p className="text-xs font-medium">{language === 'ar' ? 'طباعة البوليصات' : 'Labels'}</p>
                  </div>
                </Link>
                <Link to="/whatsapp-settings" className="block">
                  <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 transition-colors text-center">
                    <MessageSquare className="w-6 h-6 mx-auto mb-2 text-emerald-500" />
                    <p className="text-xs font-medium">{language === 'ar' ? 'واتساب' : 'WhatsApp'}</p>
                  </div>
                </Link>
                <Link to="/resale-contracts" className="block">
                  <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 hover:bg-purple-100 dark:hover:bg-purple-950/50 transition-colors text-center">
                    <FileText className="w-6 h-6 mx-auto mb-2 text-purple-500" />
                    <p className="text-xs font-medium">{language === 'ar' ? 'عقود البيع' : 'Contracts'}</p>
                  </div>
                </Link>
                <Link to="/coffee-resale" className="block">
                  <div className="p-3 rounded-lg bg-pink-50 dark:bg-pink-950/30 hover:bg-pink-100 dark:hover:bg-pink-950/50 transition-colors text-center">
                    <RefreshCw className="w-6 h-6 mx-auto mb-2 text-pink-500" />
                    <p className="text-xs font-medium">{language === 'ar' ? 'موافقة إعادة البيع' : 'Resale Approval'}</p>
                  </div>
                </Link>
              </div>

              {/* Suppliers Section within Roasters */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-bold text-muted-foreground mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  {language === 'ar' ? 'الموردين' : 'Suppliers'}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Link to="/manage-suppliers" className="block">
                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors text-center">
                      <Building2 className="w-6 h-6 mx-auto mb-2 text-amber-600" />
                      <p className="text-xs font-medium">{language === 'ar' ? 'قائمة الموردين' : 'Suppliers List'}</p>
                    </div>
                  </Link>
                  <Link to="/supplier-leaderboard" className="block">
                    <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 hover:bg-yellow-100 dark:hover:bg-yellow-950/50 transition-colors text-center">
                      <BarChart3 className="w-6 h-6 mx-auto mb-2 text-yellow-600" />
                      <p className="text-xs font-medium">{language === 'ar' ? 'ترتيب الموردين' : 'Leaderboard'}</p>
                    </div>
                  </Link>
                  <Link to="/supplier-performance-report" className="block">
                    <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-950/50 transition-colors text-center">
                      <TrendingUp className="w-6 h-6 mx-auto mb-2 text-green-600" />
                      <p className="text-xs font-medium">{language === 'ar' ? 'أداء الموردين' : 'Performance'}</p>
                    </div>
                  </Link>
                  <Link to="/active-offers" className="block">
                    <div className="p-3 rounded-lg bg-teal-50 dark:bg-teal-950/30 hover:bg-teal-100 dark:hover:bg-teal-950/50 transition-colors text-center">
                      <Sparkles className="w-6 h-6 mx-auto mb-2 text-teal-600" />
                      <p className="text-xs font-medium">{language === 'ar' ? 'العروض' : 'Offers'}</p>
                    </div>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Financial Statistics Section */}
        <Card className="mb-6 salmani-border overflow-hidden">
          <CardHeader className="bg-gradient-to-l from-green-700 to-green-500 text-white py-4">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              {language === 'ar' ? 'الإحصائيات المالية' : 'Financial Statistics'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Monthly Orders */}
              <div 
                onClick={() => setFinancialExpanded(financialExpanded === 'orders' ? false : 'orders')}
                className={`cursor-pointer hover:shadow-lg hover:scale-105 transition-all border-2 rounded-xl p-4 text-center ${financialExpanded === 'orders' ? 'border-blue-500 bg-blue-500/10' : 'border-blue-500 bg-blue-500/5'}`}
              >
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-blue-500" />
                </div>
                <p className="text-xs font-medium text-blue-600 flex items-center justify-center gap-1">
                  {language === 'ar' ? 'الطلبات الشهرية' : 'Monthly Orders'}
                  {financialExpanded === 'orders' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </p>
              </div>

              {/* Commission Statistics */}
              <div 
                onClick={() => setFinancialExpanded(financialExpanded === 'commissions' ? false : 'commissions')}
                className={`cursor-pointer hover:shadow-lg hover:scale-105 transition-all border-2 rounded-xl p-4 text-center ${financialExpanded === 'commissions' ? 'border-green-500 bg-green-500/10' : 'border-green-500 bg-green-500/5'}`}
              >
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-green-500/20 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-500" />
                </div>
                <p className="text-xs font-medium text-green-600 flex items-center justify-center gap-1">
                  {language === 'ar' ? 'إحصائيات العمولات' : 'Commission Stats'}
                  {financialExpanded === 'commissions' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Expanded Content */}
        {financialExpanded && (
          <Card className="mb-6 border-2 border-green-500 overflow-hidden animate-fade-in">
            <CardContent className="p-4">
              {financialExpanded === 'orders' && <PlatformStats />}
              {financialExpanded === 'commissions' && <CommissionStats />}
            </CardContent>
          </Card>
        )}

        {/* Commissions Management Links */}
        <Card className="mb-6 salmani-border overflow-hidden">
          <CardHeader className="bg-gradient-to-l from-dal-burnt to-dal-orange text-white py-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="w-5 h-5" />
              {language === 'ar' ? 'إدارة العمولات' : 'Commission Management'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Link to="/commission-management" className="block">
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-950/50 transition-colors text-center">
                  <DollarSign className="w-6 h-6 mx-auto mb-2 text-green-600" />
                  <p className="text-xs font-medium">{language === 'ar' ? 'إدارة العمولات' : 'Manage'}</p>
                </div>
              </Link>
              <Link to="/commission-reports-history" className="block">
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-colors text-center">
                  <FileText className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                  <p className="text-xs font-medium">{language === 'ar' ? 'سجل التقارير' : 'Reports'}</p>
                </div>
              </Link>
              <Link to="/commission-notification-logs" className="block">
                <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 hover:bg-purple-100 dark:hover:bg-purple-950/50 transition-colors text-center">
                  <BarChart3 className="w-6 h-6 mx-auto mb-2 text-purple-500" />
                  <p className="text-xs font-medium">{language === 'ar' ? 'سجل الإشعارات' : 'Logs'}</p>
                </div>
              </Link>
              <Link to="/admin-reports-statistics" className="block">
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors text-center">
                  <TrendingUp className="w-6 h-6 mx-auto mb-2 text-amber-600" />
                  <p className="text-xs font-medium">{language === 'ar' ? 'الإحصائيات' : 'Stats'}</p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Activity Log */}
        <div className="mb-8">
          <ActivityLog />
        </div>

        {/* Live Sessions Manager */}
        <div className="mb-8">
          <LiveSessionsManager />
        </div>


        {/* Exclusive Features Section */}
        <Card className="mb-8 salmani-border overflow-hidden">
          <CardHeader className="bg-gradient-to-l from-dal-burnt to-dal-orange text-white">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              {language === 'ar' ? 'الميزات الحصرية - الأولى عالمياً' : 'World-First Exclusive Features'}
            </CardTitle>
            <CardDescription className="text-white/90">
              {language === 'ar' ? 'إدارة الميزات الثورية في منصة القهوة' : 'Manage revolutionary coffee platform features'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Link to="/live-auctions">
                <div className="p-4 rounded-xl bg-gradient-to-br from-dal-orange/10 to-dal-gold/10 border border-dal-orange/20 hover:dal-shadow transition-all hover:-translate-y-1 cursor-pointer">
                  <Gavel className="w-8 h-8 text-dal-orange mb-3" />
                  <h4 className="font-bold text-foreground">{language === 'ar' ? 'المزادات الحية' : 'Live Auctions'}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{language === 'ar' ? 'إدارة المزادات' : 'Manage auctions'}</p>
                </div>
              </Link>
              <Link to="/blend-creator">
                <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-300/20 hover:dal-shadow transition-all hover:-translate-y-1 cursor-pointer">
                  <Sparkles className="w-8 h-8 text-purple-500 mb-3" />
                  <h4 className="font-bold text-foreground">{language === 'ar' ? 'صانع الخلطات' : 'Blend Creator'}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{language === 'ar' ? 'خلطات بالذكاء الاصطناعي' : 'AI-powered blends'}</p>
                </div>
              </Link>
              <Link to="/harvest-contracts">
                <div className="p-4 rounded-xl bg-gradient-to-br from-dal-teal/10 to-green-500/10 border border-dal-teal/20 hover:dal-shadow transition-all hover:-translate-y-1 cursor-pointer">
                  <FileText className="w-8 h-8 text-dal-teal mb-3" />
                  <h4 className="font-bold text-foreground">{language === 'ar' ? 'عقود المحاصيل' : 'Harvest Contracts'}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{language === 'ar' ? 'حجز المحاصيل مسبقاً' : 'Pre-harvest booking'}</p>
                </div>
              </Link>
              <Link to="/coffee-resale">
                <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border border-amber-300/20 hover:dal-shadow transition-all hover:-translate-y-1 cursor-pointer">
                  <RefreshCw className="w-8 h-8 text-amber-500 mb-3" />
                  <h4 className="font-bold text-foreground">{language === 'ar' ? 'سوق إعادة البيع' : 'Resale Market'}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{language === 'ar' ? 'تداول البن بين المحامص' : 'Roaster-to-roaster trading'}</p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>

      </div>
    </main>
  );
};

export default AdminDashboard;
