import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Trophy, Crown, Medal, Award, ArrowLeft, 
  Calendar, TrendingUp, Sparkles, Star
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { SupplierBadgesDisplay } from '@/components/SupplierBadgesDisplay';

interface MonthlyAward {
  id: string;
  supplier_id: string;
  award_month: string;
  award_type: string;
  award_name: string;
  performance_score: number | null;
  rank: number | null;
  prize_description: string | null;
  supplier?: { name: string };
}

const SupplierCompetition = () => {
  const { language } = useLanguage();
  const [currentMonthAwards, setCurrentMonthAwards] = useState<MonthlyAward[]>([]);
  const [previousMonthAwards, setPreviousMonthAwards] = useState<MonthlyAward[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAwards();
  }, []);

  const fetchAwards = async () => {
    try {
      const now = new Date();
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];

      // Current month awards
      const { data: current } = await supabase
        .from('monthly_supplier_awards')
        .select('*, supplier:suppliers(name)')
        .eq('award_month', currentMonth)
        .order('rank', { ascending: true });

      // Previous month awards
      const { data: previous } = await supabase
        .from('monthly_supplier_awards')
        .select('*, supplier:suppliers(name)')
        .eq('award_month', previousMonth)
        .order('rank', { ascending: true });

      setCurrentMonthAwards((current || []).map(a => ({
        ...a,
        supplier: Array.isArray(a.supplier) ? a.supplier[0] : a.supplier
      })));
      setPreviousMonthAwards((previous || []).map(a => ({
        ...a,
        supplier: Array.isArray(a.supplier) ? a.supplier[0] : a.supplier
      })));
    } catch (error) {
      console.error('Error fetching awards:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAwardIcon = (type: string) => {
    switch (type) {
      case 'gold': return <Crown className="w-8 h-8 text-amber-500" />;
      case 'silver': return <Medal className="w-8 h-8 text-gray-400" />;
      case 'bronze': return <Medal className="w-8 h-8 text-amber-700" />;
      case 'most_improved': return <TrendingUp className="w-8 h-8 text-green-500" />;
      default: return <Award className="w-8 h-8 text-amber-500" />;
    }
  };

  const getAwardGradient = (type: string) => {
    switch (type) {
      case 'gold': return 'from-amber-400 to-yellow-500';
      case 'silver': return 'from-gray-300 to-gray-400';
      case 'bronze': return 'from-amber-600 to-amber-700';
      case 'most_improved': return 'from-green-400 to-emerald-500';
      default: return 'from-purple-400 to-pink-500';
    }
  };

  const renderAwardCard = (award: MonthlyAward) => (
    <Card key={award.id} className={`overflow-hidden border-2 ${
      award.award_type === 'gold' ? 'border-amber-300' :
      award.award_type === 'silver' ? 'border-gray-300' :
      award.award_type === 'bronze' ? 'border-amber-600' : 'border-green-300'
    }`}>
      <div className={`h-2 bg-gradient-to-r ${getAwardGradient(award.award_type)}`} />
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${getAwardGradient(award.award_type)} flex items-center justify-center shadow-lg`}>
            {getAwardIcon(award.award_type)}
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold">{award.supplier?.name}</h3>
            <p className="text-lg font-semibold text-primary">{award.award_name}</p>
            {award.prize_description && (
              <p className="text-sm text-muted-foreground">{award.prize_description}</p>
            )}
          </div>
          <div className="text-center">
            {award.rank && (
              <div className="text-3xl font-bold text-muted-foreground">
                #{award.rank}
              </div>
            )}
            <div className="text-2xl font-bold text-primary">
              {award.performance_score}%
            </div>
          </div>
        </div>
        <div className="mt-4">
          <SupplierBadgesDisplay supplierId={award.supplier_id} size="sm" />
        </div>
      </CardContent>
    </Card>
  );

  const formatMonth = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { 
      month: 'long', 
      year: 'numeric' 
    });
  };

  return (
    <div className="min-h-screen bg-background" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/supplier-leaderboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Trophy className="w-8 h-8 text-amber-500" />
              {language === 'ar' ? 'جوائز الموردين الشهرية' : 'Monthly Supplier Awards'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {language === 'ar' ? 'الموردين الأفضل أداءً كل شهر' : 'Top performing suppliers each month'}
            </p>
          </div>
        </div>

        {/* Competition Banner */}
        <Card className="mb-8 overflow-hidden bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 text-white">
          <CardContent className="py-8 text-center">
            <div className="flex justify-center gap-4 mb-4">
              <Crown className="w-12 h-12" />
              <Trophy className="w-16 h-16" />
              <Medal className="w-12 h-12" />
            </div>
            <h2 className="text-3xl font-bold mb-2">
              {language === 'ar' ? '🏆 المنافسة الشهرية للموردين' : '🏆 Monthly Supplier Competition'}
            </h2>
            <p className="text-xl opacity-90">
              {language === 'ar' 
                ? 'تنافس للفوز بالجائزة الذهبية والفضية والبرونزية!'
                : 'Compete to win Gold, Silver, and Bronze awards!'}
            </p>
          </CardContent>
        </Card>

        <Tabs defaultValue="current" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="current" className="gap-2">
              <Star className="w-4 h-4" />
              {language === 'ar' ? 'الشهر الحالي' : 'Current Month'}
            </TabsTrigger>
            <TabsTrigger value="previous" className="gap-2">
              <Calendar className="w-4 h-4" />
              {language === 'ar' ? 'الشهر السابق' : 'Previous Month'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="current">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  {language === 'ar' ? 'جوائز الشهر الحالي' : 'Current Month Awards'}
                </CardTitle>
                <CardDescription>
                  {currentMonthAwards.length > 0 && formatMonth(currentMonthAwards[0].award_month)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
                  </div>
                ) : currentMonthAwards.length === 0 ? (
                  <div className="text-center py-12">
                    <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-semibold mb-2">
                      {language === 'ar' 
                        ? 'لم يتم إعلان جوائز هذا الشهر بعد'
                        : 'No awards announced for this month yet'}
                    </p>
                    <p className="text-muted-foreground">
                      {language === 'ar'
                        ? 'يتم حساب الجوائز في نهاية كل شهر'
                        : 'Awards are calculated at the end of each month'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {currentMonthAwards.map(renderAwardCard)}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="previous">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  {language === 'ar' ? 'جوائز الشهر السابق' : 'Previous Month Awards'}
                </CardTitle>
                <CardDescription>
                  {previousMonthAwards.length > 0 && formatMonth(previousMonthAwards[0].award_month)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
                  </div>
                ) : previousMonthAwards.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    {language === 'ar' 
                      ? 'لا توجد جوائز للشهر السابق'
                      : 'No awards for the previous month'}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {previousMonthAwards.map(renderAwardCard)}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SupplierCompetition;
