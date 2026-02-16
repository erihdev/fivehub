import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Mail, Smartphone, Save, Loader2, ArrowRight, TrendingDown, Clock, TestTube, Sun, Brain, History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/ThemeToggle';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import PerformanceAlertLog from '@/components/PerformanceAlertLog';
import { PerformanceTrendChart } from '@/components/PerformanceTrendChart';
import { ExportPerformanceData } from '@/components/ExportPerformanceData';
import { MonthlyPerformanceReport } from '@/components/MonthlyPerformanceReport';
import { PerformancePredictions } from '@/components/PerformancePredictions';
import { SmartPredictionAlerts } from '@/components/SmartPredictionAlerts';
import WeeklyTrendsComparison from '@/components/WeeklyTrendsComparison';

interface AlertSettings {
  alerts_enabled: boolean;
  threshold: number;
  alert_frequency: string;
  email_alerts: boolean;
  push_alerts: boolean;
  daily_summary_enabled: boolean;
  daily_summary_hour: number;
}

const defaultSettings: AlertSettings = {
  alerts_enabled: true,
  threshold: 40,
  alert_frequency: 'daily',
  email_alerts: true,
  push_alerts: false,
  daily_summary_enabled: true,
  daily_summary_hour: 9,
};

const PerformanceAlertSettings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useLanguage();
  const isArabic = language === 'ar';

  const [settings, setSettings] = useState<AlertSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchSettings();
  }, [user, navigate]);

  const fetchSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('performance_alert_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          alerts_enabled: data.alerts_enabled,
          threshold: data.threshold,
          alert_frequency: data.alert_frequency,
          email_alerts: data.email_alerts,
          push_alerts: data.push_alerts,
          daily_summary_enabled: data.daily_summary_enabled ?? true,
          daily_summary_hour: data.daily_summary_hour ?? 9,
        });
        setHasExisting(true);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      if (hasExisting) {
        const { error } = await supabase
          .from('performance_alert_settings')
          .update(settings)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('performance_alert_settings')
          .insert({ ...settings, user_id: user.id });

        if (error) throw error;
        setHasExisting(true);
      }

      toast({
        title: isArabic ? 'تم الحفظ' : 'Saved',
        description: isArabic ? 'تم حفظ إعدادات التنبيهات بنجاح' : 'Alert settings saved successfully',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        variant: 'destructive',
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'فشل حفظ الإعدادات' : 'Failed to save settings',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const sendTestAlert = async () => {
    if (!user) return;

    setIsTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('performance-alert', {
        body: { userId: user.id, threshold: 100 }, // threshold 100 ensures alert is always sent
      });

      if (error) throw error;

      toast({
        title: isArabic ? 'تم الإرسال' : 'Sent',
        description: isArabic 
          ? 'تم إرسال تنبيه تجريبي إلى بريدك الإلكتروني' 
          : 'Test alert sent to your email',
      });
    } catch (error) {
      console.error('Error sending test:', error);
      toast({
        variant: 'destructive',
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'فشل إرسال التنبيه التجريبي' : 'Failed to send test alert',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background" dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Bell className="h-8 w-8 text-primary" />
              {isArabic ? 'إعدادات تنبيهات الأداء' : 'Performance Alert Settings'}
            </h1>
            <p className="text-muted-foreground mt-2">
              {isArabic 
                ? 'إدارة التنبيهات التلقائية عند انخفاض مؤشر أداء المخزون' 
                : 'Manage automatic alerts when inventory performance drops'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/smart-check-logs')}>
              <History className="h-4 w-4 ml-2" />
              {isArabic ? 'سجل الفحوصات' : 'Check Logs'}
            </Button>
            <ThemeToggle />
            <LanguageSwitcher />
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowRight className="h-4 w-4 ml-2" />
              {isArabic ? 'رجوع' : 'Back'}
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Enable/Disable Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                {isArabic ? 'تفعيل التنبيهات' : 'Enable Alerts'}
              </CardTitle>
              <CardDescription>
                {isArabic 
                  ? 'تفعيل أو إيقاف تنبيهات الأداء التلقائية' 
                  : 'Enable or disable automatic performance alerts'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Label htmlFor="alerts-enabled" className="flex items-center gap-2">
                  {settings.alerts_enabled ? (
                    <Badge variant="default" className="bg-green-600">
                      {isArabic ? 'مفعّل' : 'Enabled'}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      {isArabic ? 'معطّل' : 'Disabled'}
                    </Badge>
                  )}
                </Label>
                <Switch
                  id="alerts-enabled"
                  checked={settings.alerts_enabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, alerts_enabled: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Threshold Setting */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5" />
                {isArabic ? 'حد التنبيه' : 'Alert Threshold'}
              </CardTitle>
              <CardDescription>
                {isArabic 
                  ? 'سيتم إرسال تنبيه عندما ينخفض مؤشر الأداء عن هذا الحد' 
                  : 'An alert will be sent when performance drops below this threshold'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <span className={`text-5xl font-bold ${getScoreColor(settings.threshold)}`}>
                  {settings.threshold}
                </span>
                <span className="text-2xl text-muted-foreground">/100</span>
              </div>
              <Slider
                value={[settings.threshold]}
                onValueChange={(value) => setSettings({ ...settings, threshold: value[0] })}
                max={100}
                min={0}
                step={5}
                className="mt-4"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0 ({isArabic ? 'أكثر حساسية' : 'More sensitive'})</span>
                <span>100 ({isArabic ? 'أقل حساسية' : 'Less sensitive'})</span>
              </div>
            </CardContent>
          </Card>

          {/* Frequency Setting */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {isArabic ? 'تكرار الفحص' : 'Check Frequency'}
              </CardTitle>
              <CardDescription>
                {isArabic 
                  ? 'كم مرة يتم فحص مؤشر الأداء' 
                  : 'How often to check performance'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={settings.alert_frequency}
                onValueChange={(value) => setSettings({ ...settings, alert_frequency: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">{isArabic ? 'يومياً' : 'Daily'}</SelectItem>
                  <SelectItem value="weekly">{isArabic ? 'أسبوعياً' : 'Weekly'}</SelectItem>
                  <SelectItem value="monthly">{isArabic ? 'شهرياً' : 'Monthly'}</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Daily Summary Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sun className="h-5 w-5" />
                {isArabic ? 'الملخص اليومي' : 'Daily Summary'}
              </CardTitle>
              <CardDescription>
                {isArabic 
                  ? 'إعدادات إرسال ملخص الأداء اليومي' 
                  : 'Daily performance summary settings'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label>{isArabic ? 'تفعيل الملخص اليومي' : 'Enable Daily Summary'}</Label>
                    <p className="text-sm text-muted-foreground">
                      {isArabic ? 'استلام ملخص يومي للأداء عبر البريد' : 'Receive daily performance summary via email'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.daily_summary_enabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, daily_summary_enabled: checked })}
                />
              </div>

              <Separator />

              <div className={`space-y-2 ${!settings.daily_summary_enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                <Label>{isArabic ? 'وقت الإرسال' : 'Send Time'}</Label>
                <Select
                  value={settings.daily_summary_hour.toString()}
                  onValueChange={(value) => setSettings({ ...settings, daily_summary_hour: parseInt(value) })}
                >
                  <SelectTrigger>
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
                <p className="text-xs text-muted-foreground">
                  {isArabic 
                    ? 'سيتم إرسال الملخص اليومي في هذا الوقت كل يوم' 
                    : 'Daily summary will be sent at this time every day'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Notification Channels */}
          <Card>
            <CardHeader>
              <CardTitle>{isArabic ? 'قنوات التنبيه' : 'Notification Channels'}</CardTitle>
              <CardDescription>
                {isArabic 
                  ? 'اختر كيفية استلام التنبيهات' 
                  : 'Choose how to receive alerts'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label>{isArabic ? 'البريد الإلكتروني' : 'Email'}</Label>
                    <p className="text-sm text-muted-foreground">
                      {isArabic ? 'استلام التنبيهات عبر البريد' : 'Receive alerts via email'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.email_alerts}
                  onCheckedChange={(checked) => setSettings({ ...settings, email_alerts: checked })}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Smartphone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label>{isArabic ? 'الإشعارات الفورية' : 'Push Notifications'}</Label>
                    <p className="text-sm text-muted-foreground">
                      {isArabic ? 'استلام إشعارات على الجهاز' : 'Receive push notifications'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.push_alerts}
                  onCheckedChange={(checked) => setSettings({ ...settings, push_alerts: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button onClick={saveSettings} disabled={isSaving} className="flex-1">
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
              ) : (
                <Save className="h-4 w-4 ml-2" />
              )}
              {isArabic ? 'حفظ الإعدادات' : 'Save Settings'}
            </Button>

            <Button variant="outline" onClick={sendTestAlert} disabled={isTesting}>
              {isTesting ? (
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
              ) : (
                <TestTube className="h-4 w-4 ml-2" />
              )}
              {isArabic ? 'إرسال تجريبي' : 'Send Test'}
            </Button>

            <ExportPerformanceData />
            <MonthlyPerformanceReport />
          </div>

          {/* Performance Predictions */}
          <PerformancePredictions />

          {/* Smart Prediction Alerts */}
          <SmartPredictionAlerts />

          {/* Weekly Trends Comparison */}
          <WeeklyTrendsComparison />

          {/* Performance Trend Chart */}
          <PerformanceTrendChart />

          {/* Alert Log */}
          <PerformanceAlertLog />
        </div>
      </div>
    </main>
  );
};

export default PerformanceAlertSettings;
