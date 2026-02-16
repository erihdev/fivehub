import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useLanguage } from "@/hooks/useLanguage";

interface OrderPayload {
  id: string;
  quantity_kg: number;
  status: string;
  total_price: number | null;
  currency: string | null;
  supplier_id: string;
  coffee_id: string | null;
  user_id: string;
}

export const useSupplierNewOrderNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { playNotificationSound } = useNotificationSound();
  const { showNotification, permission } = usePushNotifications();
  const { language } = useLanguage();

  const isArabic = language === "ar";

  const sendPushNotification = useCallback(
    async (title: string, body: string, url?: string, tag?: string) => {
      if (permission === "granted") {
        await showNotification(title, { body, tag, url });
      }
    },
    [permission, showNotification]
  );

  const getCoffeeName = useCallback(async (coffeeId: string | null): Promise<string> => {
    if (!coffeeId) return isArabic ? "منتج" : "Product";
    
    try {
      const { data } = await supabase
        .from("coffee_offerings")
        .select("name")
        .eq("id", coffeeId)
        .single();
      
      return data?.name || (isArabic ? "منتج" : "Product");
    } catch {
      return isArabic ? "منتج" : "Product";
    }
  }, [isArabic]);

  const getRoasterName = useCallback(async (userId: string): Promise<string> => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", userId)
        .single();
      
      return data?.full_name || (isArabic ? "محمصة" : "Roaster");
    } catch {
      return isArabic ? "محمصة" : "Roaster";
    }
  }, [isArabic]);

  useEffect(() => {
    if (!user) return;

    // Get supplier IDs for current user
    const getSupplierIds = async () => {
      const { data: suppliers } = await supabase
        .from("suppliers")
        .select("id")
        .eq("user_id", user.id);
      
      return suppliers?.map(s => s.id) || [];
    };

    let supplierIds: string[] = [];

    const setupChannel = async () => {
      supplierIds = await getSupplierIds();
      
      if (supplierIds.length === 0) return;

      const channel = supabase
        .channel("supplier-new-orders")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "orders",
          },
          async (payload) => {
            const order = payload.new as OrderPayload;
            
            // Check if this order is for one of user's suppliers
            if (!supplierIds.includes(order.supplier_id)) return;

            // Play notification sound
            playNotificationSound();

            const coffeeName = await getCoffeeName(order.coffee_id);
            const roasterName = await getRoasterName(order.user_id);

            const title = isArabic ? "طلب جديد!" : "New Order!";
            const body = isArabic
              ? `${roasterName} طلب ${order.quantity_kg} كغ من ${coffeeName}`
              : `${roasterName} ordered ${order.quantity_kg}kg of ${coffeeName}`;

            // Show toast
            toast({
              title,
              description: body,
              duration: 8000,
            });

            // Send push notification
            await sendPushNotification(
              title,
              body,
              "/supplier-dashboard",
              `new-order-${order.id}`
            );

            // Send email notification via edge function
            try {
              await supabase.functions.invoke("notify-supplier-new-order", {
                body: {
                  order_id: order.id,
                  supplier_id: order.supplier_id,
                  roaster_name: roasterName,
                  coffee_name: coffeeName,
                  quantity_kg: order.quantity_kg,
                  total_price: order.total_price || 0,
                  currency: order.currency || "SAR",
                },
              });
              console.log("Email notification sent for order:", order.id);
            } catch (emailError) {
              console.error("Failed to send email notification:", emailError);
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "orders",
          },
          async (payload) => {
            const order = payload.new as OrderPayload;
            const oldOrder = payload.old as OrderPayload;
            
            // Check if this order is for one of user's suppliers
            if (!supplierIds.includes(order.supplier_id)) return;

            // Only notify on status changes
            if (order.status === oldOrder.status) return;

            const coffeeName = await getCoffeeName(order.coffee_id);

            const title = isArabic ? "تحديث حالة الطلب" : "Order Status Update";
            const statusText = isArabic
              ? getStatusArabic(order.status)
              : order.status;
            const body = isArabic
              ? `الطلب ${coffeeName} أصبح: ${statusText}`
              : `Order ${coffeeName} is now: ${statusText}`;

            toast({
              title,
              description: body,
            });
          }
        )
        .subscribe();

      return channel;
    };

    let channel: ReturnType<typeof supabase.channel> | undefined;
    
    setupChannel().then((ch) => {
      channel = ch;
    });

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user, toast, playNotificationSound, sendPushNotification, getCoffeeName, getRoasterName, isArabic]);
};

const getStatusArabic = (status: string): string => {
  switch (status) {
    case "pending": return "قيد الانتظار";
    case "confirmed": return "تم التأكيد";
    case "shipped": return "تم الشحن";
    case "delivered": return "تم التسليم";
    case "cancelled": return "ملغي";
    default: return status;
  }
};
