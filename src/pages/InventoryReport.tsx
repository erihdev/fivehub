import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { translateOrigin } from "@/lib/countryTranslations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { 
  ArrowRight, ArrowLeft, Package, RefreshCw, TrendingUp, TrendingDown, 
  Calendar, FileText, Loader2, Download, ShoppingCart, Settings
} from "lucide-react";
import { format, startOfWeek, endOfWeek, subWeeks, isWithinInterval } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line 
} from "recharts";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import InventoryPredictions from "@/components/InventoryPredictions";
import PredictionAccuracyChart from "@/components/PredictionAccuracyChart";
import WeeklyTrendsComparison from "@/components/WeeklyTrendsComparison";
import InventoryPerformanceIndicator from "@/components/InventoryPerformanceIndicator";

interface InventoryItem {
  id: string;
  coffee_id: string;
  quantity_kg: number;
  min_quantity_kg: number;
  auto_reorder_enabled: boolean;
  auto_reorder_quantity: number;
  last_auto_reorder_at: string | null;
  updated_at: string;
  coffee_offerings: {
    name: string;
    origin: string | null;
  } | null;
}

interface Order {
  id: string;
  quantity_kg: number;
  total_price: number | null;
  currency: string;
  status: string;
  order_date: string;
  notes: string | null;
  coffee_offerings: {
    name: string;
  } | null;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const InventoryReport = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { language, dir } = useLanguage();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);

  const isArabic = language === 'ar';
  const BackArrow = isArabic ? ArrowRight : ArrowLeft;
  const dateLocale = isArabic ? ar : enUS;

  const currentWeekStart = startOfWeek(subWeeks(new Date(), weekOffset), { weekStartsOn: 0 });
  const currentWeekEnd = endOfWeek(subWeeks(new Date(), weekOffset), { weekStartsOn: 0 });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, weekOffset]);

  const fetchData = async () => {
    setIsLoading(true);
    
    const [inventoryRes, ordersRes] = await Promise.all([
      supabase
        .from("inventory")
        .select(`
          *,
          coffee_offerings (name, origin)
        `)
        .order("updated_at", { ascending: false }),
      supabase
        .from("orders")
        .select(`
          id,
          quantity_kg,
          total_price,
          currency,
          status,
          order_date,
          notes,
          coffee_offerings (name)
        `)
        .gte("order_date", format(currentWeekStart, "yyyy-MM-dd"))
        .lte("order_date", format(currentWeekEnd, "yyyy-MM-dd"))
        .order("order_date", { ascending: false })
    ]);

    if (!inventoryRes.error) {
      setInventory(inventoryRes.data as unknown as InventoryItem[] || []);
    }
    if (!ordersRes.error) {
      setOrders(ordersRes.data as unknown as Order[] || []);
    }
    
    setIsLoading(false);
  };

  // Filter auto-reorders from orders
  const autoReorders = orders.filter(order => 
    order.notes?.includes('إعادة طلب تلقائي') || order.notes?.includes('Auto reorder')
  );

  // Weekly stats
  const totalOrdersThisWeek = orders.length;
  const totalAutoReorders = autoReorders.length;
  const totalOrderedQuantity = orders.reduce((sum, o) => sum + o.quantity_kg, 0);
  const totalOrderValue = orders.reduce((sum, o) => sum + (o.total_price || 0), 0);

  // Low stock items
  const lowStockItems = inventory.filter(item => item.quantity_kg <= item.min_quantity_kg);
  const autoReorderEnabled = inventory.filter(item => item.auto_reorder_enabled);

  // Chart data - orders by status
  const ordersByStatus = orders.reduce((acc, order) => {
    const status = order.status;
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusChartData = Object.entries(ordersByStatus).map(([status, count]) => ({
    name: getStatusLabel(status),
    value: count
  }));

  // Chart data - inventory by origin
  const inventoryByOrigin = inventory.reduce((acc, item) => {
    const origin = translateOrigin(item.coffee_offerings?.origin, language) || (isArabic ? 'غير محدد' : 'Unknown');
    acc[origin] = (acc[origin] || 0) + item.quantity_kg;
    return acc;
  }, {} as Record<string, number>);

  const originChartData = Object.entries(inventoryByOrigin)
    .map(([origin, quantity]) => ({ name: origin, value: quantity }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Chart data - daily orders this week
  const dailyOrders: Record<string, number> = {};
  for (let i = 0; i < 7; i++) {
    const date = new Date(currentWeekStart);
    date.setDate(date.getDate() + i);
    const dateStr = format(date, "yyyy-MM-dd");
    dailyOrders[dateStr] = 0;
  }
  orders.forEach(order => {
    if (dailyOrders[order.order_date] !== undefined) {
      dailyOrders[order.order_date]++;
    }
  });

  const dailyChartData = Object.entries(dailyOrders).map(([date, count]) => ({
    date: format(new Date(date), "EEE", { locale: dateLocale }),
    orders: count
  }));

  function getStatusLabel(status: string): string {
    const labels: Record<string, Record<string, string>> = {
      pending: { ar: 'قيد الانتظار', en: 'Pending' },
      confirmed: { ar: 'مؤكد', en: 'Confirmed' },
      shipped: { ar: 'تم الشحن', en: 'Shipped' },
      delivered: { ar: 'تم التسليم', en: 'Delivered' },
      cancelled: { ar: 'ملغي', en: 'Cancelled' },
    };
    return labels[status]?.[isArabic ? 'ar' : 'en'] || status;
  }

  const exportReport = () => {
    const reportData = {
      week: `${format(currentWeekStart, "yyyy-MM-dd")} - ${format(currentWeekEnd, "yyyy-MM-dd")}`,
      summary: {
        totalOrders: totalOrdersThisWeek,
        autoReorders: totalAutoReorders,
        totalQuantity: totalOrderedQuantity,
        totalValue: totalOrderValue
      },
      orders: orders.map(o => ({
        date: o.order_date,
        coffee: o.coffee_offerings?.name,
        quantity: o.quantity_kg,
        status: o.status,
        isAutoReorder: o.notes?.includes('إعادة طلب تلقائي') || o.notes?.includes('Auto reorder')
      })),
      lowStock: lowStockItems.map(i => ({
        coffee: i.coffee_offerings?.name,
        quantity: i.quantity_kg,
        minimum: i.min_quantity_kg,
        autoReorderEnabled: i.auto_reorder_enabled
      }))
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-report-${format(currentWeekStart, "yyyy-MM-dd")}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: isArabic ? 'تم' : 'Success',
      description: isArabic ? 'تم تصدير التقرير بنجاح' : 'Report exported successfully'
    });
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background font-arabic p-6" dir={dir}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <FileText className="h-8 w-8 text-primary" />
              {isArabic ? 'تقرير المخزون الأسبوعي' : 'Weekly Inventory Report'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isArabic ? 'تتبع حركة المخزون والطلبات التلقائية' : 'Track inventory movements and auto-reorders'}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setWeekOffset(w => w + 1)}
              >
                {isArabic ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
              </Button>
              <span className="text-sm font-medium px-2">
                {format(currentWeekStart, "d MMM", { locale: dateLocale })} - {format(currentWeekEnd, "d MMM yyyy", { locale: dateLocale })}
              </span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setWeekOffset(w => Math.max(0, w - 1))}
                disabled={weekOffset === 0}
              >
                {isArabic ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={exportReport}>
              <Download className={`h-4 w-4 ${isArabic ? 'ml-1' : 'mr-1'}`} />
              {isArabic ? 'تصدير' : 'Export'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/report-settings")}>
              <Settings className={`h-4 w-4 ${isArabic ? 'ml-1' : 'mr-1'}`} />
              {isArabic ? 'الإعدادات' : 'Settings'}
            </Button>
            <LanguageSwitcher />
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              <BackArrow className={`${isArabic ? 'ml-2' : 'mr-2'} h-4 w-4`} />
              {isArabic ? 'العودة' : 'Back'}
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalOrdersThisWeek}</p>
                  <p className="text-sm text-muted-foreground">{isArabic ? 'إجمالي الطلبات' : 'Total Orders'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-chart-2/10">
                  <RefreshCw className="h-5 w-5 text-chart-2" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalAutoReorders}</p>
                  <p className="text-sm text-muted-foreground">{isArabic ? 'طلبات تلقائية' : 'Auto-Reorders'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-chart-3/10">
                  <Package className="h-5 w-5 text-chart-3" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalOrderedQuantity}</p>
                  <p className="text-sm text-muted-foreground">{isArabic ? 'كجم مطلوب' : 'kg Ordered'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-chart-4/10">
                  <TrendingUp className="h-5 w-5 text-chart-4" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalOrderValue.toFixed(0)}</p>
                  <p className="text-sm text-muted-foreground">{isArabic ? 'ريال' : 'SAR'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Daily Orders Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                {isArabic ? 'الطلبات اليومية' : 'Daily Orders'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dailyChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Orders by Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                {isArabic ? 'حالة الطلبات' : 'Order Status'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statusChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {statusChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  {isArabic ? 'لا توجد طلبات هذا الأسبوع' : 'No orders this week'}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Inventory by Origin */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                {isArabic ? 'المخزون حسب المنشأ' : 'Stock by Origin'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={originChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={80} className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Auto-Reorders List */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-primary" />
                {isArabic ? 'الطلبات التلقائية هذا الأسبوع' : 'Auto-Reorders This Week'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {autoReorders.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  {isArabic ? 'لا توجد طلبات تلقائية هذا الأسبوع' : 'No auto-reorders this week'}
                </p>
              ) : (
                <div className="space-y-3">
                  {autoReorders.map(order => (
                    <div key={order.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{order.coffee_offerings?.name || '-'}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(order.order_date), "PPP", { locale: dateLocale })}
                        </p>
                      </div>
                      <div className="text-left">
                        <p className="font-semibold">{order.quantity_kg} {isArabic ? 'كجم' : 'kg'}</p>
                        <Badge variant="outline" className="text-xs">
                          {getStatusLabel(order.status)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Low Stock Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <TrendingDown className="h-5 w-5" />
                {isArabic ? 'عناصر المخزون المنخفض' : 'Low Stock Items'}
                <Badge variant="destructive" className="mr-2">{lowStockItems.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lowStockItems.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  {isArabic ? 'جميع العناصر متوفرة بكميات كافية' : 'All items are well stocked'}
                </p>
              ) : (
                <div className="space-y-3">
                  {lowStockItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-destructive/5 rounded-lg border border-destructive/20">
                      <div>
                        <p className="font-medium">{item.coffee_offerings?.name || '-'}</p>
                        <p className="text-sm text-muted-foreground">
                          {isArabic ? 'الحد الأدنى:' : 'Min:'} {item.min_quantity_kg} {isArabic ? 'كجم' : 'kg'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-destructive font-bold">
                          {item.quantity_kg} {isArabic ? 'كجم' : 'kg'}
                        </span>
                        {item.auto_reorder_enabled && (
                          <Badge variant="outline" className="text-primary border-primary gap-1">
                            <RefreshCw className="h-3 w-3" />
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Auto-Reorder Settings Overview */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              {isArabic ? 'إعدادات إعادة الطلب التلقائي' : 'Auto-Reorder Settings'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-3xl font-bold text-primary">{autoReorderEnabled.length}</p>
                <p className="text-sm text-muted-foreground">{isArabic ? 'عناصر مفعّلة' : 'Items Enabled'}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-3xl font-bold">{inventory.length - autoReorderEnabled.length}</p>
                <p className="text-sm text-muted-foreground">{isArabic ? 'عناصر غير مفعّلة' : 'Items Disabled'}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-3xl font-bold text-chart-2">
                  {autoReorderEnabled.reduce((sum, i) => sum + i.auto_reorder_quantity, 0)}
                </p>
                <p className="text-sm text-muted-foreground">{isArabic ? 'كجم للطلب التلقائي' : 'kg Auto-Order'}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-3xl font-bold text-chart-3">
                  {inventory.reduce((sum, i) => sum + i.quantity_kg, 0)}
                </p>
                <p className="text-sm text-muted-foreground">{isArabic ? 'إجمالي المخزون' : 'Total Stock'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Indicator and Weekly Trends */}
        <div className="mt-6 grid lg:grid-cols-2 gap-6">
          <InventoryPerformanceIndicator />
          <WeeklyTrendsComparison />
        </div>

        {/* AI Predictions */}
        <div className="mt-6 grid lg:grid-cols-2 gap-6">
          <InventoryPredictions onPredictionsSaved={() => window.location.reload()} />
          <PredictionAccuracyChart />
        </div>
      </div>
    </main>
  );
};

export default InventoryReport;