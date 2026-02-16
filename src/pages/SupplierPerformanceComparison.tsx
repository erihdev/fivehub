import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, ArrowLeft, TrendingUp, TrendingDown, 
  Minus, Target, Clock, Package, Award
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar, LineChart, Line
} from 'recharts';

interface SupplierData {
  id: string;
  name: string;
  performance_score: number | null;
  total_orders: number | null;
  delayed_orders: number | null;
  avg_delay_days: number | null;
}

interface PlatformAverage {
  performance_score: number;
  total_orders: number;
  delayed_orders: number;
  avg_delay_days: number;
  on_time_rate: number;
}

const SupplierPerformanceComparison = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState<SupplierData | null>(null);
  const [platformAvg, setPlatformAvg] = useState<PlatformAverage | null>(null);
  const [allSuppliers, setAllSuppliers] = useState<SupplierData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isRtl = language === 'ar';

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      // Get current supplier
      const { data: mySupplier } = await supabase
        .from('suppliers')
        .select('id, name, performance_score, total_orders, delayed_orders, avg_delay_days')
        .eq('user_id', user!.id)
        .single();

      if (mySupplier) {
        setSupplier(mySupplier);
      }

      // Get all suppliers for platform average
      const { data: suppliers } = await supabase
        .from('suppliers')
        .select('id, name, performance_score, total_orders, delayed_orders, avg_delay_days')
        .not('performance_score', 'is', null);

      if (suppliers && suppliers.length > 0) {
        setAllSuppliers(suppliers);

        // Calculate platform averages
        const validSuppliers = suppliers.filter(s => s.performance_score !== null);
        const avgScore = validSuppliers.reduce((sum, s) => sum + (s.performance_score || 0), 0) / validSuppliers.length;
        const avgOrders = validSuppliers.reduce((sum, s) => sum + (s.total_orders || 0), 0) / validSuppliers.length;
        const avgDelayed = validSuppliers.reduce((sum, s) => sum + (s.delayed_orders || 0), 0) / validSuppliers.length;
        const avgDelayDays = validSuppliers.reduce((sum, s) => sum + (s.avg_delay_days || 0), 0) / validSuppliers.length;
        
        const totalOrdersSum = validSuppliers.reduce((sum, s) => sum + (s.total_orders || 0), 0);
        const delayedSum = validSuppliers.reduce((sum, s) => sum + (s.delayed_orders || 0), 0);
        const onTimeRate = totalOrdersSum > 0 ? ((totalOrdersSum - delayedSum) / totalOrdersSum) * 100 : 0;

        setPlatformAvg({
          performance_score: avgScore,
          total_orders: avgOrders,
          delayed_orders: avgDelayed,
          avg_delay_days: avgDelayDays,
          on_time_rate: onTimeRate,
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getComparisonStatus = (myValue: number, avgValue: number, lowerIsBetter = false) => {
    const diff = lowerIsBetter ? avgValue - myValue : myValue - avgValue;
    const percentage = avgValue > 0 ? (diff / avgValue) * 100 : 0;

    if (Math.abs(percentage) < 5) {
      return { icon: Minus, color: 'text-gray-500', label: language === 'ar' ? 'مماثل' : 'Similar' };
    }
    if (percentage > 0) {
      return { icon: TrendingUp, color: 'text-green-500', label: language === 'ar' ? 'أفضل' : 'Better' };
    }
    return { icon: TrendingDown, color: 'text-red-500', label: language === 'ar' ? 'أقل' : 'Lower' };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="container mx-auto px-4 py-8">
          <Button variant="ghost" className="gap-2 mb-6" onClick={() => navigate(-1)}>
            {isRtl ? <ArrowLeft className="w-4 h-4 rotate-180" /> : <ArrowLeft className="w-4 h-4" />}
            {language === 'ar' ? 'رجوع' : 'Back'}
          </Button>
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-muted-foreground">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!supplier || !platformAvg) {
    return (
      <div className="min-h-screen bg-background" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="container mx-auto px-4 py-8">
          <Button variant="ghost" className="gap-2 mb-6" onClick={() => navigate(-1)}>
            {isRtl ? <ArrowLeft className="w-4 h-4 rotate-180" /> : <ArrowLeft className="w-4 h-4" />}
            {language === 'ar' ? 'رجوع' : 'Back'}
          </Button>
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-muted-foreground">
              {language === 'ar' ? 'لا توجد بيانات كافية للمقارنة' : 'Not enough data for comparison'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const myOnTimeRate = supplier.total_orders && supplier.total_orders > 0
    ? ((supplier.total_orders - (supplier.delayed_orders || 0)) / supplier.total_orders) * 100
    : 0;

  // Bar chart data
  const barChartData = [
    {
      name: language === 'ar' ? 'نسبة الأداء' : 'Performance',
      [language === 'ar' ? 'أنت' : 'You']: supplier.performance_score || 0,
      [language === 'ar' ? 'متوسط المنصة' : 'Platform Avg']: platformAvg.performance_score,
    },
    {
      name: language === 'ar' ? 'نسبة التسليم' : 'On-Time Rate',
      [language === 'ar' ? 'أنت' : 'You']: myOnTimeRate,
      [language === 'ar' ? 'متوسط المنصة' : 'Platform Avg']: platformAvg.on_time_rate,
    },
  ];

  // Radar chart data
  const radarData = [
    {
      subject: language === 'ar' ? 'الأداء' : 'Performance',
      you: (supplier.performance_score || 0),
      avg: platformAvg.performance_score,
      fullMark: 100,
    },
    {
      subject: language === 'ar' ? 'التسليم' : 'Delivery',
      you: myOnTimeRate,
      avg: platformAvg.on_time_rate,
      fullMark: 100,
    },
    {
      subject: language === 'ar' ? 'الطلبات' : 'Orders',
      you: Math.min((supplier.total_orders || 0) / Math.max(platformAvg.total_orders, 1) * 50, 100),
      avg: 50,
      fullMark: 100,
    },
    {
      subject: language === 'ar' ? 'السرعة' : 'Speed',
      you: Math.max(0, 100 - (supplier.avg_delay_days || 0) * 10),
      avg: Math.max(0, 100 - platformAvg.avg_delay_days * 10),
      fullMark: 100,
    },
  ];

  // Ranking data
  const sortedSuppliers = [...allSuppliers].sort((a, b) => 
    (b.performance_score || 0) - (a.performance_score || 0)
  );
  const myRank = sortedSuppliers.findIndex(s => s.id === supplier.id) + 1;

  return (
    <div className="min-h-screen bg-background" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className={`h-5 w-5 ${isRtl ? 'rotate-180' : ''}`} />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-primary" />
              {language === 'ar' ? 'مقارنة أدائي' : 'My Performance Comparison'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {language === 'ar' ? 'قارن أداءك مع متوسط المنصة' : 'Compare your performance with platform average'}
            </p>
          </div>
        </div>

        {/* Rank Card */}
        <Card className="mb-8 bg-gradient-to-r from-primary/10 to-primary/5">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">{supplier.name}</h2>
                <p className="text-muted-foreground">
                  {language === 'ar' ? 'ترتيبك بين الموردين' : 'Your rank among suppliers'}
                </p>
              </div>
              <div className="text-center">
                <div className="text-5xl font-bold text-primary">#{myRank}</div>
                <div className="text-sm text-muted-foreground">
                  {language === 'ar' ? `من ${sortedSuppliers.length}` : `of ${sortedSuppliers.length}`}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comparison Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {[
            {
              label: language === 'ar' ? 'نسبة الأداء' : 'Performance Score',
              myValue: supplier.performance_score || 0,
              avgValue: platformAvg.performance_score,
              icon: Award,
              suffix: '%',
            },
            {
              label: language === 'ar' ? 'نسبة التسليم في الوقت' : 'On-Time Rate',
              myValue: myOnTimeRate,
              avgValue: platformAvg.on_time_rate,
              icon: Clock,
              suffix: '%',
            },
            {
              label: language === 'ar' ? 'إجمالي الطلبات' : 'Total Orders',
              myValue: supplier.total_orders || 0,
              avgValue: platformAvg.total_orders,
              icon: Package,
              suffix: '',
            },
            {
              label: language === 'ar' ? 'متوسط التأخير' : 'Avg Delay',
              myValue: supplier.avg_delay_days || 0,
              avgValue: platformAvg.avg_delay_days,
              icon: Target,
              suffix: language === 'ar' ? ' يوم' : ' days',
              lowerIsBetter: true,
            },
          ].map((item, index) => {
            const status = getComparisonStatus(item.myValue, item.avgValue, item.lowerIsBetter);
            const StatusIcon = status.icon;
            return (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <item.icon className="w-8 h-8 text-primary" />
                    <div className={`flex items-center gap-1 ${status.color}`}>
                      <StatusIcon className="w-4 h-4" />
                      <span className="text-sm">{status.label}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-end">
                      <span className="text-sm text-muted-foreground">{item.label}</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <div>
                        <span className="text-2xl font-bold">{item.myValue.toFixed(1)}</span>
                        <span className="text-sm text-muted-foreground">{item.suffix}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {language === 'ar' ? 'المتوسط:' : 'Avg:'} {item.avgValue.toFixed(1)}{item.suffix}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>{language === 'ar' ? 'مقارنة الأداء' : 'Performance Comparison'}</CardTitle>
              <CardDescription>
                {language === 'ar' ? 'مقارنة مع متوسط المنصة' : 'Compared to platform average'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar 
                    dataKey={language === 'ar' ? 'أنت' : 'You'} 
                    fill="hsl(var(--primary))" 
                  />
                  <Bar 
                    dataKey={language === 'ar' ? 'متوسط المنصة' : 'Platform Avg'} 
                    fill="hsl(var(--muted-foreground))" 
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Radar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>{language === 'ar' ? 'تحليل شامل' : 'Comprehensive Analysis'}</CardTitle>
              <CardDescription>
                {language === 'ar' ? 'مقارنة متعددة الأبعاد' : 'Multi-dimensional comparison'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  <Radar
                    name={language === 'ar' ? 'أنت' : 'You'}
                    dataKey="you"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.5}
                  />
                  <Radar
                    name={language === 'ar' ? 'المتوسط' : 'Average'}
                    dataKey="avg"
                    stroke="hsl(var(--muted-foreground))"
                    fill="hsl(var(--muted-foreground))"
                    fillOpacity={0.3}
                  />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Top Performers */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{language === 'ar' ? 'ترتيب الموردين' : 'Supplier Rankings'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sortedSuppliers.slice(0, 10).map((s, index) => (
                <div
                  key={s.id}
                  className={`flex items-center gap-4 p-3 rounded-lg ${
                    s.id === supplier.id ? 'bg-primary/10 border border-primary/30' : 'bg-muted/30'
                  }`}
                >
                  <div className="w-8 text-center font-bold text-lg">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <span className={s.id === supplier.id ? 'font-bold' : ''}>
                      {s.name}
                      {s.id === supplier.id && (
                        <Badge className="mr-2 bg-primary text-primary-foreground text-xs">
                          {language === 'ar' ? 'أنت' : 'You'}
                        </Badge>
                      )}
                    </span>
                  </div>
                  <div className="text-lg font-semibold">
                    {s.performance_score}%
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SupplierPerformanceComparison;
