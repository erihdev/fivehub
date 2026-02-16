import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useLanguage } from "@/hooks/useLanguage";

interface CafeInventoryItem {
  id: string;
  product_name: string;
  quantity_kg: number;
  min_quantity_kg: number | null;
  min_alert_quantity_kg: number | null;
  warning_quantity_kg: number | null;
}

type StockStatus = 'healthy' | 'warning' | 'critical';

export const useCafeInventoryAlerts = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { playNotificationSound } = useNotificationSound();
  const { showNotification, permission } = usePushNotifications();
  const { language } = useLanguage();

  const isArabic = language === 'ar';

  const getStockStatus = (item: CafeInventoryItem): StockStatus => {
    const remaining = item.quantity_kg || 0;
    const minAlert = item.min_alert_quantity_kg || item.min_quantity_kg || 5;
    const warning = item.warning_quantity_kg || 10;

    if (remaining <= minAlert) return 'critical';
    if (remaining <= warning) return 'warning';
    return 'healthy';
  };

  const checkInventory = useCallback(async () => {
    if (!user) return;

    try {
      const { data: items, error } = await supabase
        .from('cafe_inventory')
        .select('id, product_name, quantity_kg, min_quantity_kg, min_alert_quantity_kg, warning_quantity_kg')
        .eq('cafe_id', user.id);

      if (error || !items) return;

      const criticalItems = items.filter(i => getStockStatus(i) === 'critical');
      const warningItems = items.filter(i => getStockStatus(i) === 'warning');

      if (criticalItems.length > 0) {
        playNotificationSound();

        const title = isArabic ? 'تنبيه مخزون حرج!' : 'Critical Stock Alert!';
        const body = isArabic
          ? `${criticalItems.length} منتج بحاجة لإعادة طلب فوري`
          : `${criticalItems.length} items need immediate reorder`;

        toast({
          title,
          description: body,
          variant: 'destructive',
          duration: 10000,
        });

        if (permission === 'granted') {
          await showNotification(title, {
            body,
            tag: 'cafe-critical-stock',
            url: '/cafe-dashboard'
          });
        }
      } else if (warningItems.length > 0) {
        const title = isArabic ? 'تحذير مخزون' : 'Stock Warning';
        const body = isArabic
          ? `${warningItems.length} منتج مخزونه منخفض`
          : `${warningItems.length} items have low stock`;

        toast({
          title,
          description: body,
          duration: 8000,
        });

        if (permission === 'granted') {
          await showNotification(title, {
            body,
            tag: 'cafe-warning-stock',
            url: '/cafe-dashboard'
          });
        }
      }
    } catch (error) {
      console.error('Error checking cafe inventory:', error);
    }
  }, [user, toast, playNotificationSound, showNotification, permission, isArabic]);

  useEffect(() => {
    if (!user) return;

    // Initial check
    checkInventory();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('cafe-inventory-alerts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cafe_inventory',
        },
        () => checkInventory()
      )
      .subscribe();

    // Periodic check every 5 minutes
    const interval = setInterval(checkInventory, 5 * 60 * 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [user, checkInventory]);
};
