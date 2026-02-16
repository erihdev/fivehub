import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Download,
  FileSpreadsheet,
  FileText,
  Calendar,
  DollarSign,
  Package,
  Building2,
  ArrowRight,
  Loader2,
  Coffee,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { ThemeToggle } from '@/components/ThemeToggle';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { translateOrigin } from '@/lib/countryTranslations';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { format, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface PriceHistory {
  id: string;
  coffee_id: string;
  price: number;
  currency: string | null;
  recorded_at: string;
}

interface Order {
  id: string;
  quantity_kg: number;
  total_price: number | null;
  order_date: string;
  status: string;
  supplier_id: string;
}

interface CoffeeOffering {
  id: string;
  name: string;
  origin: string | null;
  price: number | null;
  score: number | null;
  supplier_id: string;
  created_at: string;
}

interface Supplier {
  id: string;
  name: string;
}

const COLORS = ['#C9A962', '#8B7355', '#5D4E37', '#3D3426', '#A0522D', '#8B4513', '#6B4423'];

const Reports = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { language, dir } = useLanguage();
  const reportRef = useRef<HTMLDivElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [coffees, setCoffees] = useState<CoffeeOffering[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const isRtl = dir === 'rtl';

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const startDate = subDays(new Date(), parseInt(dateRange)).toISOString();

        const [priceRes, ordersRes, coffeesRes, suppliersRes] = await Promise.all([
          supabase.from('price_history').select('*').gte('recorded_at', startDate).order('recorded_at'),
          supabase.from('orders').select('*').gte('order_date', startDate.split('T')[0]),
          supabase.from('coffee_offerings').select('*'),
          supabase.from('suppliers').select('id, name'),
        ]);

        if (priceRes.data) setPriceHistory(priceRes.data);
        if (ordersRes.data) setOrders(ordersRes.data);
        if (coffeesRes.data) setCoffees(coffeesRes.data);
        if (suppliersRes.data) setSuppliers(suppliersRes.data);
      } catch (error) {
        console.error('Error fetching report data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, dateRange]);

  // Calculate statistics
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total_price || 0), 0);
  const totalQuantity = orders.reduce((sum, o) => sum + o.quantity_kg, 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Price trends data
  const priceTrendsData = priceHistory.reduce((acc: any[], record) => {
    const date = format(new Date(record.recorded_at), 'dd/MM', { locale: language === 'ar' ? ar : enUS });
    const existing = acc.find(d => d.date === date);
    if (existing) {
      existing.price = (existing.price + record.price) / 2;
    } else {
      acc.push({ date, price: record.price });
    }
    return acc;
  }, []);

  // Orders by status
  const ordersByStatus = orders.reduce((acc: any, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {});

  const statusData = Object.entries(ordersByStatus).map(([name, value]) => ({
    name: language === 'ar' ? (
      name === 'pending' ? 'قيد الانتظار' :
      name === 'confirmed' ? 'مؤكد' :
      name === 'shipped' ? 'تم الشحن' :
      name === 'delivered' ? 'تم التسليم' :
      name === 'cancelled' ? 'ملغي' : name
    ) : name,
    value: value as number
  }));

  // Coffee by origin
  const coffeeByOrigin = coffees.reduce((acc: any, coffee) => {
    const origin = translateOrigin(coffee.origin, language) || (language === 'ar' ? 'غير محدد' : 'Unknown');
    acc[origin] = (acc[origin] || 0) + 1;
    return acc;
  }, {});

  const originData = Object.entries(coffeeByOrigin)
    .map(([name, value]) => ({ name, value: value as number }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 7);

  // Supplier performance
  const supplierPerformance = suppliers.map(supplier => {
    const supplierCoffees = coffees.filter(c => c.supplier_id === supplier.id);
    const supplierOrders = orders.filter(o => o.supplier_id === supplier.id);
    return {
      name: supplier.name.length > 12 ? supplier.name.slice(0, 12) + '...' : supplier.name,
      coffees: supplierCoffees.length,
      orders: supplierOrders.length,
      revenue: supplierOrders.reduce((sum, o) => sum + (o.total_price || 0), 0)
    };
  }).filter(s => s.coffees > 0 || s.orders > 0).slice(0, 6);

  // Monthly orders trend
  const monthlyOrders = orders.reduce((acc: any[], order) => {
    const month = format(new Date(order.order_date), 'MMM', { locale: language === 'ar' ? ar : enUS });
    const existing = acc.find(d => d.month === month);
    if (existing) {
      existing.orders += 1;
      existing.revenue += order.total_price || 0;
    } else {
      acc.push({ month, orders: 1, revenue: order.total_price || 0 });
    }
    return acc;
  }, []);

  // Export to CSV
  const exportToCSV = () => {
    const headers = language === 'ar' 
      ? ['التاريخ', 'نوع التقرير', 'القيمة', 'الوحدة']
      : ['Date', 'Report Type', 'Value', 'Unit'];

    const rows: string[][] = [];

    // Add summary stats
    rows.push([format(new Date(), 'yyyy-MM-dd'), language === 'ar' ? 'إجمالي الطلبات' : 'Total Orders', totalOrders.toString(), '']);
    rows.push([format(new Date(), 'yyyy-MM-dd'), language === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue', totalRevenue.toFixed(2), 'SAR']);
    rows.push([format(new Date(), 'yyyy-MM-dd'), language === 'ar' ? 'إجمالي الكمية' : 'Total Quantity', totalQuantity.toString(), 'kg']);
    rows.push([format(new Date(), 'yyyy-MM-dd'), language === 'ar' ? 'متوسط قيمة الطلب' : 'Avg Order Value', avgOrderValue.toFixed(2), 'SAR']);

    // Add price history
    priceHistory.forEach(record => {
      rows.push([
        format(new Date(record.recorded_at), 'yyyy-MM-dd'),
        language === 'ar' ? 'سعر' : 'Price',
        record.price.toString(),
        record.currency || 'SAR'
      ]);
    });

    const BOM = '\uFEFF';
    const csvContent = BOM + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export to PDF (print)
  const exportToPDF = () => {
    window.print();
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-arabic print:bg-white" dir={dir}>
      {/* Page Title */}
      <div className="container mx-auto px-4 py-6 no-print">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">
              {language === 'ar' ? 'التقارير المتقدمة' : 'Advanced Reports'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">{language === 'ar' ? '7 أيام' : '7 days'}</SelectItem>
                <SelectItem value="30">{language === 'ar' ? '30 يوم' : '30 days'}</SelectItem>
                <SelectItem value="90">{language === 'ar' ? '3 أشهر' : '3 months'}</SelectItem>
                <SelectItem value="365">{language === 'ar' ? 'سنة' : '1 year'}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportToCSV}>
              <FileSpreadsheet className="h-4 w-4 me-2" />
              CSV
            </Button>
            <Button variant="outline" onClick={exportToPDF}>
              <FileText className="h-4 w-4 me-2" />
              PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8" ref={reportRef}>
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <Package className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{totalOrders}</p>
              <p className="text-sm text-muted-foreground">
                {language === 'ar' ? 'إجمالي الطلبات' : 'Total Orders'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <DollarSign className="h-8 w-8 mx-auto mb-2 text-success" />
              <p className="text-2xl font-bold">{totalRevenue.toFixed(0)}</p>
              <p className="text-sm text-muted-foreground">
                {language === 'ar' ? 'إجمالي الإيرادات (ر.س)' : 'Total Revenue (SAR)'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-info" />
              <p className="text-2xl font-bold">{totalQuantity.toFixed(0)}</p>
              <p className="text-sm text-muted-foreground">
                {language === 'ar' ? 'الكمية (كجم)' : 'Quantity (kg)'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 text-warning" />
              <p className="text-2xl font-bold">{avgOrderValue.toFixed(0)}</p>
              <p className="text-sm text-muted-foreground">
                {language === 'ar' ? 'متوسط الطلب (ر.س)' : 'Avg Order (SAR)'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="prices" className="space-y-6">
          <TabsList className="no-print">
            <TabsTrigger value="prices">
              {language === 'ar' ? 'اتجاهات الأسعار' : 'Price Trends'}
            </TabsTrigger>
            <TabsTrigger value="orders">
              {language === 'ar' ? 'تحليل الطلبات' : 'Order Analysis'}
            </TabsTrigger>
            <TabsTrigger value="suppliers">
              {language === 'ar' ? 'أداء الموردين' : 'Supplier Performance'}
            </TabsTrigger>
            <TabsTrigger value="origins">
              {language === 'ar' ? 'بلدان المنشأ' : 'Origins'}
            </TabsTrigger>
          </TabsList>

          {/* Price Trends */}
          <TabsContent value="prices">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  {language === 'ar' ? 'اتجاهات الأسعار' : 'Price Trends'}
                </CardTitle>
                <CardDescription>
                  {language === 'ar' ? 'تغيرات الأسعار خلال الفترة المحددة' : 'Price changes over the selected period'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {priceTrendsData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={priceTrendsData}>
                      <defs>
                        <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#C9A962" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#C9A962" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="price"
                        stroke="#C9A962"
                        strokeWidth={2}
                        fill="url(#priceGradient)"
                        name={language === 'ar' ? 'السعر' : 'Price'}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                    {language === 'ar' ? 'لا توجد بيانات أسعار' : 'No price data available'}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Order Analysis */}
          <TabsContent value="orders">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>{language === 'ar' ? 'حالة الطلبات' : 'Order Status'}</CardTitle>
                </CardHeader>
                <CardContent>
                  {statusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsPieChart>
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          dataKey="value"
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {statusData.map((_, index) => (
                            <Cell key={index} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      {language === 'ar' ? 'لا توجد طلبات' : 'No orders'}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{language === 'ar' ? 'الطلبات الشهرية' : 'Monthly Orders'}</CardTitle>
                </CardHeader>
                <CardContent>
                  {monthlyOrders.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={monthlyOrders}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Bar dataKey="orders" fill="#C9A962" name={language === 'ar' ? 'الطلبات' : 'Orders'} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      {language === 'ar' ? 'لا توجد طلبات' : 'No orders'}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Supplier Performance */}
          <TabsContent value="suppliers">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {language === 'ar' ? 'أداء الموردين' : 'Supplier Performance'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {supplierPerformance.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={supplierPerformance} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                      <YAxis type="category" dataKey="name" width={100} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <Bar dataKey="coffees" fill="#C9A962" name={language === 'ar' ? 'المنتجات' : 'Products'} radius={[0, 4, 4, 0]} />
                      <Bar dataKey="orders" fill="#8B7355" name={language === 'ar' ? 'الطلبات' : 'Orders'} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                    {language === 'ar' ? 'لا توجد بيانات' : 'No data available'}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Origins */}
          <TabsContent value="origins">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coffee className="h-5 w-5" />
                  {language === 'ar' ? 'توزيع بلدان المنشأ' : 'Origin Distribution'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {originData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <RechartsPieChart>
                      <Pie
                        data={originData}
                        cx="50%"
                        cy="50%"
                        outerRadius={150}
                        innerRadius={60}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {originData.map((_, index) => (
                          <Cell key={index} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                    {language === 'ar' ? 'لا توجد بيانات' : 'No data available'}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Print Footer */}
        <div className="hidden print:block mt-8 text-center text-sm text-muted-foreground border-t pt-4">
          <p>{language === 'ar' ? 'تم إنشاء التقرير بتاريخ' : 'Report generated on'}: {format(new Date(), 'PPP', { locale: language === 'ar' ? ar : enUS })}</p>
          <p>{language === 'ar' ? 'منصة دال للقهوة المختصة' : 'Dal Specialty Coffee Platform'}</p>
        </div>
      </main>
    </div>
  );
};

export default Reports;
