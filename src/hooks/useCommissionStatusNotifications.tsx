import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { playGlobalNotificationSound } from "@/hooks/useNotificationSound";

export const useCommissionStatusNotifications = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { language } = useLanguage();
  const isArabic = language === "ar";

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("commission-status-changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "commissions",
        },
        async (payload) => {
          const oldStatus = (payload.old as { status?: string })?.status;
          const newStatus = (payload.new as { status: string; total_commission: number; supplier_id: string }).status;

          // Only notify when status changes from pending to completed
          if (oldStatus === "pending" && newStatus === "completed") {
            const commission = payload.new as {
              total_commission: number;
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
              title: isArabic ? "✅ تم اكتمال العمولة!" : "✅ Commission Completed!",
              description: isArabic
                ? `تم تحويل العمولة بقيمة ${Number(commission.total_commission).toFixed(2)} ر.س من ${supplier?.name || "مورد"} إلى مكتملة`
                : `Commission of ${Number(commission.total_commission).toFixed(2)} SAR from ${supplier?.name || "supplier"} has been completed`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast, isArabic]);
};
