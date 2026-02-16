import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useLanguage } from '@/hooks/useLanguage';

interface CoffeeOffering {
  id: string;
  name: string;
  available: boolean | null;
  supplier_id: string;
  total_quantity_kg: number | null;
  sold_quantity_kg: number | null;
  min_alert_quantity_kg: number | null;
  warning_quantity_kg: number | null;
}

type StockStatus = 'healthy' | 'warning' | 'critical';

const getStockStatus = (coffee: CoffeeOffering): StockStatus => {
  const remaining = (coffee.total_quantity_kg || 0) - (coffee.sold_quantity_kg || 0);
  const minAlert = coffee.min_alert_quantity_kg || 10;
  const warningQty = coffee.warning_quantity_kg || 20;
  
  if (remaining <= minAlert) return 'critical';
  if (remaining <= warningQty) return 'warning';
  return 'healthy';
};

export const useSupplierInventoryAlerts = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { showNotification, isGranted } = usePushNotifications();
  const notifiedItems = useRef<Set<string>>(new Set());
  const isArabic = language === 'ar';

  const checkUnavailableProducts = useCallback(async () => {
    if (!user) return;

    try {
      // Get supplier ID for current user
      const { data: supplierData } = await supabase
        .from('suppliers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!supplierData) return;

      // Get all products with stock info
      const { data, error } = await supabase
        .from('coffee_offerings')
        .select('id, name, available, supplier_id, total_quantity_kg, sold_quantity_kg, min_alert_quantity_kg, warning_quantity_kg')
        .eq('supplier_id', supplierData.id);

      if (error) {
        console.error('Error checking supplier inventory:', error);
        return;
      }

      const products = data || [];
      
      // Check for critical and warning stock levels
      const criticalProducts = products.filter(p => getStockStatus(p) === 'critical');
      const warningProducts = products.filter(p => getStockStatus(p) === 'warning');

      // Notify for critical products
      criticalProducts.forEach(product => {
        const remaining = (product.total_quantity_kg || 0) - (product.sold_quantity_kg || 0);
        const notifyKey = `critical-${product.id}`;
        if (!notifiedItems.current.has(notifyKey)) {
          notifiedItems.current.add(notifyKey);
          
          toast({
            title: isArabic ? '🔴 تنبيه حرج: نفاد المخزون' : '🔴 Critical: Stock Depleted',
            description: isArabic 
              ? `${product.name} - المتبقي: ${remaining.toFixed(1)} كجم فقط!`
              : `${product.name} - Only ${remaining.toFixed(1)} kg remaining!`,
            variant: 'destructive',
          });

          if (isGranted) {
            showNotification(
              isArabic ? '🔴 نفاد المخزون' : '🔴 Stock Depleted',
              {
                body: isArabic 
                  ? `${product.name} - المتبقي: ${remaining.toFixed(1)} كجم`
                  : `${product.name} - ${remaining.toFixed(1)} kg remaining`,
                url: '/supplier-dashboard',
                tag: `supplier-critical-${product.id}`,
              }
            );
          }
        }
      });

      // Notify for warning products
      warningProducts.forEach(product => {
        const remaining = (product.total_quantity_kg || 0) - (product.sold_quantity_kg || 0);
        const notifyKey = `warning-${product.id}`;
        if (!notifiedItems.current.has(notifyKey)) {
          notifiedItems.current.add(notifyKey);
          
          toast({
            title: isArabic ? '🟡 تنبيه: مخزون منخفض' : '🟡 Warning: Low Stock',
            description: isArabic 
              ? `${product.name} - المتبقي: ${remaining.toFixed(1)} كجم`
              : `${product.name} - ${remaining.toFixed(1)} kg remaining`,
          });

          if (isGranted) {
            showNotification(
              isArabic ? '🟡 مخزون منخفض' : '🟡 Low Stock',
              {
                body: isArabic 
                  ? `${product.name} - المتبقي: ${remaining.toFixed(1)} كجم`
                  : `${product.name} - ${remaining.toFixed(1)} kg remaining`,
                url: '/supplier-dashboard',
                tag: `supplier-warning-${product.id}`,
              }
            );
          }
        }
      });

      return { criticalCount: criticalProducts.length, warningCount: warningProducts.length };
    } catch (error) {
      console.error('Error in checkUnavailableProducts:', error);
    }
  }, [user, isArabic, isGranted, showNotification]);

  useEffect(() => {
    if (!user) return;

    // Initial check
    checkUnavailableProducts();

    // Get supplier ID and subscribe to changes
    const setupSubscription = async () => {
      const { data: supplierData } = await supabase
        .from('suppliers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!supplierData) return;

      const channel = supabase
        .channel('supplier-inventory-alerts')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'coffee_offerings',
            filter: `supplier_id=eq.${supplierData.id}`,
          },
          (payload) => {
            console.log('Supplier inventory change:', payload);
            
            if (payload.eventType === 'UPDATE') {
              const product = payload.new as CoffeeOffering;
              const status = getStockStatus(product);
              // If product stock is healthy now, remove from notified set
              if (status === 'healthy') {
                notifiedItems.current.delete(`critical-${product.id}`);
                notifiedItems.current.delete(`warning-${product.id}`);
              }
            }
            
            checkUnavailableProducts();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupSubscription();

    // Periodic check every 10 minutes
    const intervalId = setInterval(checkUnavailableProducts, 10 * 60 * 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [user, checkUnavailableProducts]);

  return { checkUnavailableProducts };
};
