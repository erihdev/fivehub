import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Bell, BellRing, Save, Clock, Calendar } from "lucide-react";
import { toast } from "sonner";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import PageLoader from "@/components/PageLoader";
import NotificationToneSelector from "@/components/NotificationToneSelector";

interface NotificationPreferences {
  id?: string;
  supplier_id: string;
  goal_reminders_enabled: boolean;
  monthly_report_enabled: boolean;
  reminder_days_before: number;
  preferred_reminder_hour: number;
  timezone: string;
}

const timezones = [
  { value: "Asia/Riyadh", label: "الرياض (GMT+3)" },
  { value: "Asia/Dubai", label: "دبي (GMT+4)" },
  { value: "Asia/Kuwait", label: "الكويت (GMT+3)" },
  { value: "Asia/Bahrain", label: "البحرين (GMT+3)" },
  { value: "Asia/Qatar", label: "قطر (GMT+3)" },
  { value: "Asia/Muscat", label: "مسقط (GMT+4)" },
  { value: "Africa/Cairo", label: "القاهرة (GMT+2)" },
];

const SupplierNotificationSettings = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { language } = useLanguage();
  const { permission, isSupported, requestPermission } = usePushNotifications();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    supplier_id: "",
    goal_reminders_enabled: true,
    monthly_report_enabled: true,
    reminder_days_before: 3,
    preferred_reminder_hour: 9,
    timezone: "Asia/Riyadh",
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchPreferences = async () => {
      if (!user) return;

      try {
        // Get supplier for this user
        const { data: supplier, error: supplierError } = await supabase
          .from("suppliers")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (supplierError) {
          console.error("Error fetching supplier:", supplierError);
          toast.error("حدث خطأ أثناء جلب بيانات المورد");
          setLoading(false);
          return;
        }

        if (!supplier) {
          toast.error("لم يتم العثور على حساب مورد");
          navigate("/supplier-dashboard");
          return;
        }

        setSupplierId(supplier.id);

        // Get existing preferences
        const { data: prefs } = await supabase
          .from("supplier_notification_preferences")
          .select("*")
          .eq("supplier_id", supplier.id)
          .maybeSingle();

        if (prefs) {
          setPreferences(prefs as NotificationPreferences);
        } else {
          setPreferences((prev) => ({ ...prev, supplier_id: supplier.id }));
        }
      } catch (error) {
        console.error("Error fetching preferences:", error);
        toast.error("حدث خطأ غير متوقع");
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
  }, [user, navigate]);

  const handleSave = async () => {
    if (!supplierId) return;

    setSaving(true);
    try {
      const dataToSave = {
        supplier_id: supplierId,
        goal_reminders_enabled: preferences.goal_reminders_enabled,
        monthly_report_enabled: preferences.monthly_report_enabled,
        reminder_days_before: preferences.reminder_days_before,
        preferred_reminder_hour: preferences.preferred_reminder_hour,
        timezone: preferences.timezone,
        updated_at: new Date().toISOString(),
      };

      if (preferences.id) {
        const { error } = await supabase
          .from("supplier_notification_preferences")
          .update(dataToSave)
          .eq("id", preferences.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("supplier_notification_preferences")
          .insert(dataToSave);

        if (error) throw error;
      }

      toast.success("تم حفظ الإعدادات بنجاح");
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast.error("حدث خطأ أثناء حفظ الإعدادات");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/supplier-dashboard")}>
              <ArrowRight className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">إعدادات الإشعارات</h1>
              <p className="text-sm text-muted-foreground">تخصيص وقت وطريقة إرسال الإشعارات</p>
            </div>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-6">
          {/* Push Notifications */}
          {isSupported && (
            <Card className={permission === 'granted' ? 'border-success/30' : 'border-primary/30'}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {permission === 'granted' ? (
                    <BellRing className="h-5 w-5 text-success" />
                  ) : (
                    <Bell className="h-5 w-5 text-primary" />
                  )}
                  {language === 'ar' ? 'إشعارات الطلبات الفورية' : 'Push Order Notifications'}
                </CardTitle>
                <CardDescription>
                  {language === 'ar' 
                    ? 'احصل على تنبيه فوري عند وصول طلب جديد' 
                    : 'Get instant alerts when new orders arrive'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Label className="flex-1">
                      {language === 'ar' ? 'تفعيل الإشعارات الفورية' : 'Enable Push Notifications'}
                    </Label>
                    {permission === 'denied' && (
                      <p className="text-xs text-destructive mt-1">
                        {language === 'ar' 
                          ? 'تم رفض الإذن. يرجى تفعيلها من إعدادات المتصفح' 
                          : 'Permission denied. Please enable in browser settings'}
                      </p>
                    )}
                  </div>
                  {permission === 'granted' ? (
                    <Badge variant="outline" className="text-success border-success/30 bg-success/10">
                      {language === 'ar' ? 'مفعّل' : 'Enabled'}
                    </Badge>
                  ) : (
                    <Button 
                      size="sm" 
                      onClick={requestPermission}
                      disabled={permission === 'denied'}
                      variant={permission === 'denied' ? 'outline' : 'default'}
                    >
                      {permission === 'denied' 
                        ? (language === 'ar' ? 'مرفوض' : 'Denied')
                        : (language === 'ar' ? 'تفعيل' : 'Enable')
                      }
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notification Tone Selector */}
          <NotificationToneSelector />

          {/* Goal Reminders */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                تذكيرات الأهداف
              </CardTitle>
              <CardDescription>
                إشعارات تُرسل قبل انتهاء موعد أهدافك
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <Label htmlFor="goal-reminders" className="flex-1">
                  تفعيل تذكيرات الأهداف
                </Label>
                <Switch
                  id="goal-reminders"
                  checked={preferences.goal_reminders_enabled}
                  onCheckedChange={(checked) =>
                    setPreferences((prev) => ({ ...prev, goal_reminders_enabled: checked }))
                  }
                />
              </div>

              {preferences.goal_reminders_enabled && (
                <>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      إرسال التذكير قبل (أيام)
                    </Label>
                    <Select
                      value={(preferences.reminder_days_before || 3).toString()}
                      onValueChange={(value) =>
                        setPreferences((prev) => ({ ...prev, reminder_days_before: parseInt(value) }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر عدد الأيام" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">يوم واحد</SelectItem>
                        <SelectItem value="2">يومين</SelectItem>
                        <SelectItem value="3">3 أيام</SelectItem>
                        <SelectItem value="5">5 أيام</SelectItem>
                        <SelectItem value="7">أسبوع</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      وقت الإرسال المفضل
                    </Label>
                    <Select
                      value={(preferences.preferred_reminder_hour || 9).toString()}
                      onValueChange={(value) =>
                        setPreferences((prev) => ({ ...prev, preferred_reminder_hour: parseInt(value) }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الوقت" />
                      </SelectTrigger>
                      <SelectContent>
                        {[6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map((hour) => (
                          <SelectItem key={hour} value={hour.toString()}>
                            {hour}:00 {hour < 12 ? "صباحاً" : "مساءً"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Monthly Reports */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                التقارير الشهرية
              </CardTitle>
              <CardDescription>
                تقرير أداء شهري يتضمن ترتيبك ومقارنتك بالموردين الآخرين
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Label htmlFor="monthly-report" className="flex-1">
                  استلام التقرير الشهري
                </Label>
                <Switch
                  id="monthly-report"
                  checked={preferences.monthly_report_enabled}
                  onCheckedChange={(checked) =>
                    setPreferences((prev) => ({ ...prev, monthly_report_enabled: checked }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Timezone */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                المنطقة الزمنية
              </CardTitle>
              <CardDescription>
                حدد منطقتك الزمنية لضبط وقت الإشعارات
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={preferences.timezone || "Asia/Riyadh"}
                onValueChange={(value) =>
                  setPreferences((prev) => ({ ...prev, timezone: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر المنطقة الزمنية" />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Save Button */}
          <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
            <Save className="h-4 w-4 ml-2" />
            {saving ? "جاري الحفظ..." : "حفظ الإعدادات"}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default SupplierNotificationSettings;
