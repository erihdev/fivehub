import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Award, Crown, Clock, Shield, Sparkles, Trophy, Medal,
  ArrowLeft, TrendingUp, TrendingDown, Minus, Lightbulb,
  CheckCircle, AlertCircle, Target
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SupplierBadge {
  id: string;
  badge_type: string;
  badge_name: string;
  badge_description: string | null;
  earned_at: string;
  expires_at: string | null;
  is_active: boolean;
  performance_score: number | null;
}

interface ClassificationLog {
  id: string;
  previous_level: string;
  new_level: string;
  previous_score: number;
  new_score: number;
  created_at: string;
}

interface SupplierData {
  id: string;
  name: string;
  performance_score: number | null;
  performance_level: string | null;
  total_orders: number | null;
  delayed_orders: number | null;
  avg_delay_days: number | null;
}

const getBadgeConfig = (badgeType: string) => {
  switch (badgeType) {
    case 'top_performer':
      return { icon: Crown, color: 'from-amber-400 to-yellow-500', label: 'متميز' };
    case 'perfect_timing':
      return { icon: Clock, color: 'from-green-400 to-emerald-500', label: 'التزام' };
    case 'trusted_supplier':
      return { icon: Shield, color: 'from-blue-400 to-indigo-500', label: 'موثوق' };
    case 'rising_star':
      return { icon: Sparkles, color: 'from-purple-400 to-pink-500', label: 'صاعد' };
    case 'excellence':
      return { icon: Trophy, color: 'from-orange-400 to-red-500', label: 'تميز' };
    default:
      return { icon: Medal, color: 'from-gray-400 to-gray-500', label: 'شارة' };
  }
};

const MySupplierBadges = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState<SupplierData | null>(null);
  const [badges, setBadges] = useState<SupplierBadge[]>([]);
  const [classificationLogs, setClassificationLogs] = useState<ClassificationLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isRtl = language === 'ar';

  useEffect(() => {
    if (user) {
      fetchSupplierData();
    }
  }, [user]);

  const fetchSupplierData = async () => {
    try {
      // Get supplier
      const { data: supplierData, error: supplierError } = await supabase
        .from('suppliers')
        .select('id, name, performance_score, performance_level, total_orders, delayed_orders, avg_delay_days')
        .eq('user_id', user!.id)
        .single();

      if (supplierError) throw supplierError;
      setSupplier(supplierData);

      if (supplierData) {
        // Get badges
        const { data: badgesData } = await supabase
          .from('supplier_badges')
          .select('*')
          .eq('supplier_id', supplierData.id)
          .order('earned_at', { ascending: false });

        setBadges(badgesData || []);

        // Get classification logs
        const { data: logsData } = await supabase
          .from('supplier_classification_logs')
          .select('*')
          .eq('supplier_id', supplierData.id)
          .order('created_at', { ascending: false })
          .limit(10);

        setClassificationLogs(logsData || []);
      }
    } catch (error) {
      console.error('Error fetching supplier data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getLevelLabel = (level: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      excellent: { ar: 'ممتاز', en: 'Excellent' },
      good: { ar: 'جيد', en: 'Good' },
      average: { ar: 'متوسط', en: 'Average' },
      poor: { ar: 'ضعيف', en: 'Poor' },
    };
    return labels[level]?.[language === 'ar' ? 'ar' : 'en'] || level;
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'excellent': return 'bg-green-500';
      case 'good': return 'bg-blue-500';
      case 'average': return 'bg-amber-500';
      case 'poor': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getImprovementTips = () => {
    if (!supplier) return [];

    const tips: { icon: typeof CheckCircle; text: string; priority: 'high' | 'medium' | 'low' }[] = [];
    const delayPercentage = supplier.total_orders && supplier.delayed_orders
      ? (supplier.delayed_orders / supplier.total_orders) * 100
      : 0;

    if (delayPercentage > 20) {
      tips.push({
        icon: AlertCircle,
        text: language === 'ar' 
          ? 'قلل نسبة التأخير إلى أقل من 20% للحصول على تصنيف أفضل'
          : 'Reduce delay rate below 20% for better rating',
        priority: 'high',
      });
    }

    if ((supplier.avg_delay_days || 0) > 3) {
      tips.push({
        icon: Clock,
        text: language === 'ar'
          ? 'حاول تقليل متوسط أيام التأخير إلى أقل من 3 أيام'
          : 'Try to reduce average delay days below 3',
        priority: 'high',
      });
    }

    if ((supplier.performance_score || 0) >= 90 && !badges.find(b => b.badge_type === 'top_performer')) {
      tips.push({
        icon: Trophy,
        text: language === 'ar'
          ? 'أنت قريب من الحصول على شارة الأداء المتميز!'
          : 'You are close to earning the Top Performer badge!',
        priority: 'medium',
      });
    }

    if (delayPercentage === 0 && (supplier.total_orders || 0) >= 5 && !badges.find(b => b.badge_type === 'perfect_timing')) {
      tips.push({
        icon: CheckCircle,
        text: language === 'ar'
          ? 'استمر بدون تأخير للحصول على شارة الالتزام المثالي'
          : 'Keep zero delays to earn Perfect Timing badge',
        priority: 'medium',
      });
    }

    if ((supplier.total_orders || 0) < 10) {
      tips.push({
        icon: Target,
        text: language === 'ar'
          ? 'أكمل 10 طلبات على الأقل لتصبح مؤهلاً لشارة المورد الموثوق'
          : 'Complete at least 10 orders to qualify for Trusted Supplier badge',
        priority: 'low',
      });
    }

    return tips;
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
            <div className="text-muted-foreground">
              {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="min-h-screen bg-background" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="container mx-auto px-4 py-8">
          <Button variant="ghost" className="gap-2 mb-6" onClick={() => navigate(-1)}>
            {isRtl ? <ArrowLeft className="w-4 h-4 rotate-180" /> : <ArrowLeft className="w-4 h-4" />}
            {language === 'ar' ? 'رجوع' : 'Back'}
          </Button>
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-muted-foreground">
              {language === 'ar' ? 'لم يتم العثور على بيانات المورد' : 'Supplier data not found'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const tips = getImprovementTips();
  const activeBadges = badges.filter(b => b.is_active);
  const expiredBadges = badges.filter(b => !b.is_active);

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
              <Award className="w-8 h-8 text-amber-500" />
              {language === 'ar' ? 'شاراتي وتصنيفي' : 'My Badges & Rating'}
            </h1>
            <p className="text-muted-foreground mt-1">{supplier.name}</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Performance Overview */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{language === 'ar' ? 'نظرة عامة على الأداء' : 'Performance Overview'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6 mb-6">
                <div className="text-center">
                  <div className="text-5xl font-bold text-primary">
                    {supplier.performance_score || 0}%
                  </div>
                  <Badge className={`${getLevelColor(supplier.performance_level || 'average')} text-white mt-2`}>
                    {getLevelLabel(supplier.performance_level || 'average')}
                  </Badge>
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{language === 'ar' ? 'نسبة الأداء' : 'Performance'}</span>
                      <span>{supplier.performance_score || 0}%</span>
                    </div>
                    <Progress value={supplier.performance_score || 0} className="h-3" />
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold">{supplier.total_orders || 0}</div>
                      <div className="text-xs text-muted-foreground">
                        {language === 'ar' ? 'إجمالي الطلبات' : 'Total Orders'}
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-500">{supplier.delayed_orders || 0}</div>
                      <div className="text-xs text-muted-foreground">
                        {language === 'ar' ? 'طلبات متأخرة' : 'Delayed'}
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{(supplier.avg_delay_days || 0).toFixed(1)}</div>
                      <div className="text-xs text-muted-foreground">
                        {language === 'ar' ? 'متوسط التأخير (يوم)' : 'Avg Delay (days)'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Improvement Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                {language === 'ar' ? 'نصائح للتحسين' : 'Improvement Tips'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tips.length === 0 ? (
                <div className="text-center py-4">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                  <p className="text-muted-foreground">
                    {language === 'ar' ? 'أداء ممتاز! استمر في العمل الرائع' : 'Excellent performance! Keep up the great work'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tips.map((tip, index) => (
                    <div
                      key={index}
                      className={`flex items-start gap-3 p-3 rounded-lg border ${
                        tip.priority === 'high' ? 'border-red-200 bg-red-50 dark:bg-red-950' :
                        tip.priority === 'medium' ? 'border-amber-200 bg-amber-50 dark:bg-amber-950' :
                        'border-green-200 bg-green-50 dark:bg-green-950'
                      }`}
                    >
                      <tip.icon className={`w-5 h-5 mt-0.5 ${
                        tip.priority === 'high' ? 'text-red-500' :
                        tip.priority === 'medium' ? 'text-amber-500' :
                        'text-green-500'
                      }`} />
                      <span className="text-sm">{tip.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Badges */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                {language === 'ar' ? 'الشارات النشطة' : 'Active Badges'}
                <Badge variant="secondary">{activeBadges.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeBadges.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {language === 'ar' 
                    ? 'لم تحصل على شارات بعد. حسّن أداءك للحصول على شارات!'
                    : 'No badges yet. Improve your performance to earn badges!'}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {activeBadges.map((badge) => {
                    const config = getBadgeConfig(badge.badge_type);
                    const Icon = config.icon;
                    return (
                      <div
                        key={badge.id}
                        className={`flex items-center gap-4 p-4 rounded-lg bg-gradient-to-r ${config.color} text-white`}
                      >
                        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <div className="font-bold">{badge.badge_name}</div>
                          {badge.badge_description && (
                            <div className="text-sm opacity-90">{badge.badge_description}</div>
                          )}
                          <div className="text-xs opacity-75 mt-1">
                            {language === 'ar' ? 'حُصل عليها:' : 'Earned:'}{' '}
                            {new Date(badge.earned_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Classification History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                {language === 'ar' ? 'سجل التصنيف' : 'Classification History'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {classificationLogs.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  {language === 'ar' ? 'لا توجد تغييرات في التصنيف بعد' : 'No classification changes yet'}
                </div>
              ) : (
                <div className="space-y-3">
                  {classificationLogs.map((log) => {
                    const improved = log.new_score > log.previous_score;
                    const unchanged = log.new_score === log.previous_score;
                    return (
                      <div key={log.id} className="flex items-center gap-3 p-3 rounded-lg border">
                        {improved ? (
                          <TrendingUp className="w-5 h-5 text-green-500" />
                        ) : unchanged ? (
                          <Minus className="w-5 h-5 text-gray-500" />
                        ) : (
                          <TrendingDown className="w-5 h-5 text-red-500" />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge className={`${getLevelColor(log.previous_level)} text-white text-xs`}>
                              {getLevelLabel(log.previous_level)}
                            </Badge>
                            <span className="text-muted-foreground">→</span>
                            <Badge className={`${getLevelColor(log.new_level)} text-white text-xs`}>
                              {getLevelLabel(log.new_level)}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {log.previous_score}% → {log.new_score}%
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Expired Badges */}
          {expiredBadges.length > 0 && (
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-muted-foreground">
                  <Medal className="w-5 h-5" />
                  {language === 'ar' ? 'شارات منتهية الصلاحية' : 'Expired Badges'}
                </CardTitle>
                <CardDescription>
                  {language === 'ar' 
                    ? 'هذه الشارات انتهت صلاحيتها. حسّن أداءك لاستعادتها!'
                    : 'These badges have expired. Improve your performance to earn them again!'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {expiredBadges.map((badge) => (
                    <Badge key={badge.id} variant="outline" className="opacity-50">
                      {badge.badge_name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default MySupplierBadges;
