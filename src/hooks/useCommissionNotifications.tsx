import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { playGlobalNotificationSound } from "@/hooks/useNotificationSound";

export const useCommissionNotifications = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { language } = useLanguage();
  const isAdminRef = useRef<boolean>(false);
  const isArabic = language === "ar";

  useEffect(() => {
    if (!user) return;

    // Check if user is admin
    const checkAdmin = async () => {
      const { data } = await supabase.rpc("is_verified_admin", {
        _user_id: user.id,
      });
      isAdminRef.current = data === true;
    };

    checkAdmin();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("admin-commission-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "commissions",
        },
        async (payload) => {
          // Only show notification if user is admin
          if (!isAdminRef.current) return;

          const commission = payload.new as {
            id: string;
            total_commission: number;
            order_total: number;
            supplier_id: string;
          };

          // Get supplier name
          const { data: supplier } = await supabase
            .from("suppliers")
            .select("name")
            .eq("id", commission.supplier_id)
            .single();

          // Play notification sound
          playGlobalNotificationSound();

          toast({
            title: isArabic ? "💰 عمولة جديدة!" : "💰 New Commission!",
            description: isArabic
              ? `تم تسجيل عمولة جديدة بقيمة ${Number(commission.total_commission).toFixed(2)} ر.س من ${supplier?.name || "مورد"}`
              : `New commission of ${Number(commission.total_commission).toFixed(2)} SAR from ${supplier?.name || "supplier"}`,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast, isArabic]);
};
