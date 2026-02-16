import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { playGlobalNotificationSound } from '@/hooks/useNotificationSound';

interface SupplierOffer {
  id: string;
  title: string;
  description: string | null;
  discount_percentage: number | null;
  discount_amount: number | null;
  supplier_id: string;
  is_active: boolean;
}

export const useSupplierOffersNotifications = () => {
  const { user } = useAuth();
  const { showNotification, isGranted } = usePushNotifications();

  const sendPushNotification = useCallback(async (
    title: string,
    body: string,
    url: string = '/roaster-dashboard',
    tag: string = 'offer'
  ) => {
    if (isGranted) {
      await showNotification(title, { body, url, tag });
    }
  }, [isGranted, showNotification]);

  const getSupplierName = useCallback(async (supplierId: string): Promise<string> => {
    try {
      const { data } = await supabase
        .from('suppliers')
        .select('name')
        .eq('id', supplierId)
        .single();
      return data?.name || 'مورد';
    } catch {
      return 'مورد';
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    const offersChannel = supabase
      .channel('supplier-offers-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'supplier_offers'
        },
        async (payload) => {
          console.log('New supplier offer:', payload);
          const offer = payload.new as SupplierOffer;
          
          if (!offer.is_active) return;
          
          const supplierName = await getSupplierName(offer.supplier_id);
          
          let discountText = '';
          if (offer.discount_percentage) {
            discountText = `خصم ${offer.discount_percentage}%`;
          } else if (offer.discount_amount) {
            discountText = `خصم ${offer.discount_amount} ريال`;
          }
          
          const title = '🎉 عرض جديد من مورد';
          const body = `${supplierName}: ${offer.title}${discountText ? ` - ${discountText}` : ''}`;
          
          toast({
            title,
            description: body,
            duration: 8000,
          });
          
          // Play notification sound for new offers
          playGlobalNotificationSound();
          
          sendPushNotification(title, body, '/roaster-dashboard', 'offer-new');
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'supplier_offers'
        },
        async (payload) => {
          console.log('Supplier offer updated:', payload);
          const oldOffer = payload.old as SupplierOffer;
          const newOffer = payload.new as SupplierOffer;
          
          // Only notify if offer became active or discount changed
          if (!oldOffer.is_active && newOffer.is_active) {
            const supplierName = await getSupplierName(newOffer.supplier_id);
            const title = '📢 عرض متاح الآن';
            const body = `${supplierName}: ${newOffer.title}`;
            
            toast({
              title,
              description: body,
              duration: 6000,
            });
            
            sendPushNotification(title, body, '/roaster-dashboard', 'offer-activated');
          } else if (
            (oldOffer.discount_percentage !== newOffer.discount_percentage) ||
            (oldOffer.discount_amount !== newOffer.discount_amount)
          ) {
            const supplierName = await getSupplierName(newOffer.supplier_id);
            let discountText = '';
            if (newOffer.discount_percentage) {
              discountText = `خصم ${newOffer.discount_percentage}%`;
            } else if (newOffer.discount_amount) {
              discountText = `خصم ${newOffer.discount_amount} ريال`;
            }
            
            const title = '✨ تحديث على عرض';
            const body = `${supplierName}: ${newOffer.title}${discountText ? ` - ${discountText}` : ''}`;
            
            toast({
              title,
              description: body,
              duration: 6000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(offersChannel);
    };
  }, [user, sendPushNotification, getSupplierName]);
};
