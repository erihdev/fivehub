import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { playGlobalNotificationSound } from "@/hooks/useNotificationSound";

export const useAdminNotifications = () => {
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;

    // Check if user is admin
    const checkAdminAndSubscribe = async () => {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role, status')
        .eq('user_id', user.id)
        .single();

      if (roleData?.role !== 'admin' || roleData?.status !== 'approved') {
        return;
      }

      // Subscribe to new user registrations
      channel = supabase
        .channel('admin-notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'user_roles',
          },
          async (payload) => {
            console.log('🔔 Admin notification received:', payload);
            
            const newRole = payload.new as {
              id: string;
              user_id: string;
              role: string;
              status: string;
              company_name: string | null;
            };

            // Don't notify for admin's own registration
            if (newRole.user_id === user.id) {
              console.log('Skipping notification for own registration');
              return;
            }

            // Get user profile info
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('user_id', newRole.user_id)
              .single();

            const userName = profile?.full_name || 'مستخدم جديد';
            const roleName = getRoleName(newRole.role);

            console.log('🔊 Attempting to play notification sound...');
            // Play notification sound
            playGlobalNotificationSound();

            toast({
              title: '🔔 طلب تسجيل جديد',
              description: `${userName} يريد التسجيل كـ ${roleName}${newRole.company_name ? ` (${newRole.company_name})` : ''}`,
              duration: 10000,
            });
          }
        )
        .subscribe();
    };

    checkAdminAndSubscribe();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user, toast]);
};

const getRoleName = (role: string): string => {
  const roleNames: Record<string, string> = {
    supplier: 'مورد',
    roaster: 'محمصة',
    cafe: 'مقهى',
    farm: 'مزرعة',
    maintenance: 'صيانة',
    admin: 'مدير',
  };
  return roleNames[role] || role;
};
