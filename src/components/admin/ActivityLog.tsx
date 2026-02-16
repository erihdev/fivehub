import { useState, useEffect } from "react";
import {
  Activity,
  User,
  ShoppingCart,
  Tag,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

interface ActivityItem {
  id: string;
  type: "order" | "user" | "offer" | "commission";
  action: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

const ActivityLog = () => {
  const { language } = useLanguage();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isArabic = language === "ar";

  const fetchActivities = async () => {
    setIsLoading(true);
    try {
      const allActivities: ActivityItem[] = [];

      // Fetch recent orders
      const { data: orders } = await supabase
        .from("orders")
        .select("id, status, quantity_kg, created_at")
        .order("created_at", { ascending: false })
        .limit(10);

      (orders || []).forEach((order) => {
        allActivities.push({
          id: `order-${order.id}`,
          type: "order",
          action: "new_order",
          description: isArabic
            ? `طلب جديد بكمية ${order.quantity_kg} كغ`
            : `New order: ${order.quantity_kg} kg`,
          timestamp: order.created_at,
        });
      });

      // Fetch recent user registrations
      const { data: users } = await supabase
        .from("user_roles")
        .select("id, role, status, company_name, created_at")
        .order("created_at", { ascending: false })
        .limit(10);

      (users || []).forEach((user) => {
        allActivities.push({
          id: `user-${user.id}`,
          type: "user",
          action: user.status === "pending" ? "new_registration" : "status_change",
          description: isArabic
            ? `${user.status === "pending" ? "تسجيل جديد" : "تغيير حالة"}: ${user.company_name || user.role}`
            : `${user.status === "pending" ? "New registration" : "Status change"}: ${user.company_name || user.role}`,
          timestamp: user.created_at,
          metadata: { status: user.status },
        });
      });

      // Fetch recent offers
      const { data: offers } = await supabase
        .from("supplier_offers")
        .select("id, title, created_at")
        .order("created_at", { ascending: false })
        .limit(10);

      (offers || []).forEach((offer) => {
        allActivities.push({
          id: `offer-${offer.id}`,
          type: "offer",
          action: "new_offer",
          description: isArabic
            ? `عرض جديد: ${offer.title}`
            : `New offer: ${offer.title}`,
          timestamp: offer.created_at,
        });
      });

      // Fetch recent commissions
      const { data: commissions } = await supabase
        .from("commissions")
        .select("id, total_commission, status, created_at")
        .order("created_at", { ascending: false })
        .limit(10);

      (commissions || []).forEach((commission) => {
        allActivities.push({
          id: `commission-${commission.id}`,
          type: "commission",
          action: "new_commission",
          description: isArabic
            ? `عمولة جديدة: ${commission.total_commission} ر.س`
            : `New commission: ${commission.total_commission} SAR`,
          timestamp: commission.created_at,
          metadata: { status: commission.status },
        });
      });

      // Sort by timestamp
      allActivities.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setActivities(allActivities.slice(0, 30));
    } catch (error) {
      console.error("Error fetching activities:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "order":
        return <ShoppingCart className="w-4 h-4 text-blue-500" />;
      case "user":
        return <User className="w-4 h-4 text-green-500" />;
      case "offer":
        return <Tag className="w-4 h-4 text-purple-500" />;
      case "commission":
        return <DollarSign className="w-4 h-4 text-amber-500" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const labels: Record<string, { ar: string; en: string; color: string }> = {
      order: { ar: "طلب", en: "Order", color: "bg-blue-100 text-blue-800" },
      user: { ar: "مستخدم", en: "User", color: "bg-green-100 text-green-800" },
      offer: { ar: "عرض", en: "Offer", color: "bg-purple-100 text-purple-800" },
      commission: { ar: "عمولة", en: "Commission", color: "bg-amber-100 text-amber-800" },
    };
    const label = labels[type] || { ar: type, en: type, color: "bg-gray-100 text-gray-800" };
    return (
      <Badge className={label.color}>
        {isArabic ? label.ar : label.en}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            {isArabic ? "سجل النشاطات" : "Activity Log"}
          </CardTitle>
          <CardDescription>
            {isArabic
              ? "آخر الأحداث على المنصة"
              : "Recent platform activities"}
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={fetchActivities}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-4">
            {activities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>{isArabic ? "لا توجد نشاطات" : "No activities"}</p>
              </div>
            ) : (
              activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="p-2 rounded-full bg-muted">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getTypeBadge(activity.type)}
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.timestamp), {
                          addSuffix: true,
                          locale: isArabic ? ar : undefined,
                        })}
                      </span>
                    </div>
                    <p className="text-sm">{activity.description}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default ActivityLog;
