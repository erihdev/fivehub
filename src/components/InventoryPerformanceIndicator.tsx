import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Minus, Package, ShoppingCart, AlertTriangle, RefreshCw, Loader2, Bell, Mail, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from '@/hooks/use-toast';
import { subDays, startOfDay } from 'date-fns';

interface PerformanceMetrics {
  currentPeriod: {
    totalStock: number;
    lowStockItems: number;
    ordersCount: number;
    ordersValue: number;
    autoReorders: number;
    stockTurnover: number;
  };
  previousPeriod: {
    totalStock: number;
    lowStockItems: number;
    ordersCount: number;
    ordersValue: number;
    autoReorders: number;
    stockTurnover: number;
  };
}

const InventoryPerformanceIndicator = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useLanguage();
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingAlert, setIsSendingAlert] = useState(false);

  const isArabic = language === 'ar';

  useEffect(() => {
    if (user) {
      fetchMetrics();
    }
  }, [user]);

  const fetchMetrics = async () => {
    setIsLoading(true);
    
    const now = new Date();
    const periodDays = 7;
    const currentStart = startOfDay(subDays(now, periodDays));
    const previousStart = startOfDay(subDays(now, periodDays * 2));
    const previousEnd = startOfDay(subDays(now, periodDays));

    // Fetch current inventory
    const { data: inventory } = await supabase
      .from('inventory')
      .select('quantity_kg, min_quantity_kg');

    // Fetch current period orders
    const { data: currentOrders } = await supabase
      .from('orders')
      .select('quantity_kg, total_price, notes')
      .gte('order_date', currentStart.toISOString().split('T')[0]);

    // Fetch previous period orders
    const { data: previousOrders } = await supabase
      .from('orders')
      .select('quantity_kg, total_price, notes')
      .gte('order_date', previousStart.toISOString().split('T')[0])
      .lt('order_date', previousEnd.toISOString().split('T')[0]);

    const totalStock = inventory?.reduce((sum, i) => sum + (i.quantity_kg || 0), 0) || 0;
    const lowStockItems = inventory?.filter(i => i.quantity_kg <= i.min_quantity_kg).length || 0;

    const currentOrdersCount = currentOrders?.length || 0;
    const currentOrdersValue = currentOrders?.reduce((sum, o) => sum + (o.total_price || 0), 0) || 0;
    const currentAutoReorders = currentOrders?.filter(o => 
      o.notes?.includes('طلب تلقائي') || o.notes?.includes('auto')
    ).length || 0;
    const currentQuantity = currentOrders?.reduce((sum, o) => sum + (o.quantity_kg || 0), 0) || 0;

    const previousOrdersCount = previousOrders?.length || 0;
    const previousOrdersValue = previousOrders?.reduce((sum, o) => sum + (o.total_price || 0), 0) || 0;
    const previousAutoReorders = previousOrders?.filter(o => 
      o.notes?.includes('طلب تلقائي') || o.notes?.includes('auto')
    ).length || 0;
    const previousQuantity = previousOrders?.reduce((sum, o) => sum + (o.quantity_kg || 0), 0) || 0;

    // Stock turnover = orders quantity / average stock
    const currentTurnover = totalStock > 0 ? (currentQuantity / totalStock) * 100 : 0;
    const previousTurnover = totalStock > 0 ? (previousQuantity / totalStock) * 100 : 0;

    setMetrics({
      currentPeriod: {
        totalStock,
        lowStockItems,
        ordersCount: currentOrdersCount,
        ordersValue: currentOrdersValue,
        autoReorders: currentAutoReorders,
        stockTurnover: currentTurnover,
      },
      previousPeriod: {
        totalStock,
        lowStockItems: 0,
        ordersCount: previousOrdersCount,
        ordersValue: previousOrdersValue,
        autoReorders: previousAutoReorders,
        stockTurnover: previousTurnover,
      },
    });

    setIsLoading(false);
  };

  const getChangePercent = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const getChangeIcon = (current: number, previous: number, inverse = false) => {
    const isUp = current > previous;
    const isDown = current < previous;
    
    if (isUp) {
      return inverse 
        ? <TrendingUp className="h-4 w-4 text-red-500" />
        : <TrendingUp className="h-4 w-4 text-green-500" />;
    }
    if (isDown) {
      return inverse 
        ? <TrendingDown className="h-4 w-4 text-green-500" />
        : <TrendingDown className="h-4 w-4 text-red-500" />;
    }
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getPerformanceScore = () => {
    if (!metrics) return 0;
    
    let score = 50; // Base score
    
    // Orders growth is positive
    const ordersChange = getChangePercent(metrics.currentPeriod.ordersCount, metrics.previousPeriod.ordersCount);
    score += Math.min(ordersChange / 2, 20);
    
    // Low stock is negative
    score -= metrics.currentPeriod.lowStockItems * 5;
    
    // Good turnover is positive
    if (metrics.currentPeriod.stockTurnover > 20) score += 10;
    
    return Math.max(0, Math.min(100, Math.round(score)));
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 70) return isArabic ? 'ممتاز' : 'Excellent';
    if (score >= 40) return isArabic ? 'جيد' : 'Good';
    return isArabic ? 'يحتاج تحسين' : 'Needs Improvement';
  };

  const sendPerformanceAlert = async () => {
    if (!user) return;
    
    setIsSendingAlert(true);
    try {
      const { data, error } = await supabase.functions.invoke('performance-alert', {
        body: { userId: user.id, threshold: 40 },
      });

      if (error) throw error;

      if (data.emailSent) {
        toast({
          title: isArabic ? 'تم الإرسال' : 'Sent',
          description: isArabic 
            ? `تم إرسال تنبيه الأداء إلى بريدك الإلكتروني` 
            : 'Performance alert sent to your email',
        });
      } else {
        toast({
          title: isArabic ? 'لا حاجة للتنبيه' : 'No Alert Needed',
          description: isArabic 
            ? `مؤشر الأداء (${data.score}) أعلى من الحد الأدنى (${data.threshold})` 
            : `Performance (${data.score}) is above threshold (${data.threshold})`,
        });
      }
    } catch (error) {
      console.error('Error sending alert:', error);
      toast({
        variant: 'destructive',
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'فشل إرسال التنبيه' : 'Failed to send alert',
      });
    } finally {
      setIsSendingAlert(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="h-6 w-6 mx-auto animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!metrics) return null;

  const performanceScore = getPerformanceScore();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          {isArabic ? 'مؤشر أداء المخزون' : 'Inventory Performance'}
          <Badge variant="outline" className="mr-auto">
            {isArabic ? 'آخر 7 أيام' : 'Last 7 days'}
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={sendPerformanceAlert}
            disabled={isSendingAlert}
          >
            {isSendingAlert ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Mail className="h-4 w-4 ml-1" />
                {isArabic ? 'تنبيه بريدي' : 'Email Alert'}
              </>
            )}
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/performance-alert-settings')}
            title={isArabic ? 'إعدادات التنبيهات' : 'Alert Settings'}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div className="text-center p-4 rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground mb-2">
            {isArabic ? 'النتيجة الإجمالية' : 'Overall Score'}
          </p>
          <p className={`text-5xl font-bold ${getScoreColor(performanceScore)}`}>
            {performanceScore}
          </p>
          <Badge variant="secondary" className="mt-2">
            {getScoreLabel(performanceScore)}
          </Badge>
          <Progress value={performanceScore} className="mt-3 h-2" />
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Orders */}
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center justify-between mb-2">
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              {getChangeIcon(metrics.currentPeriod.ordersCount, metrics.previousPeriod.ordersCount)}
            </div>
            <p className="text-2xl font-bold">{metrics.currentPeriod.ordersCount}</p>
            <p className="text-xs text-muted-foreground">
              {isArabic ? 'الطلبات' : 'Orders'}
            </p>
            <p className={`text-xs mt-1 ${
              getChangePercent(metrics.currentPeriod.ordersCount, metrics.previousPeriod.ordersCount) >= 0 
                ? 'text-green-600' : 'text-red-600'
            }`}>
              {getChangePercent(metrics.currentPeriod.ordersCount, metrics.previousPeriod.ordersCount)}%
              {isArabic ? ' من الفترة السابقة' : ' vs previous'}
            </p>
          </div>

          {/* Orders Value */}
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">SAR</span>
              {getChangeIcon(metrics.currentPeriod.ordersValue, metrics.previousPeriod.ordersValue)}
            </div>
            <p className="text-2xl font-bold">{metrics.currentPeriod.ordersValue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">
              {isArabic ? 'قيمة الطلبات' : 'Orders Value'}
            </p>
            <p className={`text-xs mt-1 ${
              getChangePercent(metrics.currentPeriod.ordersValue, metrics.previousPeriod.ordersValue) >= 0 
                ? 'text-green-600' : 'text-red-600'
            }`}>
              {getChangePercent(metrics.currentPeriod.ordersValue, metrics.previousPeriod.ordersValue)}%
              {isArabic ? ' من الفترة السابقة' : ' vs previous'}
            </p>
          </div>

          {/* Low Stock */}
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              {metrics.currentPeriod.lowStockItems > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {isArabic ? 'تنبيه' : 'Alert'}
                </Badge>
              )}
            </div>
            <p className="text-2xl font-bold">{metrics.currentPeriod.lowStockItems}</p>
            <p className="text-xs text-muted-foreground">
              {isArabic ? 'مخزون منخفض' : 'Low Stock Items'}
            </p>
          </div>

          {/* Auto Reorders */}
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center justify-between mb-2">
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
              {getChangeIcon(metrics.currentPeriod.autoReorders, metrics.previousPeriod.autoReorders)}
            </div>
            <p className="text-2xl font-bold">{metrics.currentPeriod.autoReorders}</p>
            <p className="text-xs text-muted-foreground">
              {isArabic ? 'طلبات تلقائية' : 'Auto Reorders'}
            </p>
          </div>
        </div>

        {/* Stock Turnover */}
        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              {isArabic ? 'معدل دوران المخزون' : 'Stock Turnover Rate'}
            </span>
            {getChangeIcon(metrics.currentPeriod.stockTurnover, metrics.previousPeriod.stockTurnover)}
          </div>
          <div className="flex items-end gap-4">
            <div>
              <p className="text-3xl font-bold">{Math.round(metrics.currentPeriod.stockTurnover)}%</p>
              <p className="text-xs text-muted-foreground">
                {isArabic ? 'الفترة الحالية' : 'Current Period'}
              </p>
            </div>
            <div className="text-muted-foreground">
              <p className="text-xl">{Math.round(metrics.previousPeriod.stockTurnover)}%</p>
              <p className="text-xs">
                {isArabic ? 'الفترة السابقة' : 'Previous Period'}
              </p>
            </div>
          </div>
          <Progress 
            value={Math.min(metrics.currentPeriod.stockTurnover, 100)} 
            className="mt-3 h-2" 
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default InventoryPerformanceIndicator;
