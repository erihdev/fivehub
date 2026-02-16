import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Coffee,
  ArrowLeft,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Award,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
  Download,
  RefreshCw,
  Building2,
  Ban,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import * as XLSX from 'xlsx';

interface SupplierPerformance {
  id: string;
  name: string;
  totalOrders: number;
  delayedOrders: number;
  onTimeOrders: number;
  delayPercentage: number;
  avgDelayDays: number;
  performanceScore: number;
  performanceLevel: 'excellent' | 'good' | 'average' | 'poor';
  isSuspended: boolean;
  trend: 'up' | 'down' | 'stable';
  previousScore: number;
}

interface PerformanceHistory {
  month: string;
  avgScore: number;
  avgDelayPercentage: number;
}

const SupplierPerformanceReport = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { language, t, dir } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<SupplierPerformance[]>([]);
  const [history, setHistory] = useState<PerformanceHistory[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'1' | '3' | '6' | '12'>('3');
  const [isUpdating, setIsUpdating] = useState(false);

  const isRtl = dir === 'rtl';
  const dateLocale = language === 'ar' ? ar : enUS;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const calculatePerformanceMetrics = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const monthsAgo = parseInt(selectedPeriod);
      const startDate = startOfMonth(subMonths(new Date(), monthsAgo));
      const endDate = endOfMonth(new Date());
      const previousStart = startOfMonth(subMonths(startDate, monthsAgo));
      const previousEnd = endOfMonth(subMonths(endDate, monthsAgo));

      // Fetch all suppliers
      const { data: suppliersData, error: suppliersError } = await supabase
        .from('suppliers')
        .select('id, name, is_suspended, performance_score, performance_level');

      if (suppliersError) throw suppliersError;

      // Fetch orders for current period
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, supplier_id, expected_delivery, actual_delivery, status, order_date')
        .gte('order_date', startDate.toISOString())
        .lte('order_date', endDate.toISOString());

      if (ordersError) throw ordersError;

      // Fetch orders for previous period (for trend)
      const { data: previousOrdersData } = await supabase
        .from('orders')
        .select('id, supplier_id, expected_delivery, actual_delivery, status, order_date')
        .gte('order_date', previousStart.toISOString())
        .lte('order_date', previousEnd.toISOString());

      // Calculate metrics for each supplier
      const supplierMetrics: SupplierPerformance[] = (suppliersData || []).map((supplier) => {
        const supplierOrders = (ordersData || []).filter(o => o.supplier_id === supplier.id);
        const deliveredOrders = supplierOrders.filter(o => o.status === 'delivered' && o.actual_delivery && o.expected_delivery);
        
        const delayedOrders = deliveredOrders.filter(o => {
          const expected = new Date(o.expected_delivery!);
          const actual = new Date(o.actual_delivery!);
          return actual > expected;
        });

        const totalDelayDays = delayedOrders.reduce((sum, o) => {
          const expected = new Date(o.expected_delivery!);
          const actual = new Date(o.actual_delivery!);
          return sum + Math.max(0, Math.ceil((actual.getTime() - expected.getTime()) / (1000 * 60 * 60 * 24)));
        }, 0);

        const delayPercentage = deliveredOrders.length > 0 
          ? (delayedOrders.length / deliveredOrders.length) * 100 
          : 0;
        
        const avgDelayDays = delayedOrders.length > 0 
          ? totalDelayDays / delayedOrders.length 
          : 0;

        // Calculate performance score (100 - penalties)
        let performanceScore = 100;
        performanceScore -= delayPercentage * 0.5; // -0.5 per percentage point of delay
        performanceScore -= avgDelayDays * 2; // -2 per average delay day
        performanceScore = Math.max(0, Math.min(100, performanceScore));

        // Determine level
        let performanceLevel: 'excellent' | 'good' | 'average' | 'poor' = 'excellent';
        if (performanceScore >= 90) performanceLevel = 'excellent';
        else if (performanceScore >= 70) performanceLevel = 'good';
        else if (performanceScore >= 50) performanceLevel = 'average';
        else performanceLevel = 'poor';

        // Calculate previous period score for trend
        const prevOrders = (previousOrdersData || []).filter(o => o.supplier_id === supplier.id);
        const prevDelivered = prevOrders.filter(o => o.status === 'delivered' && o.actual_delivery && o.expected_delivery);
        const prevDelayed = prevDelivered.filter(o => {
          const expected = new Date(o.expected_delivery!);
          const actual = new Date(o.actual_delivery!);
          return actual > expected;
        });
        const prevDelayPct = prevDelivered.length > 0 ? (prevDelayed.length / prevDelivered.length) * 100 : 0;
        let previousScore = 100 - (prevDelayPct * 0.5);

        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (performanceScore > previousScore + 5) trend = 'up';
        else if (performanceScore < previousScore - 5) trend = 'down';

        return {
          id: supplier.id,
          name: supplier.name,
          totalOrders: deliveredOrders.length,
          delayedOrders: delayedOrders.length,
          onTimeOrders: deliveredOrders.length - delayedOrders.length,
          delayPercentage,
          avgDelayDays,
          performanceScore,
          performanceLevel,
          isSuspended: supplier.is_suspended || false,
          trend,
          previousScore,
        };
      });

      // Sort by performance score descending
      supplierMetrics.sort((a, b) => b.performanceScore - a.performanceScore);
      setSuppliers(supplierMetrics);

      // Calculate monthly history
      const monthlyData: PerformanceHistory[] = [];
      for (let i = monthsAgo - 1; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(new Date(), i));
        const monthEnd = endOfMonth(subMonths(new Date(), i));
        
        const monthOrders = (ordersData || []).filter(o => {
          const orderDate = new Date(o.order_date);
          return orderDate >= monthStart && orderDate <= monthEnd;
        });
        
        const monthDelivered = monthOrders.filter(o => o.status === 'delivered' && o.actual_delivery && o.expected_delivery);
        const monthDelayed = monthDelivered.filter(o => {
          const expected = new Date(o.expected_delivery!);
          const actual = new Date(o.actual_delivery!);
          return actual > expected;
        });
        
        const delayPct = monthDelivered.length > 0 ? (monthDelayed.length / monthDelivered.length) * 100 : 0;
        const avgScore = 100 - (delayPct * 0.5);
        
        monthlyData.push({
          month: format(monthStart, 'MMM yyyy', { locale: dateLocale }),
          avgScore: Math.round(avgScore),
          avgDelayPercentage: Math.round(delayPct * 10) / 10,
        });
      }
      setHistory(monthlyData);

    } catch (error) {
      console.error('Error calculating metrics:', error);
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل في حساب الأداء' : 'Failed to calculate performance',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    calculatePerformanceMetrics();
  }, [user, selectedPeriod]);

  const handleSuspendSupplier = async (supplierId: string, suspend: boolean) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('suppliers')
        .update({
          is_suspended: suspend,
          suspended_at: suspend ? new Date().toISOString() : null,
          suspension_reason: suspend ? 'Poor performance - automatic suspension' : null,
        })
        .eq('id', supplierId);

      if (error) throw error;

      toast({
        title: language === 'ar' ? 'تم التحديث' : 'Updated',
        description: suspend 
          ? (language === 'ar' ? 'تم إيقاف المورد' : 'Supplier suspended')
          : (language === 'ar' ? 'تم إعادة تفعيل المورد' : 'Supplier reactivated'),
      });

      calculatePerformanceMetrics();
    } catch (error) {
      console.error('Error updating supplier:', error);
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل في تحديث المورد' : 'Failed to update supplier',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const exportToExcel = () => {
    const data = suppliers.map(s => ({
      [language === 'ar' ? 'المورد' : 'Supplier']: s.name,
      [language === 'ar' ? 'الطلبات' : 'Orders']: s.totalOrders,
      [language === 'ar' ? 'في الوقت' : 'On Time']: s.onTimeOrders,
      [language === 'ar' ? 'متأخرة' : 'Delayed']: s.delayedOrders,
      [language === 'ar' ? 'نسبة التأخير %' : 'Delay %']: s.delayPercentage.toFixed(1),
      [language === 'ar' ? 'متوسط التأخير (يوم)' : 'Avg Delay (days)']: s.avgDelayDays.toFixed(1),
      [language === 'ar' ? 'النتيجة' : 'Score']: s.performanceScore.toFixed(0),
      [language === 'ar' ? 'المستوى' : 'Level']: s.performanceLevel,
      [language === 'ar' ? 'الحالة' : 'Status']: s.isSuspended 
        ? (language === 'ar' ? 'موقوف' : 'Suspended')
        : (language === 'ar' ? 'نشط' : 'Active'),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Performance');
    XLSX.writeFile(wb, `supplier-performance-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);

    toast({
      title: language === 'ar' ? 'تم التصدير' : 'Exported',
      description: language === 'ar' ? 'تم تصدير التقرير بنجاح' : 'Report exported successfully',
    });
  };

  const getLevelBadge = (level: string, isSuspended: boolean) => {
    if (isSuspended) {
      return <Badge variant="destructive" className="gap-1"><Ban className="w-3 h-3" />{language === 'ar' ? 'موقوف' : 'Suspended'}</Badge>;
    }
    
    switch (level) {
      case 'excellent':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20 gap-1"><Award className="w-3 h-3" />{language === 'ar' ? 'ممتاز' : 'Excellent'}</Badge>;
      case 'good':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 gap-1"><CheckCircle className="w-3 h-3" />{language === 'ar' ? 'جيد' : 'Good'}</Badge>;
      case 'average':
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 gap-1"><Minus className="w-3 h-3" />{language === 'ar' ? 'متوسط' : 'Average'}</Badge>;
      case 'poor':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20 gap-1"><AlertTriangle className="w-3 h-3" />{language === 'ar' ? 'ضعيف' : 'Poor'}</Badge>;
      default:
        return null;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  // Calculate summary stats
  const avgScore = suppliers.length > 0 
    ? suppliers.reduce((sum, s) => sum + s.performanceScore, 0) / suppliers.length 
    : 0;
  const excellentCount = suppliers.filter(s => s.performanceLevel === 'excellent').length;
  const poorCount = suppliers.filter(s => s.performanceLevel === 'poor').length;
  const suspendedCount = suppliers.filter(s => s.isSuspended).length;

  if (authLoading || isLoading) {
    return (
      <main className="min-h-screen bg-background font-arabic flex items-center justify-center" dir={dir}>
        <Loader2 className="w-10 h-10 text-coffee-gold animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background font-arabic" dir={dir}>
      {/* Header */}
      <header className="bg-primary py-6">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center gap-2">
                <Coffee className="w-8 h-8 text-coffee-gold" />
                <span className="text-2xl font-display font-bold text-primary-foreground">
                  {t('brand.name')}
                </span>
              </Link>
            </div>
            <nav className="flex items-center gap-4">
              <LanguageSwitcher />
              <Link to="/admin-landing">
                <Button variant="ghost" className="text-primary-foreground">
                  <ArrowLeft className={`w-4 h-4 ${isRtl ? 'ml-2 rotate-180' : 'mr-2'}`} />
                  {language === 'ar' ? 'العودة للوحة الرئيسية' : 'Back to Main Panel'}
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">
              {language === 'ar' ? 'تقرير أداء الموردين' : 'Supplier Performance Report'}
            </h1>
            <p className="text-muted-foreground">
              {language === 'ar' 
                ? 'تحليل شامل لأداء الموردين مع مقارنة الفترات' 
                : 'Comprehensive supplier performance analysis with period comparison'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as any)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">{language === 'ar' ? 'شهر واحد' : '1 Month'}</SelectItem>
                <SelectItem value="3">{language === 'ar' ? '3 أشهر' : '3 Months'}</SelectItem>
                <SelectItem value="6">{language === 'ar' ? '6 أشهر' : '6 Months'}</SelectItem>
                <SelectItem value="12">{language === 'ar' ? '12 شهر' : '12 Months'}</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={calculatePerformanceMetrics} variant="outline">
              <RefreshCw className={`w-4 h-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
              {language === 'ar' ? 'تحديث' : 'Refresh'}
            </Button>
            <Button onClick={exportToExcel} variant="coffee">
              <Download className={`w-4 h-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
              {language === 'ar' ? 'تصدير Excel' : 'Export Excel'}
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{suppliers.length}</p>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'إجمالي الموردين' : 'Total Suppliers'}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <Award className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{excellentCount}</p>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'أداء ممتاز' : 'Excellent Performance'}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{poorCount}</p>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'أداء ضعيف' : 'Poor Performance'}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgScore.toFixed(0)}%</p>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'متوسط الأداء' : 'Average Score'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>{language === 'ar' ? 'تطور الأداء الشهري' : 'Monthly Performance Trend'}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={history}>
                  <XAxis dataKey="month" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="avgScore" 
                    stroke="hsl(var(--primary))" 
                    name={language === 'ar' ? 'متوسط النتيجة' : 'Avg Score'}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{language === 'ar' ? 'نسبة التأخير الشهرية' : 'Monthly Delay Rate'}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={history}>
                  <XAxis dataKey="month" />
                  <YAxis domain={[0, 'auto']} />
                  <Tooltip />
                  <Bar 
                    dataKey="avgDelayPercentage" 
                    fill="hsl(var(--destructive))" 
                    name={language === 'ar' ? 'نسبة التأخير %' : 'Delay Rate %'}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Suppliers Table */}
        <Card>
          <CardHeader>
            <CardTitle>{language === 'ar' ? 'تفاصيل أداء الموردين' : 'Supplier Performance Details'}</CardTitle>
            <CardDescription>
              {language === 'ar' 
                ? 'قائمة بجميع الموردين مرتبة حسب الأداء' 
                : 'All suppliers sorted by performance'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === 'ar' ? 'المورد' : 'Supplier'}</TableHead>
                  <TableHead className="text-center">{language === 'ar' ? 'الطلبات' : 'Orders'}</TableHead>
                  <TableHead className="text-center">{language === 'ar' ? 'في الوقت' : 'On Time'}</TableHead>
                  <TableHead className="text-center">{language === 'ar' ? 'متأخرة' : 'Delayed'}</TableHead>
                  <TableHead className="text-center">{language === 'ar' ? 'نسبة التأخير' : 'Delay %'}</TableHead>
                  <TableHead className="text-center">{language === 'ar' ? 'النتيجة' : 'Score'}</TableHead>
                  <TableHead className="text-center">{language === 'ar' ? 'الاتجاه' : 'Trend'}</TableHead>
                  <TableHead className="text-center">{language === 'ar' ? 'المستوى' : 'Level'}</TableHead>
                  <TableHead className="text-center">{language === 'ar' ? 'إجراء' : 'Action'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((supplier) => (
                  <TableRow key={supplier.id} className={supplier.isSuspended ? 'opacity-60' : ''}>
                    <TableCell className="font-medium">{supplier.name}</TableCell>
                    <TableCell className="text-center">{supplier.totalOrders}</TableCell>
                    <TableCell className="text-center text-green-600">{supplier.onTimeOrders}</TableCell>
                    <TableCell className="text-center text-red-600">{supplier.delayedOrders}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center gap-2 justify-center">
                        <Progress 
                          value={100 - supplier.delayPercentage} 
                          className="w-16 h-2"
                        />
                        <span className="text-sm">{supplier.delayPercentage.toFixed(1)}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-bold">{supplier.performanceScore.toFixed(0)}</TableCell>
                    <TableCell className="text-center">{getTrendIcon(supplier.trend)}</TableCell>
                    <TableCell className="text-center">{getLevelBadge(supplier.performanceLevel, supplier.isSuspended)}</TableCell>
                    <TableCell className="text-center">
                      {supplier.isSuspended ? (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleSuspendSupplier(supplier.id, false)}
                          disabled={isUpdating}
                        >
                          {language === 'ar' ? 'إعادة تفعيل' : 'Reactivate'}
                        </Button>
                      ) : supplier.performanceLevel === 'poor' ? (
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleSuspendSupplier(supplier.id, true)}
                          disabled={isUpdating}
                        >
                          <Ban className="w-3 h-3 mr-1" />
                          {language === 'ar' ? 'إيقاف' : 'Suspend'}
                        </Button>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {suppliers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      {language === 'ar' ? 'لا توجد بيانات' : 'No data available'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default SupplierPerformanceReport;
