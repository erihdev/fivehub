import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Clock,
  Package,
  Coffee,
  Loader2,
  ArrowLeft,
  CheckCircle,
  Truck,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { format, differenceInDays } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface DelayNotification {
  id: string;
  order_id: string;
  days_delayed: number;
  notification_sent_at: string;
  status: string;
  order?: {
    id: string;
    quantity_kg: number;
    expected_delivery: string | null;
    actual_delivery: string | null;
    status: string;
    notes: string | null;
    user_id: string;
  };
  shipment?: {
    id: string;
    tracking_number: string | null;
    carrier: string | null;
    status: string;
    location: string | null;
    estimated_arrival: string | null;
  };
}

const SupplierDelayNotifications = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { language, t, dir } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [notifications, setNotifications] = useState<DelayNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState<DelayNotification | null>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    status: '',
    trackingNumber: '',
    carrier: '',
    location: '',
    estimatedArrival: '',
    notes: '',
  });

  const isRtl = dir === 'rtl';
  const dateLocale = language === 'ar' ? ar : enUS;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const fetchNotifications = async () => {
    if (!user) return;
    setIsLoading(true);
    
    try {
      // Get supplier ID for current user
      const { data: suppliers, error: suppliersError } = await supabase
        .from('suppliers')
        .select('id')
        .eq('user_id', user.id);

      if (suppliersError) throw suppliersError;
      if (!suppliers || suppliers.length === 0) {
        setNotifications([]);
        setIsLoading(false);
        return;
      }

      const supplierIds = suppliers.map(s => s.id);

      // Fetch delay notifications
      const { data: notificationsData, error: notificationsError } = await supabase
        .from('supplier_delayed_notifications')
        .select('*')
        .in('supplier_id', supplierIds)
        .order('notification_sent_at', { ascending: false });

      if (notificationsError) throw notificationsError;

      // Fetch related orders and shipments
      const enrichedNotifications = await Promise.all(
        (notificationsData || []).map(async (notification) => {
          const { data: order } = await supabase
            .from('orders')
            .select('id, quantity_kg, expected_delivery, actual_delivery, status, notes, user_id')
            .eq('id', notification.order_id)
            .maybeSingle();

          const { data: shipment } = await supabase
            .from('shipment_tracking')
            .select('id, tracking_number, carrier, status, location, estimated_arrival')
            .eq('order_id', notification.order_id)
            .maybeSingle();

          return {
            ...notification,
            order,
            shipment,
          };
        })
      );

      setNotifications(enrichedNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل في تحميل الإشعارات' : 'Failed to load notifications',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  const handleOpenUpdateDialog = (notification: DelayNotification) => {
    setSelectedNotification(notification);
    setUpdateForm({
      status: notification.shipment?.status || 'preparing',
      trackingNumber: notification.shipment?.tracking_number || '',
      carrier: notification.shipment?.carrier || '',
      location: notification.shipment?.location || '',
      estimatedArrival: notification.shipment?.estimated_arrival 
        ? format(new Date(notification.shipment.estimated_arrival), 'yyyy-MM-dd')
        : '',
      notes: '',
    });
    setIsUpdateDialogOpen(true);
  };

  const handleUpdateShipment = async () => {
    if (!selectedNotification) return;
    
    setIsUpdating(true);
    try {
      // Update or create shipment tracking
      if (selectedNotification.shipment) {
        const { error } = await supabase
          .from('shipment_tracking')
          .update({
            status: updateForm.status,
            tracking_number: updateForm.trackingNumber || null,
            carrier: updateForm.carrier || null,
            location: updateForm.location || null,
            estimated_arrival: updateForm.estimatedArrival 
              ? new Date(updateForm.estimatedArrival).toISOString()
              : null,
            notes: updateForm.notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedNotification.shipment.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('shipment_tracking')
          .insert({
            order_id: selectedNotification.order_id,
            status: updateForm.status,
            tracking_number: updateForm.trackingNumber || null,
            carrier: updateForm.carrier || null,
            location: updateForm.location || null,
            estimated_arrival: updateForm.estimatedArrival 
              ? new Date(updateForm.estimatedArrival).toISOString()
              : null,
            notes: updateForm.notes || null,
          });

        if (error) throw error;
      }

      // Update notification status
      await supabase
        .from('supplier_delayed_notifications')
        .update({ status: 'responded' })
        .eq('id', selectedNotification.id);

      // Get supplier ID for customer notification
      const { data: suppliers } = await supabase
        .from('suppliers')
        .select('id')
        .eq('user_id', user?.id)
        .limit(1);

      const supplierId = suppliers?.[0]?.id;

      // Notify customer via edge function
      if (supplierId) {
        try {
          await supabase.functions.invoke('notify-customer-shipment-update', {
            body: {
              orderId: selectedNotification.order_id,
              supplierId: supplierId,
              shipmentStatus: updateForm.status,
              trackingNumber: updateForm.trackingNumber || undefined,
              estimatedArrival: updateForm.estimatedArrival || undefined,
              location: updateForm.location || undefined,
              notes: updateForm.notes || undefined,
            },
          });
        } catch (notifyError) {
          console.error('Failed to notify customer:', notifyError);
        }
      }

      toast({
        title: language === 'ar' ? 'تم التحديث' : 'Updated',
        description: language === 'ar' ? 'تم تحديث حالة الشحنة وإشعار العميل' : 'Shipment status updated and customer notified',
      });

      setIsUpdateDialogOpen(false);
      fetchNotifications();
    } catch (error) {
      console.error('Error updating shipment:', error);
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل في تحديث الشحنة' : 'Failed to update shipment',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="destructive">{language === 'ar' ? 'بانتظار الرد' : 'Pending Response'}</Badge>;
      case 'responded':
        return <Badge variant="default" className="bg-green-500">{language === 'ar' ? 'تم الرد' : 'Responded'}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getShipmentStatusBadge = (status: string) => {
    switch (status) {
      case 'preparing':
        return <Badge variant="outline">{language === 'ar' ? 'قيد التحضير' : 'Preparing'}</Badge>;
      case 'shipped':
        return <Badge className="bg-blue-500">{language === 'ar' ? 'تم الشحن' : 'Shipped'}</Badge>;
      case 'in_transit':
        return <Badge className="bg-amber-500">{language === 'ar' ? 'في الطريق' : 'In Transit'}</Badge>;
      case 'delivered':
        return <Badge className="bg-green-500">{language === 'ar' ? 'تم التسليم' : 'Delivered'}</Badge>;
      case 'delayed':
        return <Badge variant="destructive">{language === 'ar' ? 'متأخر' : 'Delayed'}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (authLoading || isLoading) {
    return (
      <main className="min-h-screen bg-background font-arabic flex items-center justify-center" dir={dir}>
        <Loader2 className="w-10 h-10 text-coffee-gold animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background font-arabic" dir={dir}>
      <div className="container mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">
              {language === 'ar' ? 'إشعارات الشحنات المتأخرة' : 'Delayed Shipment Notifications'}
            </h1>
            <p className="text-muted-foreground">
              {language === 'ar' 
                ? 'تتبع وتحديث حالة الشحنات المتأخرة' 
                : 'Track and update delayed shipment status'}
            </p>
          </div>
          <Button onClick={fetchNotifications} variant="outline">
            <RefreshCw className={`w-4 h-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
            {language === 'ar' ? 'تحديث' : 'Refresh'}
          </Button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{notifications.filter(n => n.status === 'sent').length}</p>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'بانتظار الرد' : 'Pending Response'}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{notifications.filter(n => n.status === 'responded').length}</p>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'تم الرد' : 'Responded'}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {notifications.length > 0 
                    ? (notifications.reduce((sum, n) => sum + n.days_delayed, 0) / notifications.length).toFixed(1)
                    : 0}
                </p>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'متوسط أيام التأخير' : 'Avg Delay Days'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                {language === 'ar' ? 'لا توجد إشعارات تأخير' : 'No Delay Notifications'}
              </h3>
              <p className="text-muted-foreground">
                {language === 'ar' 
                  ? 'جميع شحناتك في الوقت المحدد!' 
                  : 'All your shipments are on time!'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <Card key={notification.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Package className="w-5 h-5 text-coffee-gold" />
                          <span className="font-semibold">
                            {language === 'ar' ? 'طلب رقم:' : 'Order #'} {notification.order_id.slice(0, 8)}
                          </span>
                        </div>
                        {getStatusBadge(notification.status)}
                        {notification.shipment && getShipmentStatusBadge(notification.shipment.status)}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">
                            {language === 'ar' ? 'أيام التأخير:' : 'Delay Days:'}
                          </span>
                          <span className={`font-medium ${isRtl ? 'mr-2' : 'ml-2'} text-red-500`}>
                            {notification.days_delayed} {language === 'ar' ? 'يوم' : 'days'}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            {language === 'ar' ? 'الكمية:' : 'Quantity:'}
                          </span>
                          <span className={`font-medium ${isRtl ? 'mr-2' : 'ml-2'}`}>
                            {notification.order?.quantity_kg || '-'} {language === 'ar' ? 'كجم' : 'kg'}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            {language === 'ar' ? 'التسليم المتوقع:' : 'Expected:'}
                          </span>
                          <span className={`font-medium ${isRtl ? 'mr-2' : 'ml-2'}`}>
                            {notification.order?.expected_delivery 
                              ? format(new Date(notification.order.expected_delivery), 'dd MMM yyyy', { locale: dateLocale })
                              : '-'}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            {language === 'ar' ? 'تاريخ الإشعار:' : 'Notified:'}
                          </span>
                          <span className={`font-medium ${isRtl ? 'mr-2' : 'ml-2'}`}>
                            {format(new Date(notification.notification_sent_at), 'dd MMM yyyy', { locale: dateLocale })}
                          </span>
                        </div>
                      </div>

                      {notification.shipment && (
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {notification.shipment.tracking_number && (
                            <span>
                              <Truck className="w-4 h-4 inline mr-1" />
                              {notification.shipment.tracking_number}
                            </span>
                          )}
                          {notification.shipment.carrier && (
                            <span>{notification.shipment.carrier}</span>
                          )}
                          {notification.shipment.location && (
                            <span>{notification.shipment.location}</span>
                          )}
                        </div>
                      )}
                    </div>

                    <Button onClick={() => handleOpenUpdateDialog(notification)} variant="coffee">
                      <RefreshCw className={`w-4 h-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                      {language === 'ar' ? 'تحديث الحالة' : 'Update Status'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Update Dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {language === 'ar' ? 'تحديث حالة الشحنة' : 'Update Shipment Status'}
            </DialogTitle>
            <DialogDescription>
              {language === 'ar' 
                ? 'قم بتحديث معلومات الشحنة لإخطار العميل' 
                : 'Update shipment information to notify the customer'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'حالة الشحنة' : 'Shipment Status'}</Label>
              <Select value={updateForm.status} onValueChange={(v) => setUpdateForm({ ...updateForm, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="preparing">{language === 'ar' ? 'قيد التحضير' : 'Preparing'}</SelectItem>
                  <SelectItem value="shipped">{language === 'ar' ? 'تم الشحن' : 'Shipped'}</SelectItem>
                  <SelectItem value="in_transit">{language === 'ar' ? 'في الطريق' : 'In Transit'}</SelectItem>
                  <SelectItem value="delivered">{language === 'ar' ? 'تم التسليم' : 'Delivered'}</SelectItem>
                  <SelectItem value="delayed">{language === 'ar' ? 'متأخر' : 'Delayed'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{language === 'ar' ? 'رقم التتبع' : 'Tracking Number'}</Label>
              <Input
                value={updateForm.trackingNumber}
                onChange={(e) => setUpdateForm({ ...updateForm, trackingNumber: e.target.value })}
                placeholder={language === 'ar' ? 'أدخل رقم التتبع' : 'Enter tracking number'}
              />
            </div>

            <div className="space-y-2">
              <Label>{language === 'ar' ? 'شركة الشحن' : 'Carrier'}</Label>
              <Input
                value={updateForm.carrier}
                onChange={(e) => setUpdateForm({ ...updateForm, carrier: e.target.value })}
                placeholder={language === 'ar' ? 'مثال: DHL, Aramex' : 'e.g., DHL, Aramex'}
              />
            </div>

            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الموقع الحالي' : 'Current Location'}</Label>
              <Input
                value={updateForm.location}
                onChange={(e) => setUpdateForm({ ...updateForm, location: e.target.value })}
                placeholder={language === 'ar' ? 'أدخل الموقع الحالي' : 'Enter current location'}
              />
            </div>

            <div className="space-y-2">
              <Label>{language === 'ar' ? 'تاريخ الوصول المتوقع' : 'Estimated Arrival'}</Label>
              <Input
                type="date"
                value={updateForm.estimatedArrival}
                onChange={(e) => setUpdateForm({ ...updateForm, estimatedArrival: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
              <Textarea
                value={updateForm.notes}
                onChange={(e) => setUpdateForm({ ...updateForm, notes: e.target.value })}
                placeholder={language === 'ar' ? 'أي ملاحظات إضافية...' : 'Any additional notes...'}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpdateDialogOpen(false)} disabled={isUpdating}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleUpdateShipment} disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {language === 'ar' ? 'جاري التحديث...' : 'Updating...'}
                </>
              ) : (
                language === 'ar' ? 'حفظ التحديثات' : 'Save Updates'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default SupplierDelayNotifications;
