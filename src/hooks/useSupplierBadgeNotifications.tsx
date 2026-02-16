// Hook for real-time supplier badge notifications
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from 'sonner';

export const useSupplierBadgeNotifications = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      setUserRole(data?.role || null);
    };
    fetchUserRole();
  }, [user]);

  useEffect(() => {
    if (!user || userRole !== 'roaster') return;

    const channel = supabase
      .channel('supplier-badges-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'supplier_badges',
        },
        async (payload) => {
          const badge = payload.new as {
            supplier_id: string;
            badge_name: string;
            badge_type: string;
          };

          // Get supplier name
          const { data: supplier } = await supabase
            .from('suppliers')
            .select('name')
            .eq('id', badge.supplier_id)
            .single();

          if (supplier) {
            const title = language === 'ar' 
              ? `🏆 ${supplier.name} حصل على شارة جديدة!`
              : `🏆 ${supplier.name} earned a new badge!`;
            
            const description = language === 'ar'
              ? `شارة: ${badge.badge_name}`
              : `Badge: ${badge.badge_name}`;

            toast.success(title, {
              description,
              duration: 8000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, userRole, language]);
};
