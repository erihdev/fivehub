import { useEffect, useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from '@/hooks/use-toast';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { playGlobalNotificationSound } from '@/hooks/useNotificationSound';

interface FavoriteOfferWithExpiry {
  offer_id: string;
  offer: {
    id: string;
    title: string;
    valid_until: string | null;
    is_active: boolean;
    supplier: {
      name: string;
    } | null;
  } | null;
}

interface ExpiryAlertPreferences {
  enabled: boolean;
  days_before: number;
  push_enabled: boolean;
  sound_enabled: boolean;
}

export const useFavoriteOfferExpiryAlerts = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { showNotification, isGranted } = usePushNotifications();
  const notifiedOffers = useRef<Set<string>>(new Set());
  const [preferences, setPreferences] = useState<ExpiryAlertPreferences>({
    enabled: true,
    days_before: 3,
    push_enabled: true,
    sound_enabled: true,
  });

  // Fetch user preferences
  useEffect(() => {
    if (!user) return;

    const fetchPreferences = async () => {
      const { data, error } = await supabase
        .from('offer_expiry_alert_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data) {
        setPreferences({
          enabled: data.enabled,
          days_before: data.days_before,
          push_enabled: data.push_enabled,
          sound_enabled: data.sound_enabled,
        });
      }
    };

    fetchPreferences();
  }, [user]);

  const checkExpiringOffers = useCallback(async () => {
    if (!user || !preferences.enabled) return;

    try {
      const { data, error } = await supabase
        .from('offer_favorites')
        .select(`
          offer_id,
          offer:supplier_offers(
            id,
            title,
            valid_until,
            is_active,
            supplier:suppliers(name)
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      const now = new Date();
      const alertDate = new Date(now.getTime() + preferences.days_before * 24 * 60 * 60 * 1000);

      (data || []).forEach((favorite) => {
        const offer = Array.isArray(favorite.offer) ? favorite.offer[0] : favorite.offer;
        
        if (!offer || !offer.valid_until || !offer.is_active) return;

        const expiryDate = new Date(offer.valid_until);
        const offerId = offer.id;

        // Skip if already notified
        if (notifiedOffers.current.has(offerId)) return;

        // Check if expiring within configured days
        if (expiryDate > now && expiryDate <= alertDate) {
          const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          const supplierName = Array.isArray(offer.supplier) ? offer.supplier[0]?.name : offer.supplier?.name;

          let title: string;
          let description: string;
          let variant: "default" | "destructive" = "default";

          if (daysRemaining <= 0) {
            title = language === 'ar' ? '🚨 عرض انتهى!' : '🚨 Offer Expired!';
            description = language === 'ar'
              ? `عرض "${offer.title}" من ${supplierName || 'مورد'} انتهى للتو`
              : `Offer "${offer.title}" from ${supplierName || 'Supplier'} just expired`;
            variant = "destructive";
          } else if (daysRemaining === 1) {
            title = language === 'ar' ? '⚠️ تذكير: عرض ينتهي غداً!' : '⚠️ Reminder: Offer Expires Tomorrow!';
            description = language === 'ar'
              ? `تذكير: عرض "${offer.title}" من ${supplierName || 'مورد'} ينتهي غداً - لا تفوت الفرصة!`
              : `Reminder: Offer "${offer.title}" from ${supplierName || 'Supplier'} expires tomorrow - don't miss out!`;
            variant = "destructive";
          } else if (daysRemaining <= 1) {
            title = language === 'ar' ? '⚠️ عرض ينتهي اليوم!' : '⚠️ Offer Expires Today!';
            description = language === 'ar'
              ? `عرض "${offer.title}" من ${supplierName || 'مورد'} ينتهي اليوم`
              : `Offer "${offer.title}" from ${supplierName || 'Supplier'} expires today`;
            variant = "destructive";
          } else {
            title = language === 'ar' ? '⏰ عرض مفضل ينتهي قريباً' : '⏰ Favorite Offer Expiring Soon';
            description = language === 'ar'
              ? `عرض "${offer.title}" من ${supplierName || 'مورد'} ينتهي خلال ${daysRemaining} أيام`
              : `Offer "${offer.title}" from ${supplierName || 'Supplier'} expires in ${daysRemaining} days`;
          }

          // Show toast notification
          toast({
            title,
            description,
            duration: 10000,
            variant,
          });

          // Play notification sound if enabled
          if (preferences.sound_enabled) {
            playGlobalNotificationSound();
          }

          // Send push notification if enabled
          if (isGranted && preferences.push_enabled) {
            showNotification(title, {
              body: description,
              url: `/offer/${offerId}`,
              tag: `offer-expiry-${offerId}`,
            });
          }

          // Save to notification logs
          supabase
            .from('offer_expiry_notifications')
            .insert({
              user_id: user.id,
              offer_id: offerId,
              offer_title: offer.title,
              supplier_name: supplierName || null,
              days_remaining: daysRemaining,
              notification_type: daysRemaining <= 0 ? 'expired' : daysRemaining === 1 ? 'tomorrow' : 'expiring_soon',
            })
            .then(({ error }) => {
              if (error) console.error('Error saving notification log:', error);
            });

          // Mark as notified
          notifiedOffers.current.add(offerId);
        }
      });
    } catch (error) {
      console.error('Error checking expiring offers:', error);
    }
  }, [user, language, isGranted, showNotification, preferences]);

  // Use ref to store the latest check function
  const checkExpiringOffersRef = useRef(checkExpiringOffers);
  checkExpiringOffersRef.current = checkExpiringOffers;

  useEffect(() => {
    if (!user) return;

    // Check immediately on mount (with delay to avoid blocking)
    const timeout = setTimeout(() => {
      checkExpiringOffersRef.current();
    }, 2000);

    // Check every hour
    const interval = setInterval(() => {
      checkExpiringOffersRef.current();
    }, 60 * 60 * 1000);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [user]);

  // Also check when new favorites are added via realtime
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('favorite-expiry-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'offer_favorites',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Check for expiring offers when a new favorite is added
          setTimeout(() => {
            checkExpiringOffersRef.current();
          }, 1000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);
};
