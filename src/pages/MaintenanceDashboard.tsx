import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Wrench, MessageSquare, Settings, LogOut, Calendar, Users, Star, Bell, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import MaintenanceRequests from "@/components/maintenance/MaintenanceRequests";
import SubscriptionStatusBanner from "@/components/SubscriptionStatusBanner";

const MaintenanceDashboard = () => {
  const { user, isLoading: authLoading, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [companyName, setCompanyName] = useState<string>("");
  const [maintenanceType, setMaintenanceType] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

      try {
        const { data: userRole, error } = await supabase
          .from("user_roles")
          .select("company_name, maintenance_type, role, status")
          .eq("user_id", user.id)
          .single();

        if (error) throw error;

        if (userRole) {
          if (userRole.role !== "maintenance" || userRole.status !== "approved") {
            navigate("/");
            return;
          }
          setCompanyName(userRole.company_name || "");
          setMaintenanceType(userRole.maintenance_type || []);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [user, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getMaintenanceTypeLabel = (type: string) => {
    switch (type) {
      case "roaster":
        return "صيانة محامص";
      case "cafe":
        return "صيانة مقاهي";
      default:
        return type;
    }
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Wrench className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{companyName || "لوحة الصيانة"}</h1>
              <div className="flex gap-2 mt-1">
                {maintenanceType.map((type) => (
                  <Badge key={type} variant="secondary" className="text-xs">
                    {getMaintenanceTypeLabel(type)}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Subscription Status Banner */}
        <SubscriptionStatusBanner />

        <Tabs defaultValue="requests" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-lg">
            <TabsTrigger value="requests" className="flex items-center gap-1">
              <Wrench className="w-4 h-4" />
              طلبات الصيانة
            </TabsTrigger>
            <TabsTrigger value="clients" className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              العملاء
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-1">
              <FileText className="w-4 h-4" />
              التقارير
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requests">
            <MaintenanceRequests />
          </TabsContent>

          <TabsContent value="clients">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* العملاء */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    العملاء
                  </CardTitle>
                  <CardDescription>المحامص والمقاهي المسجلة</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">0</div>
                  <p className="text-sm text-muted-foreground">عميل نشط</p>
                </CardContent>
              </Card>

              {/* التقييمات */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-primary" />
                    التقييمات
                  </CardTitle>
                  <CardDescription>تقييمات العملاء</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">-</div>
                  <p className="text-sm text-muted-foreground">متوسط التقييم</p>
                </CardContent>
              </Card>

              {/* الرسائل */}
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/messages")}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    الرسائل
                  </CardTitle>
                  <CardDescription>التواصل مع العملاء</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    فتح الرسائل
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="reports">
            <Card className="py-12 text-center">
              <CardContent>
                <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">تقارير الصيانة</h3>
                <p className="text-muted-foreground">
                  ستظهر هنا جميع تقارير الصيانة المكتملة
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default MaintenanceDashboard;
