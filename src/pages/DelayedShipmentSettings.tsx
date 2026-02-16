import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Settings, Bell, Mail, Volume2, Clock, AlertTriangle, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Preferences {
  enabled: boolean;
  days_threshold: number;
  email_enabled: boolean;
  push_enabled: boolean;
  sound_enabled: boolean;
  check_interval_hours: number;
  report_hour: number;
}

const DelayedShipmentSettings = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { language, dir } = useLanguage();
  const navigate = useNavigate();
  const isArabic = language === 'ar';

  const [preferences, setPreferences] = useState<Preferences>({
    enabled: true,
    days_threshold: 1,
    email_enabled: true,
    push_enabled: true,
    sound_enabled: true,
    check_interval_hours: 6,
    report_hour: 8,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    fetchPreferences();
  }, [user]);

  const fetchPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('delayed_shipment_alert_preferences')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPreferences({
          enabled: data.enabled,
          days_threshold: data.days_threshold,
          email_enabled: data.email_enabled,
          push_enabled: data.push_enabled,
          sound_enabled: data.sound_enabled,
          check_interval_hours: data.check_interval_hours,
          report_hour: data.report_hour || 8,
        });
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!user) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('delayed_shipment_alert_preferences')
        .upsert({
          user_id: user.id,
          ...preferences,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: isArabic ? 'تم الحفظ' : 'Saved',
        description: isArabic ? 'تم حفظ إعدادات التنبيهات بنجاح' : 'Alert settings saved successfully',
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'حدث خطأ أثناء حفظ الإعدادات' : 'Error saving settings',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-arabic" dir={dir}>
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowRight className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-display font-bold flex items-center gap-2">
                <Settings className="w-6 h-6 text-primary" />
                {isArabic ? 'إعدادات تنبيهات الشحنات المتأخرة' : 'Delayed Shipment Alert Settings'}
              </h1>
              <p className="text-muted-foreground">
                {isArabic ? 'تخصيص إشعارات تأخر الشحنات' : 'Customize delayed shipment notifications'}
              </p>
            </div>
          </div>
          <Button onClick={savePreferences} disabled={isSaving} className="gap-2">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isArabic ? 'حفظ الإعدادات' : 'Save Settings'}
          </Button>
        </div>

        <div className="grid gap-6 max-w-2xl">
          {/* Main Toggle */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                {isArabic ? 'تفعيل التنبيهات' : 'Enable Alerts'}
              </CardTitle>
              <CardDescription>
                {isArabic ? 'تفعيل أو تعطيل تنبيهات الشحنات المتأخرة' : 'Enable or disable delayed shipment alerts'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Label htmlFor="enabled">
                  {isArabic ? 'تنبيهات الشحنات المتأخرة' : 'Delayed Shipment Alerts'}
                </Label>
                <Switch
                  id="enabled"
                  checked={preferences.enabled}
                  onCheckedChange={(checked) => setPreferences(p => ({ ...p, enabled: checked }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Delay Threshold */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" />
                {isArabic ? 'حد التأخير' : 'Delay Threshold'}
              </CardTitle>
              <CardDescription>
                {isArabic ? 'تحديد عدد أيام التأخير قبل إرسال التنبيه' : 'Set number of delay days before sending alert'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Label htmlFor="days_threshold" className="min-w-[120px]">
                  {isArabic ? 'أيام التأخير' : 'Delay Days'}
                </Label>
                <Input
                  id="days_threshold"
                  type="number"
                  min={1}
                  max={30}
                  value={preferences.days_threshold}
                  onChange={(e) => setPreferences(p => ({ ...p, days_threshold: parseInt(e.target.value) || 1 }))}
                  className="w-24"
                />
                <span className="text-muted-foreground">
                  {isArabic ? 'يوم' : 'days'}
                </span>
              </div>

              <div className="flex items-center gap-4">
                <Label htmlFor="check_interval" className="min-w-[120px]">
                  {isArabic ? 'فترة الفحص' : 'Check Interval'}
                </Label>
                <Select
                  value={preferences.check_interval_hours.toString()}
                  onValueChange={(value) => setPreferences(p => ({ ...p, check_interval_hours: parseInt(value) }))}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{isArabic ? 'كل ساعة' : 'Every hour'}</SelectItem>
                    <SelectItem value="3">{isArabic ? 'كل 3 ساعات' : 'Every 3 hours'}</SelectItem>
                    <SelectItem value="6">{isArabic ? 'كل 6 ساعات' : 'Every 6 hours'}</SelectItem>
                    <SelectItem value="12">{isArabic ? 'كل 12 ساعة' : 'Every 12 hours'}</SelectItem>
                    <SelectItem value="24">{isArabic ? 'مرة يومياً' : 'Once daily'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-4">
                <Label htmlFor="report_hour" className="min-w-[120px]">
                  {isArabic ? 'وقت التقرير اليومي' : 'Daily Report Time'}
                </Label>
                <Select
                  value={preferences.report_hour.toString()}
                  onValueChange={(value) => setPreferences(p => ({ ...p, report_hour: parseInt(value) }))}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        {i.toString().padStart(2, '0')}:00
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-muted-foreground text-sm">
                  {isArabic ? '(توقيت الرياض)' : '(Riyadh time)'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Notification Channels */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-purple-500" />
                {isArabic ? 'قنوات الإشعارات' : 'Notification Channels'}
              </CardTitle>
              <CardDescription>
                {isArabic ? 'اختر طريقة استلام التنبيهات' : 'Choose how to receive alerts'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <Label htmlFor="email_enabled">
                    {isArabic ? 'إشعارات البريد الإلكتروني' : 'Email Notifications'}
                  </Label>
                </div>
                <Switch
                  id="email_enabled"
                  checked={preferences.email_enabled}
                  onCheckedChange={(checked) => setPreferences(p => ({ ...p, email_enabled: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-muted-foreground" />
                  <Label htmlFor="push_enabled">
                    {isArabic ? 'إشعارات المتصفح' : 'Push Notifications'}
                  </Label>
                </div>
                <Switch
                  id="push_enabled"
                  checked={preferences.push_enabled}
                  onCheckedChange={(checked) => setPreferences(p => ({ ...p, push_enabled: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-muted-foreground" />
                  <Label htmlFor="sound_enabled">
                    {isArabic ? 'صوت التنبيه' : 'Alert Sound'}
                  </Label>
                </div>
                <Switch
                  id="sound_enabled"
                  checked={preferences.sound_enabled}
                  onCheckedChange={(checked) => setPreferences(p => ({ ...p, sound_enabled: checked }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-orange-800 dark:text-orange-200">
                    {isArabic ? 'معلومات مهمة' : 'Important Information'}
                  </p>
                  <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                    {isArabic
                      ? 'سيتم إرسال تنبيه واحد فقط لكل شحنة متأخرة لتجنب الإزعاج. يمكنك مراجعة جميع الشحنات المتأخرة في صفحة التقارير.'
                      : 'Only one alert will be sent per delayed shipment to avoid spam. You can review all delayed shipments in the reports page.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DelayedShipmentSettings;
