import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import {
  Brain,
  Loader2,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Star,
  Building2,
  Sparkles,
  RefreshCw,
  ShoppingCart,
  Lightbulb,
  Target,
} from 'lucide-react';

interface UrgentRecommendation {
  type: 'restock' | 'new_supplier' | 'quality_upgrade' | 'cost_saving';
  title: string;
  description: string;
  coffeeId?: string;
  coffeeName?: string;
  supplierName?: string;
  priority: 'high' | 'medium' | 'low';
  estimatedSavings?: number;
  reason: string;
}

interface TrendInsight {
  insight: string;
  recommendation: string;
}

interface SupplierSuggestion {
  supplierName: string;
  reason: string;
  topCoffees: string[];
}

interface CostOptimization {
  currentAvgCost?: number;
  potentialSavings?: number;
  suggestions: string[];
}

interface QualityRecommendation {
  coffeeName: string;
  score: number;
  reason: string;
}

interface Recommendations {
  urgentRecommendations: UrgentRecommendation[];
  trendInsights: TrendInsight[];
  supplierSuggestions: SupplierSuggestion[];
  costOptimization: CostOptimization;
  qualityRecommendations: QualityRecommendation[];
  summary: string;
}

interface Context {
  totalInventoryItems: number;
  lowStockCount: number;
  recentOrdersCount: number;
  availableCoffeesCount: number;
}

export const SmartPurchaseRecommendations = () => {
  const { user } = useAuth();
  const { language, dir } = useLanguage();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendations | null>(null);
  const [context, setContext] = useState<Context | null>(null);

  const isArabic = language === 'ar';

  const fetchRecommendations = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('smart-purchase-recommendations', {
        body: { userId: user.id },
      });

      if (error) throw error;

      if (data.success) {
        setRecommendations(data.recommendations);
        setContext(data.context);
        toast({
          title: isArabic ? 'تم تحديث التوصيات' : 'Recommendations Updated',
          description: isArabic ? 'تم تحليل بياناتك وإنشاء توصيات ذكية' : 'Your data has been analyzed',
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'فشل في جلب التوصيات' : 'Failed to fetch recommendations',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast, isArabic]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-destructive text-destructive-foreground';
      case 'medium':
        return 'bg-warning text-warning-foreground';
      case 'low':
        return 'bg-secondary text-secondary-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'restock':
        return <ShoppingCart className="w-4 h-4" />;
      case 'new_supplier':
        return <Building2 className="w-4 h-4" />;
      case 'quality_upgrade':
        return <Star className="w-4 h-4" />;
      case 'cost_saving':
        return <DollarSign className="w-4 h-4" />;
      default:
        return <Lightbulb className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      restock: { ar: 'إعادة تخزين', en: 'Restock' },
      new_supplier: { ar: 'مورد جديد', en: 'New Supplier' },
      quality_upgrade: { ar: 'ترقية جودة', en: 'Quality Upgrade' },
      cost_saving: { ar: 'توفير تكاليف', en: 'Cost Saving' },
    };
    return labels[type]?.[isArabic ? 'ar' : 'en'] || type;
  };

  return (
    <Card dir={dir}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-6 h-6 text-coffee-gold" />
            <div>
              <CardTitle>
                {isArabic ? 'توصيات الشراء الذكية' : 'Smart Purchase Recommendations'}
              </CardTitle>
              <CardDescription>
                {isArabic
                  ? 'تحليل ذكي لبيانات المخزون والطلبات'
                  : 'AI-powered analysis of your inventory and orders'}
              </CardDescription>
            </div>
          </div>
          <Button onClick={fetchRecommendations} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            <span className="ms-2">
              {isLoading
                ? isArabic
                  ? 'جاري التحليل...'
                  : 'Analyzing...'
                : isArabic
                ? 'تحليل الآن'
                : 'Analyze Now'}
            </span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!recommendations && !isLoading && (
          <div className="text-center py-12">
            <Sparkles className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {isArabic
                ? 'اضغط على "تحليل الآن" للحصول على توصيات شراء ذكية'
                : 'Click "Analyze Now" to get smart purchase recommendations'}
            </p>
          </div>
        )}

        {isLoading && (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 mx-auto text-coffee-gold animate-spin mb-4" />
            <p className="text-muted-foreground">
              {isArabic
                ? 'جاري تحليل بياناتك وإنشاء توصيات ذكية...'
                : 'Analyzing your data and generating smart recommendations...'}
            </p>
          </div>
        )}

        {recommendations && !isLoading && (
          <div className="space-y-6">
            {/* Context Stats */}
            {context && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-secondary/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold">{context.totalInventoryItems}</p>
                  <p className="text-xs text-muted-foreground">
                    {isArabic ? 'عناصر المخزون' : 'Inventory Items'}
                  </p>
                </div>
                <div className="bg-destructive/10 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-destructive">{context.lowStockCount}</p>
                  <p className="text-xs text-muted-foreground">
                    {isArabic ? 'مخزون منخفض' : 'Low Stock'}
                  </p>
                </div>
                <div className="bg-secondary/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold">{context.recentOrdersCount}</p>
                  <p className="text-xs text-muted-foreground">
                    {isArabic ? 'طلبات حديثة' : 'Recent Orders'}
                  </p>
                </div>
                <div className="bg-secondary/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold">{context.availableCoffeesCount}</p>
                  <p className="text-xs text-muted-foreground">
                    {isArabic ? 'قهوة متاحة' : 'Available Coffees'}
                  </p>
                </div>
              </div>
            )}

            {/* Summary */}
            {recommendations.summary && (
              <div className="bg-coffee-gold/10 border border-coffee-gold/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Target className="w-5 h-5 text-coffee-gold mt-0.5" />
                  <p className="text-sm">{recommendations.summary}</p>
                </div>
              </div>
            )}

            <Tabs defaultValue="urgent" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="urgent" className="text-xs sm:text-sm">
                  <AlertTriangle className="w-4 h-4 me-1" />
                  {isArabic ? 'عاجل' : 'Urgent'}
                  {recommendations.urgentRecommendations.length > 0 && (
                    <Badge variant="destructive" className="ms-1">
                      {recommendations.urgentRecommendations.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="trends" className="text-xs sm:text-sm">
                  <TrendingUp className="w-4 h-4 me-1" />
                  {isArabic ? 'الاتجاهات' : 'Trends'}
                </TabsTrigger>
                <TabsTrigger value="savings" className="text-xs sm:text-sm">
                  <DollarSign className="w-4 h-4 me-1" />
                  {isArabic ? 'التوفير' : 'Savings'}
                </TabsTrigger>
                <TabsTrigger value="quality" className="text-xs sm:text-sm">
                  <Star className="w-4 h-4 me-1" />
                  {isArabic ? 'الجودة' : 'Quality'}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="urgent" className="mt-4 space-y-3">
                {recommendations.urgentRecommendations.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    {isArabic ? 'لا توجد توصيات عاجلة' : 'No urgent recommendations'}
                  </p>
                ) : (
                  recommendations.urgentRecommendations.map((rec, index) => (
                    <div
                      key={index}
                      className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-full bg-secondary">
                            {getTypeIcon(rec.type)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{rec.title}</h4>
                              <Badge className={getPriorityColor(rec.priority)}>
                                {rec.priority === 'high'
                                  ? isArabic
                                    ? 'عالي'
                                    : 'High'
                                  : rec.priority === 'medium'
                                  ? isArabic
                                    ? 'متوسط'
                                    : 'Medium'
                                  : isArabic
                                  ? 'منخفض'
                                  : 'Low'}
                              </Badge>
                              <Badge variant="outline">{getTypeLabel(rec.type)}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{rec.description}</p>
                            {rec.supplierName && (
                              <p className="text-xs text-muted-foreground mt-1">
                                <Building2 className="w-3 h-3 inline me-1" />
                                {rec.supplierName}
                              </p>
                            )}
                            <p className="text-xs text-coffee-gold mt-1">{rec.reason}</p>
                          </div>
                        </div>
                        {rec.estimatedSavings && (
                          <div className="text-end">
                            <p className="text-sm font-bold text-green-600">
                              {rec.estimatedSavings.toLocaleString()} SAR
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {isArabic ? 'توفير متوقع' : 'Est. savings'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="trends" className="mt-4 space-y-3">
                {recommendations.trendInsights.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    {isArabic ? 'لا توجد رؤى للاتجاهات' : 'No trend insights'}
                  </p>
                ) : (
                  recommendations.trendInsights.map((trend, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <TrendingUp className="w-5 h-5 text-blue-500 mt-0.5" />
                        <div>
                          <p className="font-medium mb-1">{trend.insight}</p>
                          <p className="text-sm text-muted-foreground">{trend.recommendation}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}

                {/* Supplier Suggestions */}
                {recommendations.supplierSuggestions.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      {isArabic ? 'موردون مقترحون' : 'Suggested Suppliers'}
                    </h4>
                    <div className="grid gap-3">
                      {recommendations.supplierSuggestions.map((supplier, index) => (
                        <div key={index} className="border rounded-lg p-3">
                          <p className="font-medium">{supplier.supplierName}</p>
                          <p className="text-sm text-muted-foreground">{supplier.reason}</p>
                          {supplier.topCoffees.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {supplier.topCoffees.map((coffee, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {coffee}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="savings" className="mt-4">
                <div className="space-y-4">
                  {recommendations.costOptimization.currentAvgCost && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-secondary/50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold">
                          {recommendations.costOptimization.currentAvgCost.toLocaleString()} SAR
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {isArabic ? 'متوسط التكلفة الحالي' : 'Current Avg Cost'}
                        </p>
                      </div>
                      {recommendations.costOptimization.potentialSavings && (
                        <div className="bg-green-500/10 rounded-lg p-4 text-center">
                          <p className="text-2xl font-bold text-green-600">
                            {recommendations.costOptimization.potentialSavings.toLocaleString()} SAR
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {isArabic ? 'توفير محتمل' : 'Potential Savings'}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {recommendations.costOptimization.suggestions.length > 0 ? (
                    <div className="space-y-2">
                      {recommendations.costOptimization.suggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-3 border rounded-lg p-3"
                        >
                          <DollarSign className="w-5 h-5 text-green-500 mt-0.5" />
                          <p className="text-sm">{suggestion}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      {isArabic ? 'لا توجد اقتراحات توفير' : 'No savings suggestions'}
                    </p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="quality" className="mt-4 space-y-3">
                {recommendations.qualityRecommendations.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    {isArabic ? 'لا توجد توصيات جودة' : 'No quality recommendations'}
                  </p>
                ) : (
                  recommendations.qualityRecommendations.map((rec, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <Star className="w-5 h-5 text-yellow-500" />
                          <div>
                            <p className="font-medium">{rec.coffeeName}</p>
                            <p className="text-sm text-muted-foreground">{rec.reason}</p>
                          </div>
                        </div>
                        <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                          {rec.score} {isArabic ? 'نقطة' : 'pts'}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SmartPurchaseRecommendations;
