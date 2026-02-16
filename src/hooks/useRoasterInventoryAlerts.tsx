import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useLanguage } from "@/hooks/useLanguage";

interface RoastedProduct {
  id: string;
  name: string;
  total_quantity_kg: number | null;
  sold_quantity_kg: number | null;
  min_alert_quantity_kg: number | null;
  warning_quantity_kg: number | null;
}

type StockStatus = 'healthy' | 'warning' | 'critical';

export const useRoasterInventoryAlerts = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { playNotificationSound } = useNotificationSound();
  const { showNotification, permission } = usePushNotifications();
  const { language } = useLanguage();

  const isArabic = language === 'ar';

  const getStockStatus = (product: RoastedProduct): StockStatus => {
    const total = product.total_quantity_kg || 0;
    const sold = product.sold_quantity_kg || 0;
    const remaining = total - sold;
    const minAlert = product.min_alert_quantity_kg || 10;
    const warning = product.warning_quantity_kg || 20;

    if (remaining <= minAlert) return 'critical';
    if (remaining <= warning) return 'warning';
    return 'healthy';
  };

  const checkInventory = useCallback(async () => {
    if (!user) return;

    try {
      const { data: products, error } = await supabase
        .from('roasted_coffee_products')
        .select('id, name, total_quantity_kg, sold_quantity_kg, min_alert_quantity_kg, warning_quantity_kg')
        .eq('roaster_id', user.id);

      if (error || !products) return;

      const criticalProducts = products.filter(p => getStockStatus(p) === 'critical');
      const warningProducts = products.filter(p => getStockStatus(p) === 'warning');

      if (criticalProducts.length > 0) {
        playNotificationSound();

        const title = isArabic ? 'تنبيه مخزون حرج!' : 'Critical Stock Alert!';
        const body = isArabic
          ? `${criticalProducts.length} منتج بحاجة لإعادة تخزين فوري`
          : `${criticalProducts.length} products need immediate restocking`;

        toast({
          title,
          description: body,
          variant: 'destructive',
          duration: 10000,
        });

        if (permission === 'granted') {
          await showNotification(title, {
            body,
            tag: 'roaster-critical-stock',
            url: '/roaster-dashboard'
          });
        }
      } else if (warningProducts.length > 0) {
        const title = isArabic ? 'تحذير مخزون' : 'Stock Warning';
        const body = isArabic
          ? `${warningProducts.length} منتج مخزونه منخفض`
          : `${warningProducts.length} products have low stock`;

        toast({
          title,
          description: body,
          duration: 8000,
        });

        if (permission === 'granted') {
          await showNotification(title, {
            body,
            tag: 'roaster-warning-stock',
            url: '/roaster-dashboard'
          });
        }
      }
    } catch (error) {
      console.error('Error checking roaster inventory:', error);
    }
  }, [user, toast, playNotificationSound, showNotification, permission, isArabic]);

  useEffect(() => {
    if (!user) return;

    // Initial check
    checkInventory();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('roaster-inventory-alerts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'roasted_coffee_products',
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
