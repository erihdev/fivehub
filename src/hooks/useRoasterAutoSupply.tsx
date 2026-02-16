import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useLanguage } from '@/hooks/useLanguage';
import { format } from 'date-fns';

interface AutoSupplySettings {
  id: string;
  user_id: string;
  coffee_id: string;
  supplier_id: string;
  min_quantity_kg: number;
  auto_order_quantity_kg: number;
  enabled: boolean;
  last_auto_order_at: string | null;
  coffee_offerings: {
    name: string;
    price: number | null;
    unit_type: string | null;
    kg_per_bag: number | null;
  } | null;
  suppliers: {
    name: string;
  } | null;
}

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
    unit_type: string | null;
    kg_per_bag: number | null;
  } | null;
}

export const useRoasterAutoSupply = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { showNotification, isGranted } = usePushNotifications();
  const autoOrderedItems = useRef<Set<string>>(new Set());
  const notifiedItems = useRef<Set<string>>(new Set());
  const isArabic = language === 'ar';

  const createAutoOrder = useCallback(async (item: InventoryItem) => {
    if (!user || !item.coffee_offerings) return;
    
    // Prevent duplicate auto-orders in the same session
    if (autoOrderedItems.current.has(item.id)) return;
    
    // Check if auto-ordered recently (within 24 hours)
    if (item.last_auto_reorder_at) {
      const lastOrder = new Date(item.last_auto_reorder_at);
      const hoursSinceOrder = (Date.now() - lastOrder.getTime()) / (1000 * 60 * 60);
      if (hoursSinceOrder < 24) return;
    }

    autoOrderedItems.current.add(item.id);

    const quantity = item.auto_reorder_quantity;
    const pricePerKg = item.coffee_offerings.price || null;
    const totalPrice = pricePerKg ? quantity * pricePerKg : null;
    const coffeeName = item.coffee_offerings.name;
    const unitType = item.coffee_offerings.unit_type || 'kg';
    const kgPerBag = item.coffee_offerings.kg_per_bag;

    // Calculate actual quantity based on unit type
    let orderQuantity = quantity;
    let orderNote = '';
    
    if (unitType === 'bag' && kgPerBag) {
      const bags = Math.ceil(quantity / kgPerBag);
      orderQuantity = bags * kgPerBag;
      orderNote = isArabic 
        ? `إعادة طلب تلقائي - ${bags} خيشة (${orderQuantity} كجم) - المخزون: ${item.quantity_kg} كجم`
        : `Auto-reorder - ${bags} bags (${orderQuantity} kg) - Stock: ${item.quantity_kg} kg`;
    } else {
      orderNote = isArabic 
        ? `إعادة طلب تلقائي - ${orderQuantity} كجم - المخزون: ${item.quantity_kg} كجم`
        : `Auto-reorder - ${orderQuantity} kg - Stock: ${item.quantity_kg} kg`;
    }

    const { error } = await supabase.from('orders').insert({
      user_id: user.id,
      supplier_id: item.coffee_offerings.supplier_id,
      coffee_id: item.coffee_id,
      quantity_kg: orderQuantity,
      price_per_kg: pricePerKg,
      total_price: pricePerKg ? orderQuantity * pricePerKg : null,
      order_date: format(new Date(), 'yyyy-MM-dd'),
      notes: orderNote,
    });

    if (!error) {
      // Update last auto reorder timestamp
      await supabase
        .from('inventory')
        .update({ last_auto_reorder_at: new Date().toISOString() })
        .eq('id', item.id);

      const quantityDisplay = unitType === 'bag' && kgPerBag 
        ? `${Math.ceil(quantity / kgPerBag)} ${isArabic ? 'خيشة' : 'bags'}`
        : `${orderQuantity} ${isArabic ? 'كجم' : 'kg'}`;
      
      toast({
        title: isArabic ? '🔄 إعادة طلب تلقائي' : '🔄 Auto-Reorder',
        description: isArabic 
          ? `تم إنشاء طلب ${quantityDisplay} من ${coffeeName}`
          : `Created order for ${quantityDisplay} of ${coffeeName}`,
      });

      if (isGranted) {
        showNotification(
          isArabic ? 'إعادة طلب تلقائي' : 'Auto-Reorder Created',
          {
            body: isArabic 
              ? `تم إنشاء طلب ${quantityDisplay} من ${coffeeName}`
              : `Created order for ${quantityDisplay} of ${coffeeName}`,
            url: '/buyer-orders',
            tag: `auto-order-${item.id}`,
          }
        );
      }
    } else {
      console.error('Auto-order failed:', error);
      autoOrderedItems.current.delete(item.id);
    }
  }, [user, isArabic, isGranted, showNotification]);

  const checkInventoryAndAutoOrder = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('inventory')
        .select(`
          id,
          coffee_id,
          quantity_kg,
          min_quantity_kg,
          auto_reorder_enabled,
          auto_reorder_quantity,
          last_auto_reorder_at,
          coffee_offerings (name, supplier_id, price, unit_type, kg_per_bag)
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error checking roaster inventory:', error);
        return;
      }

      const inventoryItems = data as unknown as InventoryItem[] || [];

      // Find items that need reordering
      const lowStockItems = inventoryItems.filter(
        item => item.quantity_kg <= item.min_quantity_kg
      );

      // Notify for low stock items
      lowStockItems.forEach(item => {
        const notifyKey = `low-${item.id}`;
        if (!notifiedItems.current.has(notifyKey)) {
          notifiedItems.current.add(notifyKey);
          const coffeeName = item.coffee_offerings?.name || (isArabic ? 'قهوة' : 'Coffee');
          
          if (!item.auto_reorder_enabled) {
            toast({
              title: isArabic ? '⚠️ تنبيه: مخزون منخفض' : '⚠️ Alert: Low Stock',
              description: isArabic 
                ? `${coffeeName} - الكمية المتبقية: ${item.quantity_kg} كجم`
                : `${coffeeName} - Remaining: ${item.quantity_kg} kg`,
              variant: 'destructive',
            });
          }
        }
      });

      // Process auto-reorder for enabled items
      const autoReorderItems = lowStockItems.filter(item => item.auto_reorder_enabled);

      for (const item of autoReorderItems) {
        await createAutoOrder(item);
      }

      return { 
        lowStockCount: lowStockItems.length,
        autoReorderCount: autoReorderItems.length 
      };
    } catch (error) {
      console.error('Error in checkInventoryAndAutoOrder:', error);
    }
  }, [user, isArabic, createAutoOrder]);

  useEffect(() => {
    if (!user) return;

    // Initial check
    checkInventoryAndAutoOrder();

    // Subscribe to inventory changes
    const channel = supabase
      .channel('roaster-auto-supply')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Roaster inventory change:', payload);
          
          if (payload.eventType === 'UPDATE') {
            const item = payload.new as { id: string; quantity_kg: number; min_quantity_kg: number };
            // If quantity was replenished, clear notification status
            if (item.quantity_kg > item.min_quantity_kg) {
              notifiedItems.current.delete(`low-${item.id}`);
              autoOrderedItems.current.delete(item.id);
            }
          }
          
          checkInventoryAndAutoOrder();
        }
      )
      .subscribe();

    // Periodic check every 5 minutes
    const intervalId = setInterval(checkInventoryAndAutoOrder, 5 * 60 * 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(intervalId);
    };
  }, [user, checkInventoryAndAutoOrder]);

  return { checkInventoryAndAutoOrder };
};
