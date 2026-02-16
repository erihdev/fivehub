import { useEffect, useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useNotificationSound } from '@/hooks/useNotificationSound';

interface DelayedOrder {
  id: string;
  expected_delivery: string;
  supplier_id: string;
  supplier: { name: string } | null;
  coffee: { name: string } | null;
  quantity_kg: number;
  days_delayed: number;
}

interface Preferences {
  enabled: boolean;
  days_threshold: number;
  email_enabled: boolean;
  push_enabled: boolean;
  sound_enabled: boolean;
  check_interval_hours: number;
}

export const useDelayedShipmentAlerts = () => {
  const { user } = useAuth();
  const { showNotification, isGranted } = usePushNotifications();
  const { playNotificationSound } = useNotificationSound();
  const notifiedOrdersRef = useRef<Set<string>>(new Set());
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [preferences, setPreferences] = useState<Preferences>({
    enabled: true,
    days_threshold: 1,
    email_enabled: true,
    push_enabled: true,
    sound_enabled: true,
    check_interval_hours: 6,
  });

  // Fetch user preferences
  useEffect(() => {
    if (!user) return;

    const fetchPreferences = async () => {
      const { data } = await supabase
        .from('delayed_shipment_alert_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setPreferences({
          enabled: data.enabled,
          days_threshold: data.days_threshold,
          email_enabled: data.email_enabled,
          push_enabled: data.push_enabled,
          sound_enabled: data.sound_enabled,
          check_interval_hours: data.check_interval_hours,
        });
      }
    };

    fetchPreferences();
  }, [user]);

  const sendPushNotification = useCallback(async (title: string, body: string) => {
    if (isGranted && preferences.push_enabled) {
      await showNotification(title, { body, tag: 'delayed-shipment' });
    }
  }, [isGranted, showNotification, preferences.push_enabled]);

  const sendEmailNotification = useCallback(async (order: DelayedOrder, userEmail: string) => {
    if (!preferences.email_enabled) return;

    try {
      const response = await supabase.functions.invoke('notify-delayed-shipment', {
        body: {
          userId: user?.id,
          userEmail,
          orderId: order.id,
          supplierName: order.supplier?.name || 'مورد غير معروف',
          coffeeName: order.coffee?.name || 'قهوة غير محددة',
          daysDelayed: order.days_delayed,
          expectedDelivery: order.expected_delivery,
          quantity: order.quantity_kg,
        },
      });

      if (response.error) {
        console.error('Error sending email notification:', response.error);
      } else {
        // Log the notification
        await supabase.from('delayed_shipment_logs').insert({
          user_id: user?.id,
          order_id: order.id,
          supplier_id: order.supplier_id,
          days_delayed: order.days_delayed,
          notification_channel: 'email',
          status: 'sent',
        });
      }
    } catch (error) {
      console.error('Error invoking email function:', error);
    }
  }, [user, preferences.email_enabled]);

  const notifySupplierAboutDelay = useCallback(async (order: DelayedOrder) => {
    try {
      // Get supplier user info
      const { data: supplierData } = await supabase
        .from('suppliers')
        .select('user_id, name')
        .eq('id', order.supplier_id)
        .single();

      if (!supplierData?.user_id) return;

      // Get supplier email
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', supplierData.user_id)
        .single();

      // Get supplier email from auth (we'll use the edge function to get it)
      const { data: userData } = await supabase.auth.getUser();
      const roasterName = userData?.user?.user_metadata?.full_name || 'محمصة';

      // Invoke edge function to notify supplier
      await supabase.functions.invoke('notify-supplier-delayed', {
        body: {
          orderId: order.id,
          supplierId: order.supplier_id,
          supplierEmail: '', // Edge function will get this from user_id
          supplierName: supplierData.name || 'المورد',
          coffeeName: order.coffee?.name || 'قهوة غير محددة',
          roasterName,
          daysDelayed: order.days_delayed,
          expectedDelivery: order.expected_delivery,
          quantity: order.quantity_kg,
        },
      });

      console.log('Supplier notified about delayed shipment');
    } catch (error) {
      console.error('Error notifying supplier:', error);
    }
  }, []);

  const checkDelayedShipments = useCallback(async () => {
    if (!user || !preferences.enabled) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data: delayedOrders, error } = await supabase
        .from('orders')
        .select(`
          id,
          expected_delivery,
          quantity_kg,
          supplier_id,
          supplier:suppliers(name),
          coffee:coffee_offerings(name)
        `)
        .eq('user_id', user.id)
        .neq('status', 'delivered')
        .neq('status', 'cancelled')
        .lt('expected_delivery', today)
        .order('expected_delivery', { ascending: true });

      if (error) {
        console.error('Error checking delayed shipments:', error);
        return;
      }

      if (!delayedOrders || delayedOrders.length === 0) return;

      // Get user email
      const { data: userData } = await supabase.auth.getUser();
      const userEmail = userData?.user?.email;

      // Process delayed orders
      for (const order of delayedOrders) {
        const expectedDate = new Date(order.expected_delivery);
        const todayDate = new Date();
        const daysDelayed = Math.floor((todayDate.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24));

        // Skip if delay is less than threshold
        if (daysDelayed < preferences.days_threshold) continue;

        // Skip if already notified in this session
        if (notifiedOrdersRef.current.has(order.id)) continue;

        const supplierName = order.supplier?.name || 'مورد غير معروف';
        const coffeeName = order.coffee?.name || 'قهوة غير محددة';

        const orderWithDelay: DelayedOrder = {
          ...order,
          days_delayed: daysDelayed,
          supplier: Array.isArray(order.supplier) ? order.supplier[0] : order.supplier,
          coffee: Array.isArray(order.coffee) ? order.coffee[0] : order.coffee,
        };

        // Play notification sound
        if (preferences.sound_enabled) {
          playNotificationSound();
        }

        // Show toast notification
        toast({
          title: '⚠️ تأخر في الشحنة',
          description: `طلب ${coffeeName} من ${supplierName} متأخر بـ ${daysDelayed} ${daysDelayed === 1 ? 'يوم' : 'أيام'}`,
          variant: 'destructive',
          duration: 10000,
        });

        // Send push notification
        await sendPushNotification(
          'تأخر في الشحنة',
          `طلب ${coffeeName} من ${supplierName} متأخر بـ ${daysDelayed} ${daysDelayed === 1 ? 'يوم' : 'أيام'}`
        );

        // Send email notification to roaster
        if (userEmail) {
          await sendEmailNotification(orderWithDelay, userEmail);
        }

        // Notify supplier about the delay
        await notifySupplierAboutDelay(orderWithDelay);

        // Log toast/push notification
        await supabase.from('delayed_shipment_logs').insert({
          user_id: user.id,
          order_id: order.id,
          supplier_id: order.supplier_id,
          days_delayed: daysDelayed,
          notification_channel: 'toast',
          status: 'sent',
        });

        // Mark as notified
        notifiedOrdersRef.current.add(order.id);
      }
    } catch (error) {
      console.error('Error in delayed shipment check:', error);
    }
  }, [user, preferences, playNotificationSound, sendPushNotification, sendEmailNotification, notifySupplierAboutDelay]);

  useEffect(() => {
    if (!user || !preferences.enabled) return;

    // Initial check
    checkDelayedShipments();

    // Set up periodic check based on user preference
    const intervalMs = preferences.check_interval_hours * 60 * 60 * 1000;
    checkIntervalRef.current = setInterval(checkDelayedShipments, intervalMs);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [user, preferences.enabled, preferences.check_interval_hours, checkDelayedShipments]);

  return {
    checkDelayedShipments,
    clearNotifiedOrders: () => notifiedOrdersRef.current.clear(),
    preferences,
  };
};
