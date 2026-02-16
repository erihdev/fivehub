import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

type NotificationPermissionState = 'default' | 'denied' | 'granted' | 'unsupported';

export const usePushNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermissionState>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if push notifications are supported
    const supported = 'Notification' in window && 'serviceWorker' in navigator;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission as NotificationPermissionState);
    } else {
      setPermission('unsupported');
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      toast({
        title: 'غير مدعوم',
        description: 'متصفحك لا يدعم الإشعارات',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result as NotificationPermissionState);
      
      if (result === 'granted') {
        toast({
          title: 'تم التفعيل',
          description: 'تم تفعيل إشعارات المتصفح بنجاح',
        });
        return true;
      } else if (result === 'denied') {
        toast({
          title: 'تم الرفض',
          description: 'تم رفض إذن الإشعارات. يمكنك تغيير هذا من إعدادات المتصفح.',
          variant: 'destructive',
        });
        return false;
      }
      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء طلب إذن الإشعارات',
        variant: 'destructive',
      });
      return false;
    }
  }, [isSupported]);

  const showNotification = useCallback(async (
    title: string,
    options?: {
      body?: string;
      tag?: string;
      url?: string;
      icon?: string;
    }
  ) => {
    if (!isSupported || permission !== 'granted') {
      console.log('Push notifications not available or not granted');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      const notificationOptions: NotificationOptions & { vibrate?: number[] } = {
        body: options?.body,
        icon: options?.icon || '/favicon.ico',
        badge: '/favicon.ico',
        tag: options?.tag || 'default',
        data: { url: options?.url || '/' },
        requireInteraction: true,
        dir: 'rtl',
        lang: 'ar',
      };

      // vibrate is supported in some browsers
      if ('vibrate' in navigator) {
        (notificationOptions as any).vibrate = [200, 100, 200];
      }

      await registration.showNotification(title, notificationOptions);
      
      return true;
    } catch (error) {
      console.error('Error showing notification:', error);
      return false;
    }
  }, [isSupported, permission]);

  return {
    permission,
    isSupported,
    isGranted: permission === 'granted',
    requestPermission,
    showNotification,
  };
};
