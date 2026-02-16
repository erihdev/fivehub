import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export const useCoffeeRealtimeNotifications = () => {
  const { user } = useAuth();
  const { showNotification, isGranted } = usePushNotifications();

  const sendPushNotification = useCallback(async (
    title: string,
    body: string,
    url: string = '/',
    tag: string = 'coffee'
  ) => {
    if (isGranted) {
      await showNotification(title, { body, url, tag });
    }
  }, [isGranted, showNotification]);

  useEffect(() => {
    // Coffee changes channel
    const coffeeChannel = supabase
      .channel('coffee-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'coffee_offerings'
        },
        (payload) => {
          console.log('New coffee added:', payload);
          const newCoffee = payload.new as { name: string };
          const title = 'قهوة جديدة';
          const body = `تم إضافة "${newCoffee.name}" إلى القائمة`;
          
          toast({ title, description: body });
          sendPushNotification(title, body, '/suppliers', 'coffee-new');
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'coffee_offerings'
        },
        (payload) => {
          console.log('Coffee updated:', payload);
          const oldCoffee = payload.old as { price?: number };
          const updatedCoffee = payload.new as { name: string; price?: number };
          
          // Check if price changed
          if (oldCoffee.price !== updatedCoffee.price) {
            const title = 'تغيير في السعر';
            const body = `تم تعديل سعر "${updatedCoffee.name}"`;
            
            toast({ title, description: body });
            sendPushNotification(title, body, '/price-alerts', 'price-change');
          } else {
            toast({
              title: 'تم التحديث',
              description: `تم تعديل بيانات "${updatedCoffee.name}"`,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'coffee_offerings'
        },
        (payload) => {
          console.log('Coffee deleted:', payload);
          toast({
            title: 'تم الحذف',
            description: 'تم حذف قهوة من القائمة',
            variant: 'destructive',
          });
        }
      )
      .subscribe();

    // Messages channel - only if user is logged in
    let messagesChannel: ReturnType<typeof supabase.channel> | null = null;
    
    if (user) {
      messagesChannel = supabase
        .channel('messages-notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `receiver_id=eq.${user.id}`
          },
          (payload) => {
            console.log('New message received:', payload);
            const message = payload.new as { subject: string; sender_id: string };
            const title = 'رسالة جديدة';
            const body = message.subject || 'لديك رسالة جديدة';
            
            toast({ title, description: body });
            sendPushNotification(title, body, '/messages', 'message-new');
          }
        )
        .subscribe();
    }

    return () => {
      supabase.removeChannel(coffeeChannel);
      if (messagesChannel) {
        supabase.removeChannel(messagesChannel);
      }
    };
  }, [user, sendPushNotification]);
};
