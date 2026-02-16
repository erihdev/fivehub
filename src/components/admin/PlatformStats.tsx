import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Tag,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface PlatformStats {
  totalUsers: number;
  totalSuppliers: number;
  totalRoasters: number;
  pendingApprovals: number;
  totalOrders: number;
  totalRevenue: number;
  totalCommissions: number;
  activeOffers: number;
  monthlyOrders: { month: string; orders: number; revenue: number }[];
}

const PlatformStats = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isArabic = language === "ar";

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      try {
        // Fetch user roles
        const { data: userRoles } = await supabase
          .from("user_roles")
          .select("*");

        const roles = userRoles || [];
        const suppliers = roles.filter((r) => r.role === "supplier" && r.status === "approved");
        const roasters = roles.filter((r) => r.role === "roaster" && r.status === "approved");
        const pending = roles.filter((r) => r.status === "pending");

        // Fetch orders
        const { data: orders } = await supabase.from("orders").select("*");
        const allOrders = orders || [];
        const totalRevenue = allOrders.reduce((sum, o) => sum + (o.total_price || 0), 0);

        // Fetch commissions
        const { data: commissions } = await supabase.from("commissions").select("*");
        const totalCommissions = (commissions || []).reduce(
          (sum, c) => sum + (c.total_commission || 0),
          0
        );

        // Fetch active offers
        const { data: offers } = await supabase
          .from("supplier_offers")
          .select("*")
          .eq("is_active", true);

        // Calculate monthly orders
        const monthlyData: Record<string, { orders: number; revenue: number }> = {};
        allOrders.forEach((order) => {
          const month = new Date(order.created_at).toLocaleDateString("ar-SA", {
            year: "numeric",
            month: "short",
          });
          if (!monthlyData[month]) {
            monthlyData[month] = { orders: 0, revenue: 0 };
          }
          monthlyData[month].orders++;
          monthlyData[month].revenue += order.total_price || 0;
        });

        const monthlyOrders = Object.entries(monthlyData)
          .map(([month, data]) => ({
            month,
            orders: data.orders,
            revenue: data.revenue,
          }))
          .slice(-6);

        setStats({
          totalUsers: roles.length,
          totalSuppliers: suppliers.length,
          totalRoasters: roasters.length,
          pendingApprovals: pending.length,
          totalOrders: allOrders.length,
          totalRevenue,
          totalCommissions,
          activeOffers: offers?.length || 0,
          monthlyOrders,
        });
      } catch (error) {
        console.error("Error fetching platform stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Main Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card 
          className="cursor-pointer hover:dal-shadow transition-all hover:-translate-y-1"
          onClick={() => navigate('/commission-management')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <DollarSign className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {isArabic ? "الإيرادات" : "Revenue"}
                </p>
                <p className="text-2xl font-bold">
                  {stats.totalRevenue.toLocaleString()} <span className="text-sm">ر.س</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:dal-shadow transition-all hover:-translate-y-1"
          onClick={() => navigate('/commission-management')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <DollarSign className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {isArabic ? "العمولات" : "Commissions"}
                </p>
                <p className="text-2xl font-bold">
                  {stats.totalCommissions.toLocaleString()} <span className="text-sm">ر.س</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:dal-shadow transition-all hover:-translate-y-1"
          onClick={() => navigate('/orders')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <ShoppingCart className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {isArabic ? "الطلبات" : "Orders"}
                </p>
                <p className="text-2xl font-bold">{stats.totalOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:dal-shadow transition-all hover:-translate-y-1"
          onClick={() => navigate('/active-offers')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Tag className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {isArabic ? "عروض نشطة" : "Active Offers"}
                </p>
                <p className="text-2xl font-bold">{stats.activeOffers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Orders Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            {isArabic ? "الطلبات الشهرية" : "Monthly Orders"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={stats.monthlyOrders}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="orders"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary) / 0.2)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlatformStats;
