import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { usePredictionVerification } from '@/hooks/usePredictionVerification';
import { format } from 'date-fns';

interface InventoryItem {
  id: string;
  coffee_id: string;
  quantity_kg: number;
  min_quantity_kg: number;
  auto_reorder_enabled: boolean;
  auto_reorder_quantity: number;
  last_auto_reorder_at: string | null;
  coffee_offerings: {
    name: string;
    supplier_id: string;
    price: number | null;
  } | null;
}

export const useInventoryAlerts = () => {
  const { user } = useAuth();
  const { showNotification, isGranted } = usePushNotifications();
  const { verifyPredictions } = usePredictionVerification();
  const notifiedItems = useRef<Set<string>>(new Set());
  const autoReorderedItems = useRef<Set<string>>(new Set());

  const createAutoReorder = useCallback(async (item: InventoryItem) => {
    if (!user || !item.coffee_offerings) return;
    
    // Prevent duplicate auto-reorders in the same session
    if (autoReorderedItems.current.has(item.id)) return;
    
    // Check if auto-reordered recently (within 24 hours)
    if (item.last_auto_reorder_at) {
      const lastReorder = new Date(item.last_auto_reorder_at);
      const hoursSinceReorder = (Date.now() - lastReorder.getTime()) / (1000 * 60 * 60);
      if (hoursSinceReorder < 24) return;
    }

    autoReorderedItems.current.add(item.id);

    const quantity = item.auto_reorder_quantity;
    const pricePerKg = item.coffee_offerings.price || null;
    const totalPrice = pricePerKg ? quantity * pricePerKg : null;

    const { error } = await supabase.from("orders").insert({
      user_id: user.id,
      supplier_id: item.coffee_offerings.supplier_id,
      coffee_id: item.coffee_id,
      quantity_kg: quantity,
      price_per_kg: pricePerKg,
      total_price: totalPrice,
      order_date: format(new Date(), "yyyy-MM-dd"),
      notes: `إعادة طلب تلقائي - المخزون: ${item.quantity_kg} كجم، الحد الأدنى: ${item.min_quantity_kg} كجم`,
    });

    if (!error) {
      // Update last auto reorder timestamp
      await supabase
        .from("inventory")
        .update({ last_auto_reorder_at: new Date().toISOString() })
        .eq("id", item.id);

      const coffeeName = item.coffee_offerings.name || 'قهوة';
      
      toast({
        title: '🔄 إعادة طلب تلقائي',
        description: `تم إنشاء طلب ${quantity} كجم من ${coffeeName}`,
      });

      if (isGranted) {
        showNotification('إعادة طلب تلقائي', {
          body: `تم إنشاء طلب ${quantity} كجم من ${coffeeName}`,
          url: '/orders',
          tag: `auto-reorder-${item.id}`,
        });
      }
    } else {
      console.error("Auto-reorder failed:", error);
      autoReorderedItems.current.delete(item.id);
    }
  }, [user, isGranted, showNotification]);

  const checkLowStock = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("inventory")
        .select(`
          id,
          coffee_id,
          quantity_kg,
          min_quantity_kg,
          auto_reorder_enabled,
          auto_reorder_quantity,
          last_auto_reorder_at,
          coffee_offerings (name, supplier_id, price)
        `)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error checking inventory:", error);
        return;
      }

      const inventoryItems = data as unknown as InventoryItem[] || [];

      const lowStockItems = inventoryItems.filter(
        item => item.quantity_kg <= item.min_quantity_kg && item.quantity_kg > 0
      );

      const outOfStockItems = inventoryItems.filter(
        item => item.quantity_kg === 0
      );

      // Process auto-reorder for enabled items
      const autoReorderItems = [...lowStockItems, ...outOfStockItems].filter(
        item => item.auto_reorder_enabled
      );

      for (const item of autoReorderItems) {
        await createAutoReorder(item);
      }

      // Notify for low stock items that haven't been notified yet
      lowStockItems.forEach(item => {
        const notifyKey = `low-${item.id}`;
        if (!notifiedItems.current.has(notifyKey)) {
          notifiedItems.current.add(notifyKey);
          const coffeeName = item.coffee_offerings?.name || 'قهوة';
          
          toast({
            title: '⚠️ تنبيه: مخزون منخفض',
            description: `${coffeeName} - الكمية المتبقية: ${item.quantity_kg} كجم`,
            variant: 'destructive',
          });

          if (isGranted) {
            showNotification('تنبيه: مخزون منخفض', {
              body: `${coffeeName} - الكمية المتبقية: ${item.quantity_kg} كجم`,
              url: '/inventory',
              tag: `inventory-low-${item.id}`,
            });
          }
        }
      });

      // Notify for out of stock items
      outOfStockItems.forEach(item => {
        const notifyKey = `out-${item.id}`;
        if (!notifiedItems.current.has(notifyKey)) {
          notifiedItems.current.add(notifyKey);
          const coffeeName = item.coffee_offerings?.name || 'قهوة';
          
          toast({
            title: '🚨 تنبيه: نفاد المخزون',
            description: `${coffeeName} - نفد من المخزون!`,
            variant: 'destructive',
          });

          if (isGranted) {
            showNotification('تنبيه: نفاد المخزون!', {
              body: `${coffeeName} - نفد من المخزون! يرجى إعادة الطلب`,
              url: '/inventory',
              tag: `inventory-out-${item.id}`,
            });
          }
        }
      });

      return { lowStockItems, outOfStockItems };
    } catch (error) {
      console.error("Error in checkLowStock:", error);
    }
  }, [user, isGranted, showNotification, createAutoReorder]);

  useEffect(() => {
    if (!user) return;

    // Initial check
    checkLowStock();

    // Subscribe to real-time inventory changes
    const channel = supabase
      .channel('inventory-alerts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          console.log('Inventory change detected:', payload);
          
          // Clear notification status for updated item to allow re-notification
          if (payload.eventType === 'UPDATE') {
            const item = payload.new as { id: string; coffee_id: string; quantity_kg: number; min_quantity_kg: number };
            // If quantity was replenished, remove from notified set
            if (item.quantity_kg > item.min_quantity_kg) {
              notifiedItems.current.delete(`low-${item.id}`);
              notifiedItems.current.delete(`out-${item.id}`);
              autoReorderedItems.current.delete(item.id);
            }
            
            // Verify predictions when inventory is updated
            await verifyPredictions(item.coffee_id, item.quantity_kg);
          }
          
          // Check for low stock after any change
          checkLowStock();
        }
      )
      .subscribe();

    // Periodic check every 5 minutes
    const intervalId = setInterval(checkLowStock, 5 * 60 * 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(intervalId);
    };
  }, [user, checkLowStock]);

  return { checkLowStock };
};
