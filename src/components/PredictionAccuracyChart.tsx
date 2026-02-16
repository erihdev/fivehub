import { useState, useEffect } from 'react';
import { Target, TrendingUp, CheckCircle, XCircle, Loader2, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { format, subDays } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import ExportPredictionsPDF from './ExportPredictionsPDF';

interface PredictionRecord {
  id: string;
  coffee_name: string;
  predicted_days_until_empty: number;
  predicted_daily_consumption: number;
  actual_stock_at_prediction: number;
  actual_stock_at_reorder_date: number | null;
  prediction_accuracy: number | null;
  was_accurate: boolean | null;
  created_at: string;
  verified_at: string | null;
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

const PredictionAccuracyChart = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [predictions, setPredictions] = useState<PredictionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isArabic = language === 'ar';
  const dateLocale = isArabic ? ar : enUS;

  useEffect(() => {
    if (user) {
      fetchPredictions();
    }
  }, [user]);

  const fetchPredictions = async () => {
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from('inventory_predictions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setPredictions(data as PredictionRecord[]);
    }
    setIsLoading(false);
  };

  // Calculate accuracy metrics
  const verifiedPredictions = predictions.filter(p => p.was_accurate !== null);
  const accuratePredictions = verifiedPredictions.filter(p => p.was_accurate === true);
  const overallAccuracy = verifiedPredictions.length > 0 
    ? (accuratePredictions.length / verifiedPredictions.length) * 100 
    : 0;

  // Group by date for trend chart
  const trendData = predictions
    .filter(p => p.prediction_accuracy !== null)
    .slice(0, 14)
    .reverse()
    .map(p => ({
      date: format(new Date(p.created_at), 'MM/dd', { locale: dateLocale }),
      accuracy: Math.round(p.prediction_accuracy || 0),
      coffee: p.coffee_name,
    }));

  // Accuracy distribution
  const accuracyRanges = [
    { range: '90-100%', count: 0, label: isArabic ? 'ممتاز' : 'Excellent' },
    { range: '70-89%', count: 0, label: isArabic ? 'جيد' : 'Good' },
    { range: '50-69%', count: 0, label: isArabic ? 'متوسط' : 'Average' },
    { range: '0-49%', count: 0, label: isArabic ? 'ضعيف' : 'Poor' },
  ];

  predictions.filter(p => p.prediction_accuracy !== null).forEach(p => {
    const acc = p.prediction_accuracy || 0;
    if (acc >= 90) accuracyRanges[0].count++;
    else if (acc >= 70) accuracyRanges[1].count++;
    else if (acc >= 50) accuracyRanges[2].count++;
    else accuracyRanges[3].count++;
  });

  // Per-coffee accuracy
  const coffeeAccuracy: Record<string, { total: number; accurate: number }> = {};
  predictions.forEach(p => {
    if (p.was_accurate !== null) {
      if (!coffeeAccuracy[p.coffee_name]) {
        coffeeAccuracy[p.coffee_name] = { total: 0, accurate: 0 };
      }
      coffeeAccuracy[p.coffee_name].total++;
      if (p.was_accurate) coffeeAccuracy[p.coffee_name].accurate++;
    }
  });

  const coffeeChartData = Object.entries(coffeeAccuracy)
    .map(([name, data]) => ({
      name: name.length > 15 ? name.substring(0, 15) + '...' : name,
      accuracy: Math.round((data.accurate / data.total) * 100),
      predictions: data.total,
    }))
    .slice(0, 5);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
          <p className="mt-2 text-muted-foreground">{isArabic ? 'جاري التحميل...' : 'Loading...'}</p>
        </CardContent>
      </Card>
    );
  }

  if (predictions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            {isArabic ? 'دقة التنبؤات' : 'Prediction Accuracy'}
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{isArabic ? 'لا توجد تنبؤات مسجلة بعد' : 'No predictions recorded yet'}</p>
          <p className="text-sm mt-2">
            {isArabic 
              ? 'قم بتحليل المخزون أعلاه لبدء تتبع دقة التنبؤات' 
              : 'Analyze inventory above to start tracking prediction accuracy'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            {isArabic ? 'دقة التنبؤات' : 'Prediction Accuracy'}
          </div>
          <div className="flex items-center gap-2">
            <ExportPredictionsPDF 
              predictions={predictions}
              overallAccuracy={overallAccuracy}
              totalPredictions={verifiedPredictions.length}
              accuratePredictions={accuratePredictions.length}
            />
            <Badge variant="outline" className="text-lg px-3 py-1">
              {overallAccuracy.toFixed(0)}%
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-primary">{predictions.length}</p>
            <p className="text-xs text-muted-foreground">{isArabic ? 'إجمالي التنبؤات' : 'Total Predictions'}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-500">{accuratePredictions.length}</p>
            <p className="text-xs text-muted-foreground">{isArabic ? 'تنبؤات صحيحة' : 'Accurate'}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-amber-500">{verifiedPredictions.length - accuratePredictions.length}</p>
            <p className="text-xs text-muted-foreground">{isArabic ? 'تنبؤات خاطئة' : 'Inaccurate'}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{predictions.length - verifiedPredictions.length}</p>
            <p className="text-xs text-muted-foreground">{isArabic ? 'قيد التحقق' : 'Pending'}</p>
          </div>
        </div>

        {/* Accuracy Trend Chart */}
        {trendData.length > 0 && (
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              {isArabic ? 'اتجاه الدقة' : 'Accuracy Trend'}
            </h4>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis domain={[0, 100]} className="text-xs" />
                <Tooltip 
                  formatter={(value: number) => [`${value}%`, isArabic ? 'الدقة' : 'Accuracy']}
                  labelFormatter={(label) => label}
                />
                <Line 
                  type="monotone" 
                  dataKey="accuracy" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Accuracy Distribution */}
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-3">{isArabic ? 'توزيع الدقة' : 'Accuracy Distribution'}</h4>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={accuracyRanges} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" />
                <YAxis dataKey="label" type="category" width={60} className="text-xs" />
                <Tooltip />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {accuracyRanges.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Per-Coffee Accuracy */}
          {coffeeChartData.length > 0 && (
            <div>
              <h4 className="font-medium mb-3">{isArabic ? 'الدقة حسب نوع القهوة' : 'Accuracy by Coffee'}</h4>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={coffeeChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(value: number) => [`${value}%`, isArabic ? 'الدقة' : 'Accuracy']} />
                  <Bar dataKey="accuracy" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Recent Predictions */}
        <div>
          <h4 className="font-medium mb-3">{isArabic ? 'أحدث التنبؤات' : 'Recent Predictions'}</h4>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {predictions.slice(0, 10).map(pred => (
              <div key={pred.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg text-sm">
                <div className="flex items-center gap-2">
                  {pred.was_accurate === true && <CheckCircle className="h-4 w-4 text-green-500" />}
                  {pred.was_accurate === false && <XCircle className="h-4 w-4 text-red-500" />}
                  {pred.was_accurate === null && <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />}
                  <span className="font-medium">{pred.coffee_name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">
                    {format(new Date(pred.created_at), 'MMM d', { locale: dateLocale })}
                  </span>
                  {pred.prediction_accuracy !== null && (
                    <Badge variant={pred.prediction_accuracy >= 70 ? 'default' : 'secondary'}>
                      {pred.prediction_accuracy.toFixed(0)}%
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PredictionAccuracyChart;