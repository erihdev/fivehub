import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Sparkles, Star, TrendingUp, Coffee, MapPin, Award, Zap, RefreshCcw, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

interface MatchedSupplier {
  id: string;
  name: string;
  matchScore: number;
  avgRating: number;
  totalCoffees: number;
  performanceScore: number;
  origins: string[];
  priceRange: { min: number; max: number };
  reasons: string[];
}

interface Preferences {
  origins: string[];
  minRating: number;
  maxPrice: number;
  preferQuality: boolean;
  preferPrice: boolean;
  preferPerformance: boolean;
}

const SmartMatching = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [matches, setMatches] = useState<MatchedSupplier[]>([]);
  const [availableOrigins, setAvailableOrigins] = useState<string[]>([]);
  const [preferences, setPreferences] = useState<Preferences>({
    origins: [],
    minRating: 3,
    maxPrice: 100,
    preferQuality: true,
    preferPrice: false,
    preferPerformance: true,
  });

  useEffect(() => {
    fetchAvailableOrigins();
  }, []);

  const fetchAvailableOrigins = async () => {
    const { data } = await supabase
      .from('coffee_offerings')
      .select('origin')
      .not('origin', 'is', null);

    if (data) {
      const uniqueOrigins = [...new Set(data.map(d => d.origin).filter(Boolean))];
      setAvailableOrigins(uniqueOrigins as string[]);
    }
  };

  const runSmartMatching = async () => {
    setIsAnalyzing(true);
    
    try {
      // Fetch suppliers with their data
      const { data: suppliers } = await supabase
        .from('suppliers')
        .select(`
          id,
          name,
          performance_score,
          total_orders,
          coffee_offerings(id, name, origin, price, score),
          supplier_ratings(rating)
        `);

      if (!suppliers) {
        toast.error(language === 'ar' ? 'فشل في جلب الموردين' : 'Failed to fetch suppliers');
        return;
      }

      // Calculate match scores
      const matchedSuppliers: MatchedSupplier[] = suppliers.map(supplier => {
        const coffees = supplier.coffee_offerings || [];
        const ratings = supplier.supplier_ratings || [];
        
        const avgRating = ratings.length > 0 
          ? ratings.reduce((sum, r) => sum + (r.rating || 0), 0) / ratings.length 
          : 0;
        
        const origins = [...new Set(coffees.map(c => c.origin).filter(Boolean))];
        const prices = coffees.map(c => c.price).filter(Boolean);
        const priceRange = {
          min: Math.min(...prices, 0),
          max: Math.max(...prices, 0),
        };

        // Calculate match score based on preferences
        let score = 0;
        const reasons: string[] = [];

        // Origin match
        const originMatch = preferences.origins.length === 0 || 
          origins.some(o => preferences.origins.includes(o as string));
        if (originMatch && preferences.origins.length > 0) {
          score += 25;
          reasons.push(language === 'ar' ? 'يوفر المناشئ المطلوبة' : 'Offers requested origins');
        }

        // Rating match
        if (avgRating >= preferences.minRating) {
          score += 25;
          reasons.push(language === 'ar' ? `تقييم ممتاز (${avgRating.toFixed(1)})` : `Excellent rating (${avgRating.toFixed(1)})`);
        }

        // Price match
        if (priceRange.max <= preferences.maxPrice) {
          score += 20;
          reasons.push(language === 'ar' ? 'أسعار في النطاق المطلوب' : 'Prices within range');
        }

        // Quality preference
        if (preferences.preferQuality) {
          const avgScore = coffees.reduce((sum, c) => sum + (c.score || 0), 0) / (coffees.length || 1);
          if (avgScore >= 80) {
            score += 15;
            reasons.push(language === 'ar' ? 'جودة عالية (SCA 80+)' : 'High quality (SCA 80+)');
          }
        }

        // Performance preference
        if (preferences.preferPerformance && (supplier.performance_score || 0) >= 80) {
          score += 15;
          reasons.push(language === 'ar' ? 'أداء ممتاز في التسليم' : 'Excellent delivery performance');
        }

        return {
          id: supplier.id,
          name: supplier.name,
          matchScore: Math.min(score, 100),
          avgRating,
          totalCoffees: coffees.length,
          performanceScore: supplier.performance_score || 0,
          origins: origins as string[],
          priceRange,
          reasons,
        };
      });

      // Sort by match score
      matchedSuppliers.sort((a, b) => b.matchScore - a.matchScore);
      setMatches(matchedSuppliers.slice(0, 10));
      
      toast.success(language === 'ar' ? 'تم إيجاد أفضل التطابقات!' : 'Found best matches!');
    } catch (error) {
      console.error('Matching error:', error);
      toast.error(language === 'ar' ? 'حدث خطأ أثناء التحليل' : 'Error during analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleOrigin = (origin: string) => {
    setPreferences(prev => ({
      ...prev,
      origins: prev.origins.includes(origin)
        ? prev.origins.filter(o => o !== origin)
        : [...prev.origins, origin],
    }));
  };

  const getMatchColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-muted-foreground';
  };

  const getMatchBadge = (score: number) => {
    if (score >= 80) return { label: language === 'ar' ? 'تطابق ممتاز' : 'Excellent Match', variant: 'default' as const };
    if (score >= 60) return { label: language === 'ar' ? 'تطابق جيد' : 'Good Match', variant: 'secondary' as const };
    return { label: language === 'ar' ? 'تطابق متوسط' : 'Fair Match', variant: 'outline' as const };
  };

  return (
    <div className="min-h-screen bg-background" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-accent" />
              {language === 'ar' ? 'المطابقة الذكية بالذكاء الاصطناعي' : 'AI Smart Matching'}
            </h1>
            <p className="text-muted-foreground">
              {language === 'ar' 
                ? 'دع الذكاء الاصطناعي يجد لك أفضل الموردين بناءً على تفضيلاتك' 
                : 'Let AI find the best suppliers based on your preferences'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Preferences Panel */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>{language === 'ar' ? 'تفضيلاتك' : 'Your Preferences'}</CardTitle>
              <CardDescription>
                {language === 'ar' ? 'حدد ما تبحث عنه' : 'Define what you are looking for'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Origins */}
              <div>
                <Label className="mb-3 block">{language === 'ar' ? 'المناشئ المفضلة' : 'Preferred Origins'}</Label>
                <div className="flex flex-wrap gap-2">
                  {availableOrigins.slice(0, 8).map(origin => (
                    <Badge
                      key={origin}
                      variant={preferences.origins.includes(origin) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleOrigin(origin)}
                    >
                      {origin}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Min Rating */}
              <div>
                <Label className="mb-3 block">
                  {language === 'ar' ? 'الحد الأدنى للتقييم' : 'Minimum Rating'}: {preferences.minRating}
                </Label>
                <Slider
                  value={[preferences.minRating]}
                  onValueChange={([value]) => setPreferences(prev => ({ ...prev, minRating: value }))}
                  min={0}
                  max={5}
                  step={0.5}
                />
              </div>

              {/* Max Price */}
              <div>
                <Label className="mb-3 block">
                  {language === 'ar' ? 'الحد الأقصى للسعر' : 'Maximum Price'}: ${preferences.maxPrice}/kg
                </Label>
                <Slider
                  value={[preferences.maxPrice]}
                  onValueChange={([value]) => setPreferences(prev => ({ ...prev, maxPrice: value }))}
                  min={10}
                  max={200}
                  step={5}
                />
              </div>

              {/* Priority Checkboxes */}
              <div className="space-y-3">
                <Label className="mb-2 block">{language === 'ar' ? 'الأولويات' : 'Priorities'}</Label>
                
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="quality"
                    checked={preferences.preferQuality}
                    onCheckedChange={(checked) => 
                      setPreferences(prev => ({ ...prev, preferQuality: !!checked }))
                    }
                  />
                  <label htmlFor="quality" className="text-sm cursor-pointer">
                    {language === 'ar' ? 'أفضل جودة (SCA Score)' : 'Best Quality (SCA Score)'}
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="performance"
                    checked={preferences.preferPerformance}
                    onCheckedChange={(checked) => 
                      setPreferences(prev => ({ ...prev, preferPerformance: !!checked }))
                    }
                  />
                  <label htmlFor="performance" className="text-sm cursor-pointer">
                    {language === 'ar' ? 'أداء تسليم ممتاز' : 'Excellent Delivery Performance'}
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="price"
                    checked={preferences.preferPrice}
                    onCheckedChange={(checked) => 
                      setPreferences(prev => ({ ...prev, preferPrice: !!checked }))
                    }
                  />
                  <label htmlFor="price" className="text-sm cursor-pointer">
                    {language === 'ar' ? 'أفضل سعر' : 'Best Price'}
                  </label>
                </div>
              </div>

              <Button 
                className="w-full" 
                onClick={runSmartMatching}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
                    {language === 'ar' ? 'جاري التحليل...' : 'Analyzing...'}
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    {language === 'ar' ? 'ابدأ المطابقة الذكية' : 'Start Smart Matching'}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Results Panel */}
          <div className="lg:col-span-2 space-y-4">
            {matches.length === 0 ? (
              <Card className="text-center py-16">
                <CardContent>
                  <Sparkles className="h-16 w-16 mx-auto text-accent mb-4" />
                  <h3 className="text-xl font-semibold mb-2">
                    {language === 'ar' ? 'جاهز للمطابقة' : 'Ready to Match'}
                  </h3>
                  <p className="text-muted-foreground">
                    {language === 'ar' 
                      ? 'حدد تفضيلاتك واضغط على زر المطابقة الذكية' 
                      : 'Set your preferences and click Smart Matching'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              matches.map((supplier, index) => {
                const badge = getMatchBadge(supplier.matchScore);
                return (
                  <Card 
                    key={supplier.id} 
                    className={`transition-all duration-300 hover:shadow-lg ${
                      index === 0 ? 'ring-2 ring-accent' : ''
                    }`}
                  >
                    <CardContent className="pt-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-semibold">{supplier.name}</h3>
                            <Badge variant={badge.variant}>{badge.label}</Badge>
                            {index === 0 && (
                              <Badge className="bg-accent text-accent-foreground">
                                <Award className="h-3 w-3 mr-1" />
                                {language === 'ar' ? 'الأفضل' : 'Top Pick'}
                              </Badge>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
                            <span className="flex items-center gap-1">
                              <Star className="h-4 w-4 text-warning" />
                              {supplier.avgRating.toFixed(1)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Coffee className="h-4 w-4" />
                              {supplier.totalCoffees} {language === 'ar' ? 'قهوة' : 'coffees'}
                            </span>
                            <span className="flex items-center gap-1">
                              <TrendingUp className="h-4 w-4" />
                              {supplier.performanceScore}% {language === 'ar' ? 'أداء' : 'performance'}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-1 mb-3">
                            {supplier.origins.slice(0, 3).map(origin => (
                              <Badge key={origin} variant="secondary" className="text-xs">
                                <MapPin className="h-3 w-3 mr-1" />
                                {origin}
                              </Badge>
                            ))}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {supplier.reasons.map((reason, i) => (
                              <span key={i} className="text-xs bg-success/10 text-success px-2 py-1 rounded">
                                ✓ {reason}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="text-center md:text-right min-w-[120px]">
                          <div className={`text-4xl font-bold ${getMatchColor(supplier.matchScore)}`}>
                            {supplier.matchScore}%
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {language === 'ar' ? 'نسبة التطابق' : 'Match Score'}
                          </p>
                          <Progress value={supplier.matchScore} className="mt-2 h-2" />
                        </div>
                      </div>

                      <div className="flex gap-2 mt-4 pt-4 border-t">
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => navigate(`/suppliers/${supplier.id}`)}
                        >
                          {language === 'ar' ? 'عرض المورد' : 'View Supplier'}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate('/messages')}
                        >
                          <MessageSquare className="h-4 w-4 mr-1" />
                          {language === 'ar' ? 'تواصل' : 'Contact'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartMatching;
