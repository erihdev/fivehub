import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { toast } from "sonner";
import { ArrowRight, MessageCircle, Phone, Bell, Truck, Package, CheckCircle, AlertTriangle, Save } from "lucide-react";

interface WhatsAppSettings {
  enabled: boolean;
  phone_number: string;
  notify_on_shipped: boolean;
  notify_on_out_for_delivery: boolean;
  notify_on_delivered: boolean;
  notify_on_delayed: boolean;
}

const WhatsAppNotificationSettings = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { language, dir } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<WhatsAppSettings>({
    enabled: true,
    phone_number: '',
    notify_on_shipped: true,
    notify_on_out_for_delivery: true,
    notify_on_delivered: true,
    notify_on_delayed: true
  });

  const t = {
    title: language === 'ar' ? 'إعدادات إشعارات واتساب' : 'WhatsApp Notification Settings',
    subtitle: language === 'ar' ? 'تخصيص إشعارات الشحن عبر واتساب' : 'Customize shipping notifications via WhatsApp',
    back: language === 'ar' ? 'العودة' : 'Back',
    enableNotifications: language === 'ar' ? 'تفعيل الإشعارات' : 'Enable Notifications',
    enableDesc: language === 'ar' ? 'تفعيل إشعارات واتساب للشحنات' : 'Enable WhatsApp notifications for shipments',
    phoneNumber: language === 'ar' ? 'رقم الواتساب' : 'WhatsApp Number',
    phoneDesc: language === 'ar' ? 'رقم الهاتف المسجل في واتساب مع رمز الدولة' : 'Phone number registered with WhatsApp including country code',
    notificationTypes: language === 'ar' ? 'أنواع الإشعارات' : 'Notification Types',
    shipped: language === 'ar' ? 'عند الشحن' : 'When Shipped',
    shippedDesc: language === 'ar' ? 'إشعار عند إرسال الشحنة' : 'Notify when shipment is dispatched',
    outForDelivery: language === 'ar' ? 'خارج للتسليم' : 'Out for Delivery',
    outForDeliveryDesc: language === 'ar' ? 'إشعار عند خروج الشحنة للتسليم' : 'Notify when shipment is out for delivery',
    delivered: language === 'ar' ? 'تم التسليم' : 'Delivered',
    deliveredDesc: language === 'ar' ? 'إشعار عند تسليم الشحنة' : 'Notify when shipment is delivered',
    delayed: language === 'ar' ? 'تأخير الشحنة' : 'Shipment Delayed',
    delayedDesc: language === 'ar' ? 'إشعار عند تأخر الشحنة' : 'Notify when shipment is delayed',
    save: language === 'ar' ? 'حفظ الإعدادات' : 'Save Settings',
    saved: language === 'ar' ? 'تم حفظ الإعدادات بنجاح' : 'Settings saved successfully',
    error: language === 'ar' ? 'حدث خطأ أثناء الحفظ' : 'Error saving settings',
    testNotification: language === 'ar' ? 'إرسال إشعار تجريبي' : 'Send Test Notification',
    testSent: language === 'ar' ? 'تم إرسال الإشعار التجريبي' : 'Test notification sent',
    info: language === 'ar' ? 'معلومات' : 'Info',
    infoText: language === 'ar' 
      ? 'ستصلك إشعارات واتساب تلقائية عند تحديث حالة الشحنات. تأكد من إدخال رقم الواتساب الصحيح مع رمز الدولة (مثال: +966500000000)'
      : 'You will receive automatic WhatsApp notifications when shipment status is updated. Make sure to enter the correct WhatsApp number with country code (e.g., +966500000000)'
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_notification_settings')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSettings({
          enabled: data.enabled,
          phone_number: data.phone_number || '',
          notify_on_shipped: data.notify_on_shipped,
          notify_on_out_for_delivery: data.notify_on_out_for_delivery,
          notify_on_delivered: data.notify_on_delivered,
          notify_on_delayed: data.notify_on_delayed
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('whatsapp_notification_settings')
        .upsert({
          user_id: user?.id,
          ...settings,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;
      toast.success(t.saved);
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error(t.error);
    } finally {
      setSaving(false);
    }
  };

  const sendTestNotification = async () => {
    if (!settings.phone_number) {
      toast.error(language === 'ar' ? 'يرجى إدخال رقم الواتساب' : 'Please enter WhatsApp number');
      return;
    }

    try {
      // Log test notification
      await supabase.from('whatsapp_notification_logs').insert({
        order_id: null,
        phone_number: settings.phone_number,
        message_type: 'test',
        message_content: language === 'ar' 
          ? 'هذا إشعار تجريبي من منصة دال للقهوة'
          : 'This is a test notification from Dal Coffee Platform',
        status: 'sent',
        sent_at: new Date().toISOString()
      });

      // Open WhatsApp with test message
      const message = encodeURIComponent(
        language === 'ar' 
          ? '🧪 إشعار تجريبي\n\nمرحباً! هذا إشعار تجريبي من منصة دال للقهوة. إذا وصلتك هذه الرسالة، فإعدادات الإشعارات تعمل بشكل صحيح.\n\n☕ منصة دال للقهوة المختصة'
          : '🧪 Test Notification\n\nHello! This is a test notification from Dal Coffee Platform. If you received this message, your notification settings are working correctly.\n\n☕ Dal Specialty Coffee Platform'
      );
      const whatsappUrl = `https://wa.me/${settings.phone_number.replace(/[^0-9]/g, '')}?text=${message}`;
      window.open(whatsappUrl, '_blank');

      toast.success(t.testSent);
    } catch (error) {
      console.error('Error sending test:', error);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir={dir}>
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/delayed-shipment-settings">
                <Button variant="ghost" size="sm">
                  <ArrowRight className={`w-4 h-4 ${dir === 'rtl' ? 'ml-2' : 'mr-2'}`} />
                  {t.back}
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <MessageCircle className="w-6 h-6 text-green-500" />
                  {t.title}
                </h1>
                <p className="text-muted-foreground text-sm">{t.subtitle}</p>
              </div>
            </div>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        {/* Enable/Disable */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              {t.enableNotifications}
            </CardTitle>
            <CardDescription>{t.enableDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageCircle className="w-8 h-8 text-green-500" />
                <div>
                  <p className="font-medium">{t.enableNotifications}</p>
                  <p className="text-sm text-muted-foreground">{t.enableDesc}</p>
                </div>
              </div>
              <Switch
                checked={settings.enabled}
                onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Phone Number */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
              {t.phoneNumber}
            </CardTitle>
            <CardDescription>{t.phoneDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t.phoneNumber}</Label>
              <Input
                type="tel"
                value={settings.phone_number}
                onChange={(e) => setSettings({ ...settings, phone_number: e.target.value })}
                placeholder="+966500000000"
                dir="ltr"
              />
            </div>
            <Button variant="outline" onClick={sendTestNotification} className="w-full">
              <MessageCircle className={`w-4 h-4 ${dir === 'rtl' ? 'ml-2' : 'mr-2'}`} />
              {t.testNotification}
            </Button>
          </CardContent>
        </Card>

        {/* Notification Types */}
        <Card>
          <CardHeader>
            <CardTitle>{t.notificationTypes}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Shipped */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Truck className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="font-medium">{t.shipped}</p>
                  <p className="text-sm text-muted-foreground">{t.shippedDesc}</p>
                </div>
              </div>
              <Switch
                checked={settings.notify_on_shipped}
                onCheckedChange={(checked) => setSettings({ ...settings, notify_on_shipped: checked })}
              />
            </div>

            {/* Out for Delivery */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 rounded-lg">
                  <Package className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="font-medium">{t.outForDelivery}</p>
                  <p className="text-sm text-muted-foreground">{t.outForDeliveryDesc}</p>
                </div>
              </div>
              <Switch
                checked={settings.notify_on_out_for_delivery}
                onCheckedChange={(checked) => setSettings({ ...settings, notify_on_out_for_delivery: checked })}
              />
            </div>

            {/* Delivered */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="font-medium">{t.delivered}</p>
                  <p className="text-sm text-muted-foreground">{t.deliveredDesc}</p>
                </div>
              </div>
              <Switch
                checked={settings.notify_on_delivered}
                onCheckedChange={(checked) => setSettings({ ...settings, notify_on_delivered: checked })}
              />
            </div>

            {/* Delayed */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="font-medium">{t.delayed}</p>
                  <p className="text-sm text-muted-foreground">{t.delayedDesc}</p>
                </div>
              </div>
              <Switch
                checked={settings.notify_on_delayed}
                onCheckedChange={(checked) => setSettings({ ...settings, notify_on_delayed: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-green-500/10 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <MessageCircle className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium text-green-700 dark:text-green-400">{t.info}</p>
                <p className="text-sm text-green-600 dark:text-green-300 mt-1">{t.infoText}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button onClick={saveSettings} disabled={saving} className="w-full" size="lg">
          <Save className={`w-4 h-4 ${dir === 'rtl' ? 'ml-2' : 'mr-2'}`} />
          {saving ? '...' : t.save}
        </Button>
      </main>
    </div>
  );
};

export default WhatsAppNotificationSettings;