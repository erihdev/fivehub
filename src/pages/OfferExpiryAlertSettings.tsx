import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  Coffee, 
  ArrowRight,
  Bell,
  BellRing,
  Volume2,
  VolumeX,
  Clock,
  Save,
  Loader2,
  Settings,
  Mail,
  Calendar,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { supabase } from "@/integrations/supabase/client";

interface ExpiryAlertPreferences {
  enabled: boolean;
  days_before: number;
  push_enabled: boolean;
  sound_enabled: boolean;
}

interface WeeklySummaryPreferences {
  weekly_enabled: boolean;
  weekly_day: number;
  weekly_hour: number;
  timezone: string;
}

const OfferExpiryAlertSettings = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isGranted, requestPermission } = usePushNotifications();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [preferences, setPreferences] = useState<ExpiryAlertPreferences>({
    enabled: true,
    days_before: 3,
    push_enabled: true,
    sound_enabled: true,
  });
  const [weeklyPrefs, setWeeklyPrefs] = useState<WeeklySummaryPreferences>({
    weekly_enabled: false,
    weekly_day: 0,
    weekly_hour: 9,
    timezone: "Asia/Riyadh",
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchPreferences = async () => {
      setIsLoading(true);
      try {
        // Fetch expiry alert preferences
        const { data: expiryData, error: expiryError } = await supabase
          .from("offer_expiry_alert_preferences")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (expiryError) {
          console.error("Error fetching expiry preferences:", expiryError);
        } else if (expiryData) {
          setPreferences({
            enabled: expiryData.enabled,
            days_before: expiryData.days_before,
            push_enabled: expiryData.push_enabled,
            sound_enabled: expiryData.sound_enabled,
          });
        }

        // Fetch weekly summary preferences
        const { data: summaryData, error: summaryError } = await supabase
          .from("favorite_offers_summary_preferences")
          .select("weekly_enabled, weekly_day, weekly_hour, timezone")
          .eq("user_id", user.id)
          .maybeSingle();

        if (summaryError) {
          console.error("Error fetching summary preferences:", summaryError);
        } else if (summaryData) {
          setWeeklyPrefs({
            weekly_enabled: summaryData.weekly_enabled ?? false,
            weekly_day: summaryData.weekly_day ?? 0,
            weekly_hour: summaryData.weekly_hour ?? 9,
            timezone: summaryData.timezone ?? "Asia/Riyadh",
          });
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreferences();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);

    try {
      // Save expiry alert preferences
      const { error: expiryError } = await supabase
        .from("offer_expiry_alert_preferences")
        .upsert({
          user_id: user.id,
          ...preferences,
        }, { onConflict: 'user_id' });

      if (expiryError) {
        console.error("Error saving expiry preferences:", expiryError);
        toast({
          title: "خطأ",
          description: "فشل في حفظ إعدادات التنبيهات",
          variant: "destructive",
        });
        return;
      }

      // Save weekly summary preferences
      const { error: summaryError } = await supabase
        .from("favorite_offers_summary_preferences")
        .upsert({
          user_id: user.id,
          ...weeklyPrefs,
        }, { onConflict: 'user_id' });

      if (summaryError) {
        console.error("Error saving summary preferences:", summaryError);
        toast({
          title: "خطأ",
          description: "فشل في حفظ إعدادات الملخص الأسبوعي",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "تم الحفظ",
        description: "تم حفظ جميع الإعدادات بنجاح",
      });
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!user) return;

    setIsSendingTest(true);

    try {
      const { data, error } = await supabase.functions.invoke("weekly-favorite-offers-summary", {
        body: { test: true, userId: user.id },
      });

      if (error) {
        console.error("Error sending test email:", error);
        toast({
          title: "خطأ",
          description: "فشل في إرسال البريد التجريبي",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "تم الإرسال",
        description: "تم إرسال البريد التجريبي بنجاح",
      });
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleEnablePush = async () => {
    if (!isGranted) {
      const granted = await requestPermission();
      if (granted) {
        setPreferences(prev => ({ ...prev, push_enabled: true }));
      }
    }
  };

  if (authLoading || isLoading) {
    return (
      <main className="min-h-screen bg-background font-arabic flex items-center justify-center" dir="rtl">
        <Loader2 className="w-10 h-10 text-coffee-gold animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background font-arabic" dir="rtl">
      {/* Header */}
      <header className="bg-primary py-6">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center gap-2">
                <Coffee className="w-8 h-8 text-coffee-gold" />
                <span className="text-2xl font-display font-bold text-primary-foreground">دال</span>
              </Link>
            </div>
            <nav className="flex items-center gap-4">
              <Link to="/profile">
                <Button variant="ghost" className="text-primary-foreground hover:text-coffee-gold">
                  الملف الشخصي
                </Button>
              </Link>
              <Link to="/favorite-offers">
                <Button variant="ghost" className="text-primary-foreground hover:text-coffee-gold">
                  العروض المفضلة
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-12">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground">
            الرئيسية
          </Link>
          <ArrowRight className="w-4 h-4 rotate-180" />
          <Link to="/profile" className="hover:text-foreground">
            الملف الشخصي
          </Link>
          <ArrowRight className="w-4 h-4 rotate-180" />
          <span className="text-foreground">إعدادات تنبيهات الانتهاء</span>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          {/* Page Title */}
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 rounded-full bg-coffee-gold/10">
              <Settings className="w-8 h-8 text-coffee-gold" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold">إعدادات تنبيهات الانتهاء</h1>
              <p className="text-muted-foreground">تخصيص تنبيهات انتهاء صلاحية العروض المفضلة</p>
            </div>
          </div>

          {/* Main Settings Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-coffee-gold" />
                إعدادات التنبيهات
              </CardTitle>
              <CardDescription>
                تحكم في كيفية تلقي التنبيهات عند اقتراب انتهاء صلاحية العروض المفضلة
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable/Disable Toggle */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">تفعيل التنبيهات</p>
                    <p className="text-sm text-muted-foreground">تلقي تنبيهات عند اقتراب انتهاء العروض</p>
                  </div>
                </div>
                <Switch
                  checked={preferences.enabled}
                  onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, enabled: checked }))}
                />
              </div>

              {preferences.enabled && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                  {/* Days Before Slider */}
                  <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        عدد أيام التنبيه المسبق
                      </Label>
                      <span className="text-2xl font-bold text-coffee-gold">
                        {preferences.days_before}
                      </span>
                    </div>
                    <Slider
                      value={[preferences.days_before]}
                      onValueChange={([value]) => setPreferences(prev => ({ ...prev, days_before: value }))}
                      min={1}
                      max={14}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>يوم واحد</span>
                      <span>أسبوع</span>
                      <span>أسبوعين</span>
                    </div>
                    <p className="text-sm text-muted-foreground text-center mt-2">
                      ستتلقى تنبيهات قبل {preferences.days_before} {preferences.days_before === 1 ? 'يوم' : 'أيام'} من انتهاء العرض
                    </p>
                  </div>

                  {/* Push Notifications */}
                  <div className="flex items-center justify-between p-4 bg-background rounded-lg border">
                    <div className="flex items-center gap-3">
                      <BellRing className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">إشعارات Push</p>
                        <p className="text-sm text-muted-foreground">تنبيهات المتصفح الفورية</p>
                      </div>
                    </div>
                    {isGranted ? (
                      <Switch
                        checked={preferences.push_enabled}
                        onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, push_enabled: checked }))}
                      />
                    ) : (
                      <Button variant="outline" size="sm" onClick={handleEnablePush}>
                        تفعيل
                      </Button>
                    )}
                  </div>

                  {!isGranted && (
                    <p className="text-xs text-muted-foreground text-center">
                      يجب تفعيل إشعارات المتصفح لاستخدام إشعارات Push
                    </p>
                  )}

                  {/* Sound Notifications */}
                  <div className="flex items-center justify-between p-4 bg-background rounded-lg border">
                    <div className="flex items-center gap-3">
                      {preferences.sound_enabled ? (
                        <Volume2 className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <VolumeX className="w-5 h-5 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium">صوت التنبيه</p>
                        <p className="text-sm text-muted-foreground">تشغيل صوت عند ظهور التنبيه</p>
                      </div>
                    </div>
                    <Switch
                      checked={preferences.sound_enabled}
                      onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, sound_enabled: checked }))}
                    />
                  </div>
                </div>
              )}

              {/* Save Button */}
              <Button
                variant="coffee"
                className="w-full"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 ml-2" />
                    حفظ الإعدادات
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Weekly Email Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-coffee-gold" />
                الملخص الأسبوعي بالبريد الإلكتروني
              </CardTitle>
              <CardDescription>
                استلم ملخص أسبوعي شامل للعروض المفضلة لديك عبر البريد الإلكتروني
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable/Disable Toggle */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">تفعيل الملخص الأسبوعي</p>
                    <p className="text-sm text-muted-foreground">استلام بريد أسبوعي بملخص العروض</p>
                  </div>
                </div>
                <Switch
                  checked={weeklyPrefs.weekly_enabled}
                  onCheckedChange={(checked) => setWeeklyPrefs(prev => ({ ...prev, weekly_enabled: checked }))}
                />
              </div>

              {weeklyPrefs.weekly_enabled && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                  {/* Day Selection */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        يوم الإرسال
                      </Label>
                      <Select
                        value={weeklyPrefs.weekly_day.toString()}
                        onValueChange={(value) => setWeeklyPrefs(prev => ({ ...prev, weekly_day: parseInt(value) }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">الأحد</SelectItem>
                          <SelectItem value="1">الاثنين</SelectItem>
                          <SelectItem value="2">الثلاثاء</SelectItem>
                          <SelectItem value="3">الأربعاء</SelectItem>
                          <SelectItem value="4">الخميس</SelectItem>
                          <SelectItem value="5">الجمعة</SelectItem>
                          <SelectItem value="6">السبت</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        ساعة الإرسال
                      </Label>
                      <Select
                        value={weeklyPrefs.weekly_hour.toString()}
                        onValueChange={(value) => setWeeklyPrefs(prev => ({ ...prev, weekly_hour: parseInt(value) }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }, (_, i) => (
                            <SelectItem key={i} value={i.toString()}>
                              {i.toString().padStart(2, "0")}:00
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Timezone Info */}
                  <p className="text-xs text-muted-foreground text-center">
                    التوقيت: {weeklyPrefs.timezone} (توقيت السعودية)
                  </p>

                  {/* Test Email Button */}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleSendTestEmail}
                    disabled={isSendingTest}
                  >
                    {isSendingTest ? (
                      <>
                        <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                        جاري الإرسال...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 ml-2" />
                        إرسال بريد تجريبي
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <Clock className="w-8 h-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  يتم فحص العروض المفضلة كل ساعة للتحقق من اقتراب انتهاء صلاحيتها
                </p>
                <p className="text-xs text-muted-foreground">
                  لن تتلقى تنبيهات متكررة لنفس العرض
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
};

export default OfferExpiryAlertSettings;
