import { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Package,
  DollarSign,
  ShoppingCart,
  Users,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";

interface SalesStats {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  deliveredOrders: number;
  totalQuantity: number;
  uniqueCustomers: number;
  avgOrderValue: number;
  monthlyGrowth: number;
}

const SupplierSalesStats = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [stats, setStats] = useState<SalesStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isArabic = language === "ar";

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      setIsLoading(true);
      try {
        // Get supplier IDs
        const { data: suppliers } = await supabase
          .from("suppliers")
          .select("id")
          .eq("user_id", user.id);

        if (!suppliers?.length) {
          setStats({
            totalOrders: 0,
            totalRevenue: 0,
            pendingOrders: 0,
            deliveredOrders: 0,
            totalQuantity: 0,
            uniqueCustomers: 0,
            avgOrderValue: 0,
            monthlyGrowth: 0,
          });
          setIsLoading(false);
          return;
        }

        const supplierIds = suppliers.map((s) => s.id);

        // Fetch orders for these suppliers
        const { data: orders } = await supabase
          .from("orders")
          .select("*")
          .in("supplier_id", supplierIds);

        const allOrders = orders || [];
        const pendingOrders = allOrders.filter((o) => o.status === "pending");
        const deliveredOrders = allOrders.filter((o) => o.status === "delivered");
        const totalRevenue = deliveredOrders.reduce((sum, o) => sum + (o.total_price || 0), 0);
        const totalQuantity = allOrders.reduce((sum, o) => sum + (o.quantity_kg || 0), 0);
        const uniqueCustomers = new Set(allOrders.map((o) => o.user_id)).size;

        // Calculate monthly growth
        const now = new Date();
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const lastMonthOrders = allOrders.filter(
          (o) => new Date(o.created_at) >= lastMonth && new Date(o.created_at) < thisMonth
        );
        const thisMonthOrders = allOrders.filter(
          (o) => new Date(o.created_at) >= thisMonth
        );
        
        const lastMonthRevenue = lastMonthOrders.reduce((sum, o) => sum + (o.total_price || 0), 0);
        const thisMonthRevenue = thisMonthOrders.reduce((sum, o) => sum + (o.total_price || 0), 0);
        
        const monthlyGrowth = lastMonthRevenue > 0 
          ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
          : 0;

        setStats({
          totalOrders: allOrders.length,
          totalRevenue,
          pendingOrders: pendingOrders.length,
          deliveredOrders: deliveredOrders.length,
          totalQuantity,
          uniqueCustomers,
          avgOrderValue: allOrders.length > 0 ? totalRevenue / deliveredOrders.length : 0,
          monthlyGrowth,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      title: isArabic ? "إجمالي الطلبات" : "Total Orders",
      value: stats.totalOrders,
      icon: ShoppingCart,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: isArabic ? "الإيرادات" : "Revenue",
      value: `${stats.totalRevenue.toLocaleString()} ر.س`,
      icon: DollarSign,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: isArabic ? "طلبات معلقة" : "Pending Orders",
      value: stats.pendingOrders,
      icon: Package,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      title: isArabic ? "تم التسليم" : "Delivered",
      value: stats.deliveredOrders,
      icon: Package,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      title: isArabic ? "الكمية الإجمالية" : "Total Quantity",
      value: `${stats.totalQuantity.toLocaleString()} كغ`,
      icon: Package,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: isArabic ? "عملاء فريدون" : "Unique Customers",
      value: stats.uniqueCustomers,
      icon: Users,
      color: "text-indigo-500",
      bgColor: "bg-indigo-500/10",
    },
    {
      title: isArabic ? "متوسط قيمة الطلب" : "Avg Order Value",
      value: `${Math.round(stats.avgOrderValue).toLocaleString()} ر.س`,
      icon: DollarSign,
      color: "text-cyan-500",
      bgColor: "bg-cyan-500/10",
    },
    {
      title: isArabic ? "نمو شهري" : "Monthly Growth",
      value: `${stats.monthlyGrowth >= 0 ? "+" : ""}${stats.monthlyGrowth.toFixed(1)}%`,
      icon: stats.monthlyGrowth >= 0 ? TrendingUp : TrendingDown,
      color: stats.monthlyGrowth >= 0 ? "text-green-500" : "text-red-500",
      bgColor: stats.monthlyGrowth >= 0 ? "bg-green-500/10" : "bg-red-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statCards.map((stat, index) => (
        <Card key={index}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className="text-xl font-bold">{stat.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default SupplierSalesStats;
