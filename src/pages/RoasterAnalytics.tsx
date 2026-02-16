import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Coffee,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Package,
  DollarSign,
  MapPin,
  Star,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Calendar,
  Loader2,
  Building2,
  ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { translateOrigin } from "@/lib/countryTranslations";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area,
} from "recharts";

interface Stats {
  totalSuppliers: number;
  totalCoffees: number;
  totalOrders: number;
  totalFavorites: number;
  avgPrice: number;
  avgScore: number;
  priceChange: number;
}

interface OriginData {
  name: string;
  count: number;
}

interface PriceHistory {
  date: string;
  avgPrice: number;
}

interface OrderStats {
  status: string;
  count: number;
}

interface MonthlyOrder {
  month: string;
  orders: number;
  amount: number;
}

interface ProcessData {
  name: string;
  count: number;
}

const COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16', '#f97316'];

const RoasterAnalytics = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { language, dir } = useLanguage();
  const navigate = useNavigate();

  const [stats, setStats] = useState<Stats>({
    totalSuppliers: 0,
    totalCoffees: 0,
    totalOrders: 0,
    totalFavorites: 0,
    avgPrice: 0,
    avgScore: 0,
    priceChange: 0,
  });
  const [originData, setOriginData] = useState<OriginData[]>([]);
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [orderStats, setOrderStats] = useState<OrderStats[]>([]);
  const [monthlyOrders, setMonthlyOrders] = useState<MonthlyOrder[]>([]);
  const [processData, setProcessData] = useState<ProcessData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isRtl = dir === 'rtl';

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    fetchAnalytics();
  }, [user]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      // Fetch suppliers count
      const { count: suppliersCount } = await supabase
        .from("suppliers")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user?.id);

      // Fetch coffees with details
      const { data: coffees } = await supabase
        .from("coffee_offerings")
        .select(`
          id, name, origin, price, score, process,
          suppliers!inner(user_id)
        `)
        .eq("suppliers.user_id", user?.id);

      // Fetch orders
      const { data: orders } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user?.id);

      // Fetch favorites
      const { count: favoritesCount } = await supabase
        .from("favorites")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user?.id);

      // Fetch price history
      const { data: priceHistoryData } = await supabase
        .from("price_history")
        .select("price, recorded_at")
        .order("recorded_at", { ascending: true })
        .limit(100);

      // Calculate stats
      const prices = coffees?.filter(c => c.price).map(c => c.price!) || [];
      const scores = coffees?.filter(c => c.score).map(c => c.score!) || [];
      const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
      const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

      // Calculate price change (compare first and last 10 prices)
      let priceChange = 0;
      if (priceHistoryData && priceHistoryData.length > 10) {
        const oldPrices = priceHistoryData.slice(0, 10);
        const newPrices = priceHistoryData.slice(-10);
        const oldAvg = oldPrices.reduce((a, b) => a + b.price, 0) / oldPrices.length;
        const newAvg = newPrices.reduce((a, b) => a + b.price, 0) / newPrices.length;
        priceChange = oldAvg > 0 ? ((newAvg - oldAvg) / oldAvg) * 100 : 0;
      }

      setStats({
        totalSuppliers: suppliersCount || 0,
        totalCoffees: coffees?.length || 0,
        totalOrders: orders?.length || 0,
        totalFavorites: favoritesCount || 0,
        avgPrice,
        avgScore,
        priceChange,
      });

      // Process origin data
      const originCounts: Record<string, number> = {};
      coffees?.forEach(c => {
        if (c.origin) {
          originCounts[c.origin] = (originCounts[c.origin] || 0) + 1;
        }
      });
      setOriginData(
        Object.entries(originCounts)
          .map(([name, count]) => ({ name: translateOrigin(name, language), count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 8)
      );

      // Process processing methods
      const processCounts: Record<string, number> = {};
      coffees?.forEach(c => {
        if (c.process) {
          processCounts[c.process] = (processCounts[c.process] || 0) + 1;
        }
      });
      setProcessData(
        Object.entries(processCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 6)
      );

      // Process price history
      if (priceHistoryData) {
        const groupedByDate: Record<string, number[]> = {};
        priceHistoryData.forEach(p => {
          const date = new Date(p.recorded_at).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
          if (!groupedByDate[date]) groupedByDate[date] = [];
          groupedByDate[date].push(p.price);
        });
        setPriceHistory(
          Object.entries(groupedByDate)
            .map(([date, prices]) => ({
              date,
              avgPrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
            }))
            .slice(-14)
        );
      }

      // Process order stats
      if (orders) {
        const statusCounts: Record<string, number> = {};
        orders.forEach(o => {
          statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
        });
        const statusLabels: Record<string, string> = {
          pending: language === 'ar' ? 'قيد الانتظار' : 'Pending',
          confirmed: language === 'ar' ? 'مؤكد' : 'Confirmed',
          shipped: language === 'ar' ? 'تم الشحن' : 'Shipped',
          delivered: language === 'ar' ? 'تم التسليم' : 'Delivered',
          cancelled: language === 'ar' ? 'ملغي' : 'Cancelled',
        };
        setOrderStats(
          Object.entries(statusCounts).map(([status, count]) => ({
            status: statusLabels[status] || status,
            count,
          }))
        );

        // Monthly orders
        const monthlyData: Record<string, { orders: number; amount: number }> = {};
        orders.forEach(o => {
          const month = new Date(o.order_date).toLocaleDateString('ar-SA', { month: 'short' });
          if (!monthlyData[month]) monthlyData[month] = { orders: 0, amount: 0 };
          monthlyData[month].orders++;
          monthlyData[month].amount += o.total_price || 0;
        });
        setMonthlyOrders(
          Object.entries(monthlyData).map(([month, data]) => ({
            month,
            ...data,
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center" dir={dir}>
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background font-arabic p-6" dir={dir}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Activity className="w-8 h-8 text-primary" />
              {language === 'ar' ? 'لوحة الإحصائيات المتقدمة' : 'Advanced Analytics'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {language === 'ar' ? 'تحليلات شاملة لنشاط المحمصة' : 'Comprehensive roastery analytics'}
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/roaster-dashboard")}>
            <ArrowRight className={`w-4 h-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
            {language === 'ar' ? 'العودة' : 'Back'}
          </Button>
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <Building2 className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{stats.totalSuppliers}</p>
              <p className="text-xs text-muted-foreground">
                {language === 'ar' ? 'الموردون' : 'Suppliers'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Coffee className="w-8 h-8 mx-auto mb-2 text-amber-500" />
              <p className="text-2xl font-bold">{stats.totalCoffees}</p>
              <p className="text-xs text-muted-foreground">
                {language === 'ar' ? 'المحاصيل' : 'Coffees'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-blue-500" />
              <p className="text-2xl font-bold">{stats.totalOrders}</p>
              <p className="text-xs text-muted-foreground">
                {language === 'ar' ? 'الطلبات' : 'Orders'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <DollarSign className="w-8 h-8 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold">{stats.avgPrice.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground">
                {language === 'ar' ? 'متوسط السعر' : 'Avg Price'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Star className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
              <p className="text-2xl font-bold">{stats.avgScore.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground">
                {language === 'ar' ? 'متوسط التقييم' : 'Avg Score'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              {stats.priceChange >= 0 ? (
                <TrendingUp className="w-8 h-8 mx-auto mb-2 text-red-500" />
              ) : (
                <TrendingDown className="w-8 h-8 mx-auto mb-2 text-green-500" />
              )}
              <p className={`text-2xl font-bold ${stats.priceChange >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                {stats.priceChange >= 0 ? '+' : ''}{stats.priceChange.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">
                {language === 'ar' ? 'تغير الأسعار' : 'Price Change'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Price Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                {language === 'ar' ? 'اتجاه الأسعار' : 'Price Trend'}
              </CardTitle>
              <CardDescription>
                {language === 'ar' ? 'تطور متوسط الأسعار خلال الفترة الأخيرة' : 'Average price evolution over time'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {priceHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={priceHistory}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="date" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="avgPrice"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      fill="url(#colorPrice)"
                      name={language === 'ar' ? 'متوسط السعر' : 'Avg Price'}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  {language === 'ar' ? 'لا توجد بيانات كافية' : 'Not enough data'}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Origins Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                {language === 'ar' ? 'توزيع المناشئ' : 'Origins Distribution'}
              </CardTitle>
              <CardDescription>
                {language === 'ar' ? 'عدد المحاصيل حسب بلد المنشأ' : 'Coffee count by origin country'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {originData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={originData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="name"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {originData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  {language === 'ar' ? 'لا توجد بيانات' : 'No data available'}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Processing Methods */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                {language === 'ar' ? 'طرق المعالجة' : 'Processing Methods'}
              </CardTitle>
              <CardDescription>
                {language === 'ar' ? 'توزيع المحاصيل حسب طريقة المعالجة' : 'Coffee distribution by process'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {processData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={processData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis type="number" fontSize={12} />
                    <YAxis dataKey="name" type="category" fontSize={12} width={100} />
                    <Tooltip
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    />
                    <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} name={language === 'ar' ? 'العدد' : 'Count'} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  {language === 'ar' ? 'لا توجد بيانات' : 'No data available'}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                {language === 'ar' ? 'حالة الطلبات' : 'Order Status'}
              </CardTitle>
              <CardDescription>
                {language === 'ar' ? 'توزيع الطلبات حسب الحالة' : 'Orders distribution by status'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {orderStats.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={orderStats}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="status" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    />
                    <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} name={language === 'ar' ? 'العدد' : 'Count'} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  {language === 'ar' ? 'لا توجد طلبات' : 'No orders yet'}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Monthly Orders */}
        {monthlyOrders.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                {language === 'ar' ? 'الطلبات الشهرية' : 'Monthly Orders'}
              </CardTitle>
              <CardDescription>
                {language === 'ar' ? 'عدد الطلبات والمبالغ حسب الشهر' : 'Orders count and amounts by month'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyOrders}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis yAxisId="left" fontSize={12} />
                  <YAxis yAxisId="right" orientation="right" fontSize={12} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="orders"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    name={language === 'ar' ? 'عدد الطلبات' : 'Orders'}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="amount"
                    stroke="#10b981"
                    strokeWidth={2}
                    name={language === 'ar' ? 'المبلغ' : 'Amount'}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
};

export default RoasterAnalytics;
