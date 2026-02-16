import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/useLanguage';

export interface PriceAlert {
  id: string;
  user_id: string;
  coffee_id: string;
  target_price: number;
  alert_type: 'below' | 'above' | 'any_change';
  is_active: boolean;
  last_notified_at: string | null;
  created_at: string;
  updated_at: string;
  coffee?: {
    name: string;
    origin: string | null;
    price: number | null;
    supplier: {
      name: string;
    } | null;
  };
}

export function usePriceAlerts() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    if (!user) {
      setAlerts([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('price_alerts')
        .select(`
          *,
          coffee:coffee_offerings(
            name,
            origin,
            price,
            supplier:suppliers(name)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlerts((data || []) as PriceAlert[]);
    } catch (error) {
      console.error('Error fetching price alerts:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const createAlert = async (
    coffeeId: string,
    targetPrice: number,
    alertType: 'below' | 'above' | 'any_change'
  ) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('price_alerts')
        .insert({
          user_id: user.id,
          coffee_id: coffeeId,
          target_price: targetPrice,
          alert_type: alertType
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: language === 'ar' ? 'تم إنشاء التنبيه' : 'Alert Created',
        description: language === 'ar' 
          ? 'سيتم إعلامك عند تغير السعر' 
          : 'You will be notified when the price changes'
      });

      await fetchAlerts();
      return data;
    } catch (error) {
      console.error('Error creating price alert:', error);
      toast({
        variant: 'destructive',
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' 
          ? 'فشل في إنشاء التنبيه' 
          : 'Failed to create alert'
      });
      return null;
    }
  };

  const updateAlert = async (alertId: string, updates: Partial<PriceAlert>) => {
    try {
      const { error } = await supabase
        .from('price_alerts')
        .update(updates)
        .eq('id', alertId);

      if (error) throw error;

      toast({
        title: language === 'ar' ? 'تم التحديث' : 'Updated',
        description: language === 'ar' 
          ? 'تم تحديث التنبيه بنجاح' 
          : 'Alert updated successfully'
      });

      await fetchAlerts();
    } catch (error) {
      console.error('Error updating price alert:', error);
      toast({
        variant: 'destructive',
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' 
          ? 'فشل في تحديث التنبيه' 
          : 'Failed to update alert'
      });
    }
  };

  const deleteAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('price_alerts')
        .delete()
        .eq('id', alertId);

      if (error) throw error;

      toast({
        title: language === 'ar' ? 'تم الحذف' : 'Deleted',
        description: language === 'ar' 
          ? 'تم حذف التنبيه بنجاح' 
          : 'Alert deleted successfully'
      });

      await fetchAlerts();
    } catch (error) {
      console.error('Error deleting price alert:', error);
      toast({
        variant: 'destructive',
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' 
          ? 'فشل في حذف التنبيه' 
          : 'Failed to delete alert'
      });
    }
  };

  const toggleAlert = async (alertId: string, isActive: boolean) => {
    await updateAlert(alertId, { is_active: isActive });
  };

  return {
    alerts,
    loading,
    createAlert,
    updateAlert,
    deleteAlert,
    toggleAlert,
    refetch: fetchAlerts
  };
}
