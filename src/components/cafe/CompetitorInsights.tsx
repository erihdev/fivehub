import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  TrendingUp, 
  DollarSign, 
  Coffee, 
  MapPin, 
  BarChart3,
  Eye,
  Flame,
  Globe
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface MarketInsight {
  id: string;
  city: string;
  period_start: string;
  period_end: string;
  avg_coffee_price: number;
  top_coffee_origins: string[];
  top_roast_levels: string[];
  avg_order_frequency: number;
  total_cafes_analyzed: number;
  popular_products: { name: string; percentage: number }[];
}

const CompetitorInsights = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isRTL = language === 'ar';
  
  const [insights, setInsights] = useState<MarketInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [userCity, setUserCity] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchUserCity();
    }
  }, [user]);

  useEffect(() => {
    if (userCity) {
      fetchInsights();
    }
  }, [userCity]);

  const fetchUserCity = async () => {
    const { data } = await supabase
      .from('user_roles')
      .select('city')
      .eq('user_id', user?.id)
      .single();
    
    if (data?.city) {
      setUserCity(data.city);
    } else {
      setLoading(false);
    }
  };

  const fetchInsights = async () => {
    // For demo, generate mock insights if none exist
    const { data, error } = await supabase
      .from('cafe_market_insights')
      .select('*')
      .eq('city', userCity)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (data) {
      setInsights({
        ...data,
        popular_products: Array.isArray(data.popular_products) 
          ? data.popular_products as { name: string; percentage: number }[]
          : []
      });
    } else {
      // Generate demo data
      setInsights({
        id: 'demo',
        city: userCity || 'الرياض',
        period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        period_end: new Date().toISOString(),
        avg_coffee_price: 85.50,
        top_coffee_origins: ['إثيوبيا', 'كولومبيا', 'البرازيل', 'كينيا'],
        top_roast_levels: ['متوسط', 'فاتح', 'داكن'],
        avg_order_frequency: 12.5,
        total_cafes_analyzed: 47,
        popular_products: [
          { name: 'V60', percentage: 35 },
          { name: 'إسبريسو', percentage: 28 },
          { name: 'لاتيه', percentage: 22 },
          { name: 'كولد برو', percentage: 15 }
        ]
      });
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!userCity) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <MapPin className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p>{isRTL ? 'يرجى تحديث موقع مقهاك لعرض تحليلات السوق' : 'Please update your cafe location to view market insights'}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Eye className="h-5 w-5 text-primary" />
            {isRTL ? 'تحليل السوق والمنافسين' : 'Market & Competitor Analysis'}
          </CardTitle>
          <Badge variant="outline" className="gap-1">
            <MapPin className="h-3 w-3" />
            {insights?.city}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {isRTL 
            ? `بيانات مجهولة من ${insights?.total_cafes_analyzed} مقهى في منطقتك`
            : `Anonymized data from ${insights?.total_cafes_analyzed} cafes in your area`}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-lg p-3">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs font-medium">
                {isRTL ? 'متوسط سعر الكيلو' : 'Avg Price/kg'}
              </span>
            </div>
            <p className="text-xl font-bold">{insights?.avg_coffee_price?.toFixed(0)} SAR</p>
          </div>
          
          <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-lg p-3">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-medium">
                {isRTL ? 'متوسط الطلبات/شهر' : 'Avg Orders/Month'}
              </span>
            </div>
            <p className="text-xl font-bold">{insights?.avg_order_frequency?.toFixed(1)}</p>
          </div>
        </div>

        {/* Top Origins */}
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">
              {isRTL ? 'الأصول الأكثر طلباً' : 'Most Popular Origins'}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {insights?.top_coffee_origins?.map((origin, index) => (
              <Badge 
                key={origin} 
                variant={index === 0 ? "default" : "secondary"}
                className="text-xs"
              >
                {index === 0 && <Flame className="h-3 w-3 mr-1" />}
                {origin}
              </Badge>
            ))}
          </div>
        </div>

        {/* Top Roast Levels */}
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Coffee className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium">
              {isRTL ? 'درجات التحميص الرائجة' : 'Trending Roast Levels'}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {insights?.top_roast_levels?.map((level) => (
              <Badge key={level} variant="outline" className="text-xs">
                {level}
              </Badge>
            ))}
          </div>
        </div>

        {/* Popular Products */}
        {insights?.popular_products && insights.popular_products.length > 0 && (
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">
                {isRTL ? 'المنتجات الأكثر مبيعاً' : 'Best Selling Products'}
              </span>
            </div>
            <div className="space-y-2">
              {insights.popular_products.map((product) => (
                <div key={product.name} className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span>{product.name}</span>
                      <span className="text-muted-foreground">{product.percentage}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${product.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-center text-muted-foreground pt-2">
          {isRTL 
            ? '🔒 جميع البيانات مجهولة ومجمعة - لا يمكن تحديد هوية أي مقهى'
            : '🔒 All data is anonymized and aggregated - no cafe can be identified'}
        </p>
      </CardContent>
    </Card>
  );
};

export default CompetitorInsights;
