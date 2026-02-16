import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Mail, Clock, Calendar, Bell, Save, Loader2, ArrowRight, Check, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from '@/hooks/use-toast';
import { useReportFailureAlerts } from '@/hooks/useReportFailureAlerts';
import SentReportsLog from '@/components/SentReportsLog';
import { ReportSuccessStats } from '@/components/ReportSuccessStats';

interface ReportPreferences {
  weekly_report_enabled: boolean;
  report_day: number;
  report_hour: number;
  include_predictions: boolean;
  include_low_stock: boolean;
  include_orders: boolean;
  include_auto_reorders: boolean;
  email_override: string;
}

const defaultPreferences: ReportPreferences = {
  weekly_report_enabled: true,
  report_day: 0,
  report_hour: 9,
  include_predictions: true,
  include_low_stock: true,
  include_orders: true,
  include_auto_reorders: true,
  email_override: '',
};

const ReportSettings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  
  // Enable report failure alerts
  useReportFailureAlerts();
  
  const [preferences, setPreferences] = useState<ReportPreferences>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);

  const days = isArabic 
    ? ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
    : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    const fetchPreferences = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('report_preferences')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setHasExisting(true);
          setPreferences({
            weekly_report_enabled: data.weekly_report_enabled,
            report_day: data.report_day,
            report_hour: data.report_hour,
            include_predictions: data.include_predictions,
            include_low_stock: data.include_low_stock,
            include_orders: data.include_orders,
            include_auto_reorders: data.include_auto_reorders,
            email_override: data.email_override || '',
          });
        }
      } catch (err) {
        console.error('Error fetching preferences:', err);
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
      const payload = {
        user_id: user.id,
        ...preferences,
        email_override: preferences.email_override || null,
      };

      if (hasExisting) {
        const { error } = await supabase
          .from('report_preferences')
          .update(payload)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('report_preferences')
          .insert(payload);
        if (error) throw error;
        setHasExisting(true);
      }

      toast({
        title: isArabic ? 'تم الحفظ' : 'Saved',
        description: isArabic ? 'تم حفظ إعدادات التقارير بنجاح' : 'Report settings saved successfully',
      });
    } catch (err) {
      console.error('Error saving preferences:', err);
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'فشل في حفظ الإعدادات' : 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const sendTestReport = async () => {
    if (!user) return;

    setIsSendingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-weekly-report', {
        body: { testMode: true, userId: user.id }
      });

      if (error) throw error;

      toast({
        title: isArabic ? '✉️ تم الإرسال' : '✉️ Sent',
        description: isArabic 
          ? 'تم إرسال التقرير التجريبي إلى بريدك الإلكتروني' 
          : 'Test report sent to your email',
      });
    } catch (err) {
      console.error('Error sending test report:', err);
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'فشل في إرسال التقرير التجريبي' : 'Failed to send test report',
        variant: 'destructive',
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <Settings className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{isArabic ? 'إعدادات التقارير' : 'Report Settings'}</h1>
              <p className="text-muted-foreground">
                {isArabic ? 'تحكم في تفضيلات إرسال التقارير الأسبوعية' : 'Manage your weekly report preferences'}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate('/inventory-report')}>
            {isArabic ? 'العودة للتقرير' : 'Back to Report'}
            <ArrowRight className={`h-4 w-4 ${isArabic ? 'mr-2 rotate-180' : 'ml-2'}`} />
          </Button>
        </div>

        <div className="grid gap-6 max-w-2xl">
          {/* Main Toggle */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                {isArabic ? 'التقرير الأسبوعي' : 'Weekly Report'}
              </CardTitle>
              <CardDescription>
                {isArabic 
                  ? 'تفعيل أو إيقاف إرسال التقرير الأسبوعي عبر البريد الإلكتروني'
                  : 'Enable or disable weekly email reports'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Label htmlFor="weekly-report" className="flex items-center gap-2">
                  {preferences.weekly_report_enabled && <Check className="h-4 w-4 text-green-500" />}
                  {isArabic ? 'إرسال التقرير الأسبوعي' : 'Send weekly report'}
                </Label>
                <Switch
                  id="weekly-report"
                  checked={preferences.weekly_report_enabled}
                  onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, weekly_report_enabled: checked }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card className={!preferences.weekly_report_enabled ? 'opacity-50 pointer-events-none' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                {isArabic ? 'جدولة الإرسال' : 'Schedule'}
              </CardTitle>
              <CardDescription>
                {isArabic ? 'حدد موعد إرسال التقرير' : 'Set when to send the report'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isArabic ? 'يوم الإرسال' : 'Day'}</Label>
                  <Select
                    value={preferences.report_day.toString()}
                    onValueChange={(value) => setPreferences(prev => ({ ...prev, report_day: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {days.map((day, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{isArabic ? 'الساعة' : 'Hour'}</Label>
                  <Select
                    value={preferences.report_hour.toString()}
                    onValueChange={(value) => setPreferences(prev => ({ ...prev, report_hour: parseInt(value) }))}
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
                </div>
              </div>

              <div className="space-y-2">
                <Label>{isArabic ? 'بريد إلكتروني مخصص (اختياري)' : 'Custom email (optional)'}</Label>
                <Input
                  type="email"
                  placeholder={isArabic ? 'اتركه فارغاً لاستخدام بريد الحساب' : 'Leave empty to use account email'}
                  value={preferences.email_override}
                  onChange={(e) => setPreferences(prev => ({ ...prev, email_override: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Content Options */}
          <Card className={!preferences.weekly_report_enabled ? 'opacity-50 pointer-events-none' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                {isArabic ? 'محتوى التقرير' : 'Report Content'}
              </CardTitle>
              <CardDescription>
                {isArabic ? 'اختر العناصر التي تريد تضمينها في التقرير' : 'Choose what to include in the report'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="include-predictions">
                  {isArabic ? 'التنبؤات الذكية' : 'AI Predictions'}
                </Label>
                <Switch
                  id="include-predictions"
                  checked={preferences.include_predictions}
                  onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, include_predictions: checked }))}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <Label htmlFor="include-low-stock">
                  {isArabic ? 'عناصر المخزون المنخفض' : 'Low stock items'}
                </Label>
                <Switch
                  id="include-low-stock"
                  checked={preferences.include_low_stock}
                  onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, include_low_stock: checked }))}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <Label htmlFor="include-orders">
                  {isArabic ? 'إحصائيات الطلبات' : 'Order statistics'}
                </Label>
                <Switch
                  id="include-orders"
                  checked={preferences.include_orders}
                  onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, include_orders: checked }))}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <Label htmlFor="include-auto-reorders">
                  {isArabic ? 'إعادة الطلب التلقائي' : 'Auto-reorders'}
                </Label>
                <Switch
                  id="include-auto-reorders"
                  checked={preferences.include_auto_reorders}
                  onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, include_auto_reorders: checked }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={isSaving} size="lg" className="flex-1">
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {isArabic ? 'حفظ الإعدادات' : 'Save Settings'}
            </Button>
            <Button 
              onClick={sendTestReport} 
              disabled={isSendingTest} 
              size="lg" 
              variant="outline"
              className="flex-1"
            >
              {isSendingTest ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {isArabic ? 'إرسال تقرير تجريبي' : 'Send Test Report'}
            </Button>
          </div>

          {/* Report Success Stats */}
          <ReportSuccessStats />

          {/* Sent Reports Log */}
          <SentReportsLog />
        </div>
      </div>
    </div>
  );
};

export default ReportSettings;
