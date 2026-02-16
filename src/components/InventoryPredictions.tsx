import { useState } from 'react';
import { Brain, Loader2, TrendingUp, AlertTriangle, Calendar, Package, RefreshCw, Sparkles, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface Prediction {
  coffeeId?: string;
  coffeeName: string;
  currentStock: number;
  estimatedDaysUntilEmpty: number;
  dailyConsumption: number;
  recommendedReorderDate: string;
  recommendedQuantity: number;
  urgencyLevel: 'high' | 'medium' | 'low';
  notes: string;
}

interface PredictionsData {
  predictions: Prediction[];
  generalRecommendations: string[];
  urgentItems: string[];
  summary: string;
}

interface InventoryPredictionsProps {
  onPredictionsSaved?: () => void;
}

const InventoryPredictions = ({ onPredictionsSaved }: InventoryPredictionsProps) => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [predictions, setPredictions] = useState<PredictionsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isArabic = language === 'ar';

  const savePredictions = async () => {
    if (!predictions || !user) return;

    setIsSaving(true);
    try {
      // First get coffee IDs from inventory
      const { data: inventory } = await supabase
        .from('inventory')
        .select('coffee_id, coffee_offerings(name)')
        .eq('user_id', user.id);

      const coffeeMap = new Map<string, string>();
      inventory?.forEach((item: any) => {
        const name = item.coffee_offerings?.name;
        if (name) coffeeMap.set(name, item.coffee_id);
      });

      const predictionsToSave = predictions.predictions
        .filter(p => coffeeMap.has(p.coffeeName))
        .map(p => ({
          user_id: user.id,
          coffee_id: coffeeMap.get(p.coffeeName)!,
          coffee_name: p.coffeeName,
          predicted_days_until_empty: p.estimatedDaysUntilEmpty,
          predicted_daily_consumption: p.dailyConsumption,
          predicted_reorder_date: p.recommendedReorderDate,
          recommended_quantity: p.recommendedQuantity,
          actual_stock_at_prediction: p.currentStock,
        }));

      if (predictionsToSave.length > 0) {
        const { error: insertError } = await supabase
          .from('inventory_predictions')
          .insert(predictionsToSave);

        if (insertError) throw insertError;

        toast({
          title: isArabic ? 'تم الحفظ' : 'Saved',
          description: isArabic 
            ? `تم حفظ ${predictionsToSave.length} تنبؤ لتتبع الدقة` 
            : `Saved ${predictionsToSave.length} predictions for tracking`,
        });

        onPredictionsSaved?.();
      }
    } catch (err) {
      console.error('Error saving predictions:', err);
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'فشل في حفظ التنبؤات' : 'Failed to save predictions',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const fetchPredictions = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: funcError } = await supabase.functions.invoke('inventory-predictions');

      if (funcError) {
        throw funcError;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setPredictions(data);
      toast({
        title: isArabic ? 'تم' : 'Success',
        description: isArabic ? 'تم تحليل المخزون بنجاح' : 'Inventory analyzed successfully',
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-destructive text-destructive-foreground';
      case 'medium': return 'bg-amber-500 text-white';
      default: return 'bg-green-500 text-white';
    }
  };

  const getUrgencyLabel = (level: string) => {
    const labels = {
      high: { ar: 'عاجل', en: 'Urgent' },
      medium: { ar: 'متوسط', en: 'Medium' },
      low: { ar: 'منخفض', en: 'Low' },
    };
    return labels[level as keyof typeof labels]?.[isArabic ? 'ar' : 'en'] || level;
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span className="text-lg">{isArabic ? 'تنبؤات ذكية للمخزون' : 'AI Inventory Predictions'}</span>
              <p className="text-sm font-normal text-muted-foreground">
                {isArabic ? 'تحليل باستخدام الذكاء الاصطناعي' : 'Powered by AI analysis'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {predictions && (
              <Button onClick={savePredictions} disabled={isSaving} size="sm" variant="outline" className="gap-2">
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isArabic ? 'حفظ' : 'Save'}
              </Button>
            )}
            <Button onClick={fetchPredictions} disabled={isLoading} size="sm" className="gap-2">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {isArabic ? 'تحليل' : 'Analyze'}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!predictions && !isLoading && !error && (
          <div className="text-center py-8 text-muted-foreground">
            <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{isArabic ? 'اضغط على "تحليل" للحصول على تنبؤات ذكية' : 'Click "Analyze" to get AI predictions'}</p>
          </div>
        )}

        {isLoading && (
          <div className="text-center py-8">
            <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
            <p className="text-muted-foreground">{isArabic ? 'جاري تحليل المخزون...' : 'Analyzing inventory...'}</p>
          </div>
        )}

        {error && (
          <div className="text-center py-8 text-destructive">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
            <p>{error}</p>
          </div>
        )}

        {predictions && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm">{predictions.summary}</p>
            </div>

            {/* Urgent Items */}
            {predictions.urgentItems.length > 0 && (
              <div className="bg-destructive/10 rounded-lg p-4 border border-destructive/20">
                <h4 className="font-semibold text-destructive flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  {isArabic ? 'تحتاج اهتمام عاجل' : 'Needs Immediate Attention'}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {predictions.urgentItems.map((item, i) => (
                    <Badge key={i} variant="destructive">{item}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Predictions Grid */}
            <div className="grid gap-4">
              {predictions.predictions.map((pred, index) => (
                <div 
                  key={index} 
                  className="bg-card rounded-lg border p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold">{pred.coffeeName}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={getUrgencyColor(pred.urgencyLevel)}>
                          {getUrgencyLabel(pred.urgencyLevel)}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {pred.currentStock} {isArabic ? 'كجم' : 'kg'}
                        </span>
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{pred.estimatedDaysUntilEmpty} {isArabic ? 'يوم' : 'days'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {isArabic ? 'الاستهلاك اليومي' : 'Daily consumption'}
                      </span>
                      <span>{pred.dailyConsumption} {isArabic ? 'كجم/يوم' : 'kg/day'}</span>
                    </div>

                    <Progress 
                      value={Math.min(100, (pred.estimatedDaysUntilEmpty / 30) * 100)} 
                      className="h-2"
                    />

                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {isArabic ? 'تاريخ إعادة الطلب' : 'Reorder date'}
                      </span>
                      <span className="font-medium">{pred.recommendedReorderDate}</span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {isArabic ? 'الكمية الموصى بها' : 'Recommended qty'}
                      </span>
                      <span className="font-medium text-primary">
                        {pred.recommendedQuantity} {isArabic ? 'كجم' : 'kg'}
                      </span>
                    </div>

                    {pred.notes && (
                      <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                        💡 {pred.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* General Recommendations */}
            {predictions.generalRecommendations.length > 0 && (
              <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                <h4 className="font-semibold text-primary flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4" />
                  {isArabic ? 'توصيات عامة' : 'General Recommendations'}
                </h4>
                <ul className="space-y-2">
                  {predictions.generalRecommendations.map((rec, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-primary">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InventoryPredictions;