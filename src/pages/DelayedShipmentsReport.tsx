import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Truck, AlertTriangle, Package, Clock, Building2, FileSpreadsheet, Loader2, RefreshCw, TrendingDown, TrendingUp, Calendar, BarChart3, Printer, MessageSquare, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";

interface DelayedOrder {
  id: string;
  expected_delivery: string;
  order_date: string;
  quantity_kg: number;
  status: string;
  days_delayed: number;
  supplier: { id: string; name: string } | null;
  coffee: { name: string } | null;
}

interface SupplierStats {
  name: string;
  totalOrders: number;
  delayedOrders: number;
  avgDelay: number;
  delayRate: number;
}

const DelayedShipmentsReport = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { language, dir } = useLanguage();
  const navigate = useNavigate();
  const isArabic = language === 'ar';

  const [delayedOrders, setDelayedOrders] = useState<DelayedOrder[]>([]);
  const [supplierStats, setSupplierStats] = useState<SupplierStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<string>("all");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user, period]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      let query = supabase
        .from('orders')
        .select(`
          id,
          expected_delivery,
          order_date,
          quantity_kg,
          status,
          supplier:suppliers(id, name),
          coffee:coffee_offerings(name)
        `)
        .eq('user_id', user!.id)
        .neq('status', 'delivered')
        .neq('status', 'cancelled')
        .lt('expected_delivery', today)
        .order('expected_delivery', { ascending: true });

      // Apply period filter
      if (period !== "all") {
        const startDate = new Date();
        if (period === "week") startDate.setDate(startDate.getDate() - 7);
        else if (period === "month") startDate.setMonth(startDate.getMonth() - 1);
        else if (period === "quarter") startDate.setMonth(startDate.getMonth() - 3);
        
        query = query.gte('order_date', startDate.toISOString().split('T')[0]);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Calculate days delayed
      const todayDate = new Date();
      const ordersWithDelay = (data || []).map(order => {
        const expectedDate = new Date(order.expected_delivery);
        const daysDelayed = Math.floor((todayDate.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24));
        return {
          ...order,
          days_delayed: daysDelayed,
          supplier: Array.isArray(order.supplier) ? order.supplier[0] : order.supplier,
          coffee: Array.isArray(order.coffee) ? order.coffee[0] : order.coffee,
        };
      });

      setDelayedOrders(ordersWithDelay);

      // Calculate supplier statistics
      const stats: Record<string, SupplierStats> = {};
      
      // Fetch all orders for supplier stats
      const { data: allOrders } = await supabase
        .from('orders')
        .select('id, supplier_id, expected_delivery, status, supplier:suppliers(id, name)')
        .eq('user_id', user!.id);

      (allOrders || []).forEach(order => {
        const supplier = Array.isArray(order.supplier) ? order.supplier[0] : order.supplier;
        if (!supplier) return;

        if (!stats[supplier.id]) {
          stats[supplier.id] = {
            name: supplier.name,
            totalOrders: 0,
            delayedOrders: 0,
            avgDelay: 0,
            delayRate: 0,
          };
        }

        stats[supplier.id].totalOrders++;

        if (order.status !== 'delivered' && order.status !== 'cancelled' && order.expected_delivery) {
          const expectedDate = new Date(order.expected_delivery);
          if (expectedDate < todayDate) {
            stats[supplier.id].delayedOrders++;
            const daysDelayed = Math.floor((todayDate.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24));
            stats[supplier.id].avgDelay = (stats[supplier.id].avgDelay * (stats[supplier.id].delayedOrders - 1) + daysDelayed) / stats[supplier.id].delayedOrders;
          }
        }
      });

      // Calculate delay rates
      Object.values(stats).forEach(stat => {
        stat.delayRate = stat.totalOrders > 0 ? (stat.delayedOrders / stat.totalOrders) * 100 : 0;
      });

      setSupplierStats(Object.values(stats).filter(s => s.delayedOrders > 0).sort((a, b) => b.delayRate - a.delayRate));
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'حدث خطأ أثناء تحميل البيانات' : 'Error loading data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const exportToExcel = () => {
    const data = delayedOrders.map(order => ({
      [isArabic ? 'المنتج' : 'Product']: order.coffee?.name || '-',
      [isArabic ? 'المورد' : 'Supplier']: order.supplier?.name || '-',
      [isArabic ? 'الكمية (كغ)' : 'Quantity (kg)']: order.quantity_kg,
      [isArabic ? 'تاريخ الطلب' : 'Order Date']: new Date(order.order_date).toLocaleDateString('ar-SA'),
      [isArabic ? 'التسليم المتوقع' : 'Expected Delivery']: new Date(order.expected_delivery).toLocaleDateString('ar-SA'),
      [isArabic ? 'أيام التأخير' : 'Days Delayed']: order.days_delayed,
      [isArabic ? 'الحالة' : 'Status']: order.status,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, isArabic ? 'الشحنات المتأخرة' : 'Delayed Shipments');
    XLSX.writeFile(wb, `delayed-shipments-${new Date().toISOString().split('T')[0]}.xlsx`);

    toast({
      title: isArabic ? 'تم التصدير' : 'Exported',
      description: isArabic ? 'تم تصدير التقرير بنجاح' : 'Report exported successfully',
    });
  };

  const totalDelayed = delayedOrders.length;
  const avgDelayDays = totalDelayed > 0 ? Math.round(delayedOrders.reduce((sum, o) => sum + o.days_delayed, 0) / totalDelayed) : 0;
  const criticalDelays = delayedOrders.filter(o => o.days_delayed > 7).length;

  const delayDistribution = [
    { name: isArabic ? '1-3 أيام' : '1-3 days', value: delayedOrders.filter(o => o.days_delayed <= 3).length, color: '#f59e0b' },
    { name: isArabic ? '4-7 أيام' : '4-7 days', value: delayedOrders.filter(o => o.days_delayed > 3 && o.days_delayed <= 7).length, color: '#f97316' },
    { name: isArabic ? '8+ أيام' : '8+ days', value: delayedOrders.filter(o => o.days_delayed > 7).length, color: '#dc2626' },
  ].filter(d => d.value > 0);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-arabic" dir={dir}>
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/roaster-dashboard')}>
              <ArrowRight className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-display font-bold flex items-center gap-2">
                <Truck className="w-6 h-6 text-red-500" />
                {isArabic ? 'تقرير الشحنات المتأخرة' : 'Delayed Shipments Report'}
              </h1>
              <p className="text-muted-foreground">
                {isArabic ? 'تحليل تفصيلي للشحنات المتأخرة وأداء الموردين' : 'Detailed analysis of delayed shipments and supplier performance'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isArabic ? 'كل الفترات' : 'All Time'}</SelectItem>
                <SelectItem value="week">{isArabic ? 'آخر أسبوع' : 'Last Week'}</SelectItem>
                <SelectItem value="month">{isArabic ? 'آخر شهر' : 'Last Month'}</SelectItem>
                <SelectItem value="quarter">{isArabic ? 'آخر 3 أشهر' : 'Last Quarter'}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchData} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              {isArabic ? 'تحديث' : 'Refresh'}
            </Button>
            <Button onClick={exportToExcel} className="gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              {isArabic ? 'تصدير Excel' : 'Export Excel'}
            </Button>
          </div>
        </div>

        {/* Shipping Management Links */}
        <div className="flex flex-wrap gap-3 mb-8">
          <Link to="/shipping-analytics">
            <Button variant="outline" size="sm" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              {isArabic ? 'تقارير وتحليلات الشحن' : 'Shipping Analytics'}
            </Button>
          </Link>
          <Link to="/shipping-label">
            <Button variant="outline" size="sm" className="gap-2">
              <Printer className="w-4 h-4" />
              {isArabic ? 'طباعة البوليصات' : 'Print Labels'}
            </Button>
          </Link>
          <Link to="/whatsapp-settings">
            <Button variant="outline" size="sm" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              {isArabic ? 'إشعارات واتساب' : 'WhatsApp Notifications'}
            </Button>
          </Link>
          <Link to="/delayed-shipment-settings">
            <Button variant="outline" size="sm" className="gap-2">
              <Settings className="w-4 h-4" />
              {isArabic ? 'إعدادات التنبيهات' : 'Alert Settings'}
            </Button>
          </Link>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-red-200 dark:border-red-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{isArabic ? 'إجمالي المتأخرة' : 'Total Delayed'}</p>
                  <p className="text-3xl font-bold text-red-600">{totalDelayed}</p>
                </div>
                <AlertTriangle className="w-10 h-10 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{isArabic ? 'متوسط التأخير' : 'Avg Delay'}</p>
                  <p className="text-3xl font-bold">{avgDelayDays} <span className="text-base font-normal">{isArabic ? 'يوم' : 'days'}</span></p>
                </div>
                <Clock className="w-10 h-10 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-200 dark:border-orange-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{isArabic ? 'تأخيرات حرجة (8+ أيام)' : 'Critical (8+ days)'}</p>
                  <p className="text-3xl font-bold text-orange-600">{criticalDelays}</p>
                </div>
                <TrendingDown className="w-10 h-10 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{isArabic ? 'موردين متأثرين' : 'Affected Suppliers'}</p>
                  <p className="text-3xl font-bold">{supplierStats.length}</p>
                </div>
                <Building2 className="w-10 h-10 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Delay Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>{isArabic ? 'توزيع أيام التأخير' : 'Delay Distribution'}</CardTitle>
            </CardHeader>
            <CardContent>
              {delayDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={delayDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {delayDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  {isArabic ? 'لا توجد شحنات متأخرة' : 'No delayed shipments'}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Supplier Performance */}
          <Card>
            <CardHeader>
              <CardTitle>{isArabic ? 'أداء الموردين (نسبة التأخير)' : 'Supplier Performance (Delay Rate)'}</CardTitle>
            </CardHeader>
            <CardContent>
              {supplierStats.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={supplierStats.slice(0, 5)} layout="vertical">
                    <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <YAxis type="category" dataKey="name" width={100} />
                    <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                    <Bar dataKey="delayRate" fill="#dc2626" name={isArabic ? 'نسبة التأخير' : 'Delay Rate'} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  {isArabic ? 'لا توجد بيانات' : 'No data available'}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Delayed Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              {isArabic ? 'قائمة الشحنات المتأخرة' : 'Delayed Shipments List'}
            </CardTitle>
            <CardDescription>
              {isArabic ? `${totalDelayed} شحنة متأخرة` : `${totalDelayed} delayed shipments`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {delayedOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Truck className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>{isArabic ? 'لا توجد شحنات متأخرة حالياً' : 'No delayed shipments currently'}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isArabic ? 'المنتج' : 'Product'}</TableHead>
                    <TableHead>{isArabic ? 'المورد' : 'Supplier'}</TableHead>
                    <TableHead>{isArabic ? 'الكمية' : 'Quantity'}</TableHead>
                    <TableHead>{isArabic ? 'التسليم المتوقع' : 'Expected'}</TableHead>
                    <TableHead>{isArabic ? 'أيام التأخير' : 'Days Delayed'}</TableHead>
                    <TableHead>{isArabic ? 'الحالة' : 'Status'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {delayedOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.coffee?.name || '-'}</TableCell>
                      <TableCell>{order.supplier?.name || '-'}</TableCell>
                      <TableCell>{order.quantity_kg} {isArabic ? 'كغ' : 'kg'}</TableCell>
                      <TableCell>{new Date(order.expected_delivery).toLocaleDateString('ar-SA')}</TableCell>
                      <TableCell>
                        <Badge variant={order.days_delayed > 7 ? 'destructive' : order.days_delayed > 3 ? 'default' : 'secondary'}>
                          {order.days_delayed} {isArabic ? 'يوم' : 'days'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{order.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Supplier Stats Table */}
        {supplierStats.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                {isArabic ? 'إحصائيات أداء الموردين' : 'Supplier Performance Stats'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isArabic ? 'المورد' : 'Supplier'}</TableHead>
                    <TableHead>{isArabic ? 'إجمالي الطلبات' : 'Total Orders'}</TableHead>
                    <TableHead>{isArabic ? 'الطلبات المتأخرة' : 'Delayed Orders'}</TableHead>
                    <TableHead>{isArabic ? 'نسبة التأخير' : 'Delay Rate'}</TableHead>
                    <TableHead>{isArabic ? 'متوسط التأخير' : 'Avg Delay'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplierStats.map((stat, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{stat.name}</TableCell>
                      <TableCell>{stat.totalOrders}</TableCell>
                      <TableCell>{stat.delayedOrders}</TableCell>
                      <TableCell>
                        <Badge variant={stat.delayRate > 30 ? 'destructive' : stat.delayRate > 15 ? 'default' : 'secondary'}>
                          {stat.delayRate.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell>{stat.avgDelay.toFixed(1)} {isArabic ? 'يوم' : 'days'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DelayedShipmentsReport;
