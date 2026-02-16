import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { ArrowRight, Truck, DollarSign, Clock, CheckCircle, AlertTriangle, TrendingUp, Download, Package } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { ar } from "date-fns/locale";
import * as XLSX from "xlsx";

interface CarrierStats {
  carrier_name: string;
  carrier_name_ar: string;
  total_shipments: number;
  delivered: number;
  delayed: number;
  avg_delivery_days: number;
  total_cost: number;
  success_rate: number;
}

interface ShipmentCostData {
  date: string;
  cost: number;
  count: number;
}

const ShippingAnalytics = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { language, dir } = useLanguage();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter'>('month');
  const [loading, setLoading] = useState(true);
  const [carrierStats, setCarrierStats] = useState<CarrierStats[]>([]);
  const [costTrend, setCostTrend] = useState<ShipmentCostData[]>([]);
  const [totalStats, setTotalStats] = useState({
    totalShipments: 0,
    totalCost: 0,
    avgDeliveryDays: 0,
    successRate: 0,
    delayedCount: 0,
    firstAttemptSuccess: 0
  });

  const t = {
    title: language === 'ar' ? 'تحليلات الشحن' : 'Shipping Analytics',
    subtitle: language === 'ar' ? 'تقارير وإحصائيات شاملة عن الشحنات' : 'Comprehensive shipping reports and statistics',
    back: language === 'ar' ? 'العودة' : 'Back',
    period: language === 'ar' ? 'الفترة' : 'Period',
    week: language === 'ar' ? 'أسبوع' : 'Week',
    month: language === 'ar' ? 'شهر' : 'Month',
    quarter: language === 'ar' ? 'ربع سنة' : 'Quarter',
    totalShipments: language === 'ar' ? 'إجمالي الشحنات' : 'Total Shipments',
    totalCost: language === 'ar' ? 'إجمالي التكلفة' : 'Total Cost',
    avgDeliveryDays: language === 'ar' ? 'متوسط أيام التسليم' : 'Avg Delivery Days',
    successRate: language === 'ar' ? 'معدل النجاح' : 'Success Rate',
    delayedShipments: language === 'ar' ? 'الشحنات المتأخرة' : 'Delayed Shipments',
    firstAttemptSuccess: language === 'ar' ? 'نجاح من أول محاولة' : 'First Attempt Success',
    carrierPerformance: language === 'ar' ? 'أداء شركات الشحن' : 'Carrier Performance',
    costTrend: language === 'ar' ? 'اتجاه التكلفة' : 'Cost Trend',
    carrier: language === 'ar' ? 'شركة الشحن' : 'Carrier',
    shipments: language === 'ar' ? 'الشحنات' : 'Shipments',
    delivered: language === 'ar' ? 'تم التسليم' : 'Delivered',
    delayed: language === 'ar' ? 'متأخر' : 'Delayed',
    avgDays: language === 'ar' ? 'متوسط الأيام' : 'Avg Days',
    cost: language === 'ar' ? 'التكلفة' : 'Cost',
    rate: language === 'ar' ? 'المعدل' : 'Rate',
    export: language === 'ar' ? 'تصدير' : 'Export',
    noData: language === 'ar' ? 'لا توجد بيانات' : 'No data available',
    sar: language === 'ar' ? 'ر.س' : 'SAR',
    days: language === 'ar' ? 'يوم' : 'days'
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user, period]);

  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case 'week':
        return { start: subDays(now, 7), end: now };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'quarter':
        return { start: subDays(now, 90), end: now };
      default:
        return { start: subDays(now, 30), end: now };
    }
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    const { start, end } = getDateRange();

    try {
      // Fetch shipment tracking data with carriers
      const { data: shipments, error } = await supabase
        .from('shipment_tracking')
        .select(`
          *,
          shipping_carriers (name, name_ar),
          orders!inner (user_id)
        `)
        .eq('orders.user_id', user?.id)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (error) throw error;

      // Calculate carrier stats
      const carrierMap = new Map<string, CarrierStats>();
      let totalCost = 0;
      let totalDeliveryDays = 0;
      let deliveredCount = 0;
      let delayedCount = 0;
      let firstAttemptCount = 0;

      shipments?.forEach((shipment: any) => {
        const carrierName = shipment.shipping_carriers?.name || 'Unknown';
        const carrierNameAr = shipment.shipping_carriers?.name_ar || 'غير معروف';
        
        if (!carrierMap.has(carrierName)) {
          carrierMap.set(carrierName, {
            carrier_name: carrierName,
            carrier_name_ar: carrierNameAr,
            total_shipments: 0,
            delivered: 0,
            delayed: 0,
            avg_delivery_days: 0,
            total_cost: 0,
            success_rate: 0
          });
        }

        const stats = carrierMap.get(carrierName)!;
        stats.total_shipments++;
        stats.total_cost += shipment.shipping_cost || 0;
        totalCost += shipment.shipping_cost || 0;

        if (shipment.status === 'delivered') {
          stats.delivered++;
          deliveredCount++;
          if (shipment.actual_delivery && shipment.created_at) {
            const days = Math.ceil((new Date(shipment.actual_delivery).getTime() - new Date(shipment.created_at).getTime()) / (1000 * 60 * 60 * 24));
            totalDeliveryDays += days;
          }
        }

        if (shipment.status === 'delayed') {
          stats.delayed++;
          delayedCount++;
        }
      });

      // Calculate rates
      carrierMap.forEach((stats) => {
        stats.success_rate = stats.total_shipments > 0 
          ? Math.round((stats.delivered / stats.total_shipments) * 100) 
          : 0;
        stats.avg_delivery_days = stats.delivered > 0 
          ? Math.round(totalDeliveryDays / stats.delivered) 
          : 0;
      });

      setCarrierStats(Array.from(carrierMap.values()));

      // Set total stats
      const totalShipments = shipments?.length || 0;
      setTotalStats({
        totalShipments,
        totalCost,
        avgDeliveryDays: deliveredCount > 0 ? Math.round(totalDeliveryDays / deliveredCount) : 0,
        successRate: totalShipments > 0 ? Math.round((deliveredCount / totalShipments) * 100) : 0,
        delayedCount,
        firstAttemptSuccess: totalShipments > 0 ? Math.round((firstAttemptCount / totalShipments) * 100) : 0
      });

      // Generate cost trend data
      const costByDate = new Map<string, { cost: number; count: number }>();
      shipments?.forEach((shipment: any) => {
        const date = format(new Date(shipment.created_at), 'MM/dd');
        if (!costByDate.has(date)) {
          costByDate.set(date, { cost: 0, count: 0 });
        }
        const data = costByDate.get(date)!;
        data.cost += shipment.shipping_cost || 0;
        data.count++;
      });

      setCostTrend(Array.from(costByDate.entries()).map(([date, data]) => ({
        date,
        cost: data.cost,
        count: data.count
      })));

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    const data = carrierStats.map(stat => ({
      [t.carrier]: language === 'ar' ? stat.carrier_name_ar : stat.carrier_name,
      [t.shipments]: stat.total_shipments,
      [t.delivered]: stat.delivered,
      [t.delayed]: stat.delayed,
      [t.avgDays]: stat.avg_delivery_days,
      [t.cost]: stat.total_cost,
      [t.rate]: `${stat.success_rate}%`
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Shipping Analytics");
    XLSX.writeFile(wb, `shipping_analytics_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const COLORS = ['#c8a97e', '#8B7355', '#6B5344', '#4A3728', '#2D221A'];

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir={dir}>
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/delayed-shipments-report">
                <Button variant="ghost" size="sm">
                  <ArrowRight className={`w-4 h-4 ${dir === 'rtl' ? 'ml-2' : 'mr-2'}`} />
                  {t.back}
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{t.title}</h1>
                <p className="text-muted-foreground text-sm">{t.subtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Select value={period} onValueChange={(v: 'week' | 'month' | 'quarter') => setPeriod(v)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">{t.week}</SelectItem>
                  <SelectItem value="month">{t.month}</SelectItem>
                  <SelectItem value="quarter">{t.quarter}</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={exportToExcel}>
                <Download className={`w-4 h-4 ${dir === 'rtl' ? 'ml-2' : 'mr-2'}`} />
                {t.export}
              </Button>
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t.totalShipments}</p>
                  <p className="text-2xl font-bold">{totalStats.totalShipments}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t.totalCost}</p>
                  <p className="text-2xl font-bold">{totalStats.totalCost.toFixed(0)} {t.sar}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Clock className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t.avgDeliveryDays}</p>
                  <p className="text-2xl font-bold">{totalStats.avgDeliveryDays} {t.days}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t.successRate}</p>
                  <p className="text-2xl font-bold">{totalStats.successRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t.delayedShipments}</p>
                  <p className="text-2xl font-bold">{totalStats.delayedCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t.firstAttemptSuccess}</p>
                  <p className="text-2xl font-bold">{totalStats.firstAttemptSuccess}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Carrier Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5" />
                {t.carrierPerformance}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {carrierStats.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={carrierStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey={language === 'ar' ? 'carrier_name_ar' : 'carrier_name'} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="delivered" name={t.delivered} fill="#22c55e" />
                    <Bar dataKey="delayed" name={t.delayed} fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  {t.noData}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cost Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                {t.costTrend}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {costTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={costTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="cost" name={t.cost} stroke="#c8a97e" strokeWidth={2} />
                    <Line type="monotone" dataKey="count" name={t.shipments} stroke="#8B7355" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  {t.noData}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Carrier Performance Table */}
        <Card>
          <CardHeader>
            <CardTitle>{t.carrierPerformance}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.carrier}</TableHead>
                  <TableHead className="text-center">{t.shipments}</TableHead>
                  <TableHead className="text-center">{t.delivered}</TableHead>
                  <TableHead className="text-center">{t.delayed}</TableHead>
                  <TableHead className="text-center">{t.avgDays}</TableHead>
                  <TableHead className="text-center">{t.cost}</TableHead>
                  <TableHead className="text-center">{t.rate}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {carrierStats.length > 0 ? (
                  carrierStats.map((stat, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {language === 'ar' ? stat.carrier_name_ar : stat.carrier_name}
                      </TableCell>
                      <TableCell className="text-center">{stat.total_shipments}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-green-500/10 text-green-600">
                          {stat.delivered}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600">
                          {stat.delayed}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{stat.avg_delivery_days} {t.days}</TableCell>
                      <TableCell className="text-center">{stat.total_cost.toFixed(0)} {t.sar}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={stat.success_rate >= 90 ? "default" : stat.success_rate >= 70 ? "secondary" : "destructive"}>
                          {stat.success_rate}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      {t.noData}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ShippingAnalytics;