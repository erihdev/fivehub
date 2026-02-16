import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Coffee,
  Building2,
  CheckCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Ban,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";

interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'supplier' | 'roaster' | 'cafe' | 'farm' | 'maintenance' | 'supervisor' | 'support' | 'viewer';
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  company_name: string | null;
  company_phone: string | null;
  company_email: string | null;
  commercial_register: string | null;
  city: string | null;
  created_at: string;
  maintenance_type?: string[] | null;
}

const ManageSuppliers = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, signOut } = useAuth();
  const { language, t, dir } = useLanguage();
  const { toast } = useToast();
  
  const [users, setUsers] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const isRtl = dir === 'rtl';

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
          setIsAdmin(false);
          return;
        }
        
        setIsAdmin(data === true);
      } catch (error) {
        setIsAdmin(false);
      }
    };
    
    if (!authLoading) {
      checkAdminRole();
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
    if (isAdmin === false) {
      toast({
        title: language === 'ar' ? 'غير مصرح' : 'Unauthorized',
        description: language === 'ar' ? 'ليس لديك صلاحية الوصول لهذه الصفحة' : 'You do not have permission to access this page',
        variant: "destructive",
      });
      navigate("/");
    }
  }, [user, authLoading, isAdmin, navigate, language, toast]);

  useEffect(() => {
    if (!user || isAdmin !== true) return;
    
    const fetchSuppliers = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('*')
          .eq('role', 'supplier')
          .eq('status', 'approved')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setUsers(data || []);
      } catch (error) {
        console.error('Error fetching suppliers:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuppliers();

    const channel = supabase
      .channel('manage-suppliers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_roles' }, () => {
        fetchSuppliers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isAdmin]);

  const handleSuspend = async (roleId: string) => {
    setProcessingId(roleId);
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ status: 'suspended' })
        .eq('id', roleId);

      if (error) throw error;

      toast({
        title: language === 'ar' ? 'تم الإيقاف' : 'Suspended',
        description: language === 'ar' ? 'تم إيقاف الحساب بنجاح' : 'Account suspended successfully',
      });
    } catch (error) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل في إيقاف الحساب' : 'Failed to suspend account',
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  if (authLoading || isLoading || isAdmin === null) {
    return (
      <main className="min-h-screen bg-background font-arabic flex items-center justify-center" dir={dir}>
        <Loader2 className="w-10 h-10 text-coffee-gold animate-spin" />
      </main>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <main className="min-h-screen bg-background font-arabic" dir={dir}>
      <header className="bg-primary py-6">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/admin-landing" className="flex items-center gap-2">
                <Coffee className="w-8 h-8 text-coffee-gold" />
                <span className="text-2xl font-display font-bold text-primary-foreground">
                  {t('brand.name')}
                </span>
              </Link>
              <Badge className="bg-coffee-gold">
                {language === 'ar' ? 'إدارة الموردين' : 'Manage Suppliers'}
              </Badge>
            </div>
            <nav className="flex items-center gap-4">
              <Link to="/admin-landing">
                <Button variant="ghost" className="text-primary-foreground flex items-center gap-2">
                  {isRtl ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                  {language === 'ar' ? 'العودة للوحة الرئيسية' : 'Back to Main Panel'}
                </Button>
              </Link>
              <ThemeToggle />
              <LanguageSwitcher />
              <Button variant="ghost" className="text-primary-foreground" onClick={() => signOut()}>
                {t('nav.logout')}
              </Button>
            </nav>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {language === 'ar' ? 'إدارة الموردين' : 'Manage Suppliers'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' 
              ? `${users.length} مورد مفعل` 
              : `${users.length} approved suppliers`}
          </p>
        </div>

        {users.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-xl font-semibold mb-2">
                {language === 'ar' ? 'لا يوجد موردين' : 'No suppliers'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {users.map((userRole) => (
              <Card key={userRole.id} className="hover:dal-shadow transition-all">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-coffee-gold/10 flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-coffee-gold" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">
                          {userRole.company_name || userRole.company_email}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">
                            {language === 'ar' ? 'مورد' : 'Supplier'}
                          </Badge>
                          <Badge className="bg-green-500">
                            {language === 'ar' ? 'مفعّل' : 'Active'}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-4 text-sm text-muted-foreground">
                          {userRole.company_email && (
                            <p>{language === 'ar' ? 'البريد:' : 'Email:'} {userRole.company_email}</p>
                          )}
                          {userRole.city && (
                            <p>{language === 'ar' ? 'المدينة:' : 'City:'} {userRole.city}</p>
                          )}
                          {userRole.company_phone && (
                            <p>{language === 'ar' ? 'الهاتف:' : 'Phone:'} {userRole.company_phone}</p>
                          )}
                          {userRole.commercial_register && (
                            <p>{language === 'ar' ? 'السجل التجاري:' : 'CR:'} {userRole.commercial_register}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/supplier-performance-report`)}
                      >
                        <Eye className="w-4 h-4 ml-1" />
                        {language === 'ar' ? 'الأداء' : 'Performance'}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleSuspend(userRole.id)}
                        disabled={processingId === userRole.id}
                      >
                        {processingId === userRole.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Ban className="w-4 h-4 ml-1" />
                            {language === 'ar' ? 'إيقاف' : 'Suspend'}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

export default ManageSuppliers;
