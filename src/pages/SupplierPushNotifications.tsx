import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Coffee,
  ArrowRight,
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Loader2,
  Trash2,
  FileText,
  Award,
  TrendingUp,
  Filter,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { playGlobalNotificationSound, getNotificationSoundEnabled, setNotificationSoundEnabled } from "@/hooks/useNotificationSound";

interface PushNotification {
  id: string;
  supplier_id: string;
  title: string;
  body: string;
  notification_type: string;
  data: unknown;
  is_read: boolean;
  created_at: string;
}

const SupplierPushNotifications = () => {
  const { user, isLoading: authLoading, signOut } = useAuth();
  const { language, t, dir } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<PushNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [markingRead, setMarkingRead] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [soundEnabled, setSoundEnabled] = useState(getNotificationSoundEnabled());

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("supplier_push_notifications")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setNotifications(data || []);
      } catch (error) {
        console.error("Error fetching notifications:", error);
        toast({
          title: language === "ar" ? "خطأ" : "Error",
          description: language === "ar" ? "فشل في جلب الإشعارات" : "Failed to fetch notifications",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotifications();

    // Subscribe to new notifications
    const channel = supabase
      .channel("supplier-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "supplier_push_notifications",
        },
        (payload) => {
          setNotifications((prev) => [payload.new as PushNotification, ...prev]);
          toast({
            title: (payload.new as PushNotification).title,
            description: (payload.new as PushNotification).body,
          });
          // Play notification sound
          playGlobalNotificationSound();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, language, toast]);

  const toggleSound = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    setNotificationSoundEnabled(newValue);
    toast({
      title: newValue 
        ? (language === "ar" ? "تم تفعيل الصوت" : "Sound Enabled")
        : (language === "ar" ? "تم تعطيل الصوت" : "Sound Disabled"),
    });
  };

  // Filter notifications by type
  const filteredNotifications = filterType && filterType !== "all"
    ? notifications.filter((n) => n.notification_type === filterType)
    : notifications;

  const handleMarkAsRead = async (notificationId: string) => {
    setMarkingRead(notificationId);
    try {
      const { error } = await supabase
        .from("supplier_push_notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );

      toast({
        title: language === "ar" ? "تم التحديث" : "Updated",
        description: language === "ar" ? "تم تحديد الإشعار كمقروء" : "Notification marked as read",
      });
    } catch (error) {
      console.error("Error marking as read:", error);
      toast({
        title: language === "ar" ? "خطأ" : "Error",
        variant: "destructive",
      });
    } finally {
      setMarkingRead(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from("supplier_push_notifications")
        .update({ is_read: true })
        .in("id", unreadIds);

      if (error) throw error;

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));

      toast({
        title: language === "ar" ? "تم التحديث" : "Updated",
        description: language === "ar" ? "تم تحديد جميع الإشعارات كمقروءة" : "All notifications marked as read",
      });
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "monthly_report":
        return <FileText className="w-5 h-5 text-primary" />;
      case "badge":
        return <Award className="w-5 h-5 text-amber-500" />;
      case "performance":
        return <TrendingUp className="w-5 h-5 text-green-500" />;
      default:
        return <Bell className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const unreadCount = filteredNotifications.filter((n) => !n.is_read).length;
  const notificationTypes = [...new Set(notifications.map((n) => n.notification_type))];

  if (authLoading || isLoading) {
    return (
      <main className="min-h-screen bg-background font-arabic flex items-center justify-center" dir={dir}>
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background font-arabic" dir={dir}>
      {/* Header */}
      <header className="bg-primary py-6">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center gap-2">
                <Coffee className="w-8 h-8 text-primary-foreground/80" />
                <span className="text-2xl font-display font-bold text-primary-foreground">
                  {t("brand.name")}
                </span>
              </Link>
              <Badge className="bg-amber-500">
                {language === "ar" ? "الإشعارات" : "Notifications"}
              </Badge>
            </div>
            <nav className="flex items-center gap-4">
              <LanguageSwitcher />
              <Button variant="ghost" className="text-primary-foreground" onClick={() => signOut()}>
                {t("nav.logout")}
              </Button>
            </nav>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Back link */}
        <Link
          to="/supplier-dashboard"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowRight className="w-4 h-4 rotate-180" />
          {language === "ar" ? "العودة للوحة التحكم" : "Back to Dashboard"}
        </Link>

        {/* Page Title */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Bell className="w-8 h-8 text-primary" />
              {language === "ar" ? "إشعاراتي" : "My Notifications"}
              {unreadCount > 0 && (
                <Badge variant="destructive">{unreadCount}</Badge>
              )}
            </h1>
            <p className="text-muted-foreground mt-2">
              {language === "ar"
                ? "جميع الإشعارات والتنبيهات الخاصة بك"
                : "All your notifications and alerts"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={toggleSound}
              title={soundEnabled ? (language === "ar" ? "تعطيل الصوت" : "Disable Sound") : (language === "ar" ? "تفعيل الصوت" : "Enable Sound")}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>
            {unreadCount > 0 && (
              <Button variant="outline" onClick={handleMarkAllAsRead}>
                <CheckCheck className="w-4 h-4 ml-2" />
                {language === "ar" ? "تحديد الكل كمقروء" : "Mark All as Read"}
              </Button>
            )}
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-3 mb-6">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={language === "ar" ? "جميع الأنواع" : "All Types"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{language === "ar" ? "جميع الأنواع" : "All Types"}</SelectItem>
              <SelectItem value="monthly_report">
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  {language === "ar" ? "تقارير شهرية" : "Monthly Reports"}
                </span>
              </SelectItem>
              <SelectItem value="badge">
                <span className="flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  {language === "ar" ? "شارات" : "Badges"}
                </span>
              </SelectItem>
              <SelectItem value="performance">
                <span className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  {language === "ar" ? "أداء" : "Performance"}
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
          {filterType && filterType !== "all" && (
            <Button variant="ghost" size="sm" onClick={() => setFilterType("all")}>
              {language === "ar" ? "مسح الفلتر" : "Clear Filter"}
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <Bell className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-3xl font-bold">{filteredNotifications.length}</p>
              <p className="text-sm text-muted-foreground">
                {language === "ar" ? "إجمالي الإشعارات" : "Total Notifications"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <BellOff className="w-8 h-8 mx-auto mb-2 text-warning" />
              <p className="text-3xl font-bold">{unreadCount}</p>
              <p className="text-sm text-muted-foreground">
                {language === "ar" ? "غير مقروءة" : "Unread"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Check className="w-8 h-8 mx-auto mb-2 text-success" />
              <p className="text-3xl font-bold">{filteredNotifications.length - unreadCount}</p>
              <p className="text-sm text-muted-foreground">
                {language === "ar" ? "مقروءة" : "Read"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Notifications List */}
        <Card>
          <CardHeader>
            <CardTitle>{language === "ar" ? "قائمة الإشعارات" : "Notifications List"}</CardTitle>
            <CardDescription>
              {language === "ar"
                ? "اضغط على أي إشعار لتحديده كمقروء"
                : "Click on any notification to mark it as read"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Bell className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>{language === "ar" ? "لا توجد إشعارات" : "No notifications"}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 rounded-lg border transition-all ${
                      notification.is_read
                        ? "bg-muted/30 border-border"
                        : "bg-primary/5 border-primary/20 shadow-sm"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-1">{getNotificationIcon(notification.notification_type)}</div>
                        <div className="flex-1">
                          <h3 className={`font-semibold ${!notification.is_read && "text-primary"}`}>
                            {notification.title}
                          </h3>
                          <p className="text-muted-foreground text-sm mt-1">{notification.body}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {format(new Date(notification.created_at), "dd MMM yyyy - HH:mm", {
                              locale: language === "ar" ? ar : undefined,
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!notification.is_read && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleMarkAsRead(notification.id)}
                            disabled={markingRead === notification.id}
                          >
                            {markingRead === notification.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                        {notification.is_read && (
                          <Badge variant="outline" className="text-success border-success/30">
                            <Check className="w-3 h-3 ml-1" />
                            {language === "ar" ? "مقروء" : "Read"}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default SupplierPushNotifications;
