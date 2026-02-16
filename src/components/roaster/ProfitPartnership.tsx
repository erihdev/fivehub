import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Handshake, TrendingUp, Award, Gift, Crown, Gem, Star, Medal } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Partnership {
  id: string;
  cafe_id: string;
  partnership_tier: string;
  total_orders: number;
  total_spent: number;
  current_discount_percentage: number;
  next_tier_threshold: number | null;
  started_at: string;
}

interface Milestone {
  id: string;
  partnership_id: string;
  milestone_type: string;
  old_tier: string | null;
  new_tier: string | null;
  discount_earned: number | null;
  created_at: string;
}

const TIER_CONFIG = {
  bronze: { icon: Medal, color: 'from-amber-600 to-amber-800', next: 5000, discount: 2 },
  silver: { icon: Star, color: 'from-gray-300 to-gray-500', next: 20000, discount: 4 },
  gold: { icon: Award, color: 'from-yellow-400 to-amber-500', next: 50000, discount: 7 },
  platinum: { icon: Crown, color: 'from-gray-400 to-gray-600', next: 100000, discount: 10 },
  diamond: { icon: Gem, color: 'from-cyan-400 to-blue-500', next: null, discount: 15 },
};

export const ProfitPartnership = () => {
  const { user } = useAuth();
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cafeNames, setCafeNames] = useState<Record<string, string>>({});
  const [stats, setStats] = useState({ totalPartners: 0, totalDiscount: 0, avgTier: '' });

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    
    try {
      const { data: partnerData, error: partnerError } = await supabase
        .from('roaster_cafe_partnerships')
        .select('*')
        .eq('roaster_id', user.id)
        .order('total_spent', { ascending: false });

      if (partnerError) throw partnerError;
      setPartnerships(partnerData || []);

      // Fetch cafe names
      if (partnerData && partnerData.length > 0) {
        const cafeIds = partnerData.map(p => p.cafe_id);
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('user_id, company_name')
          .in('user_id', cafeIds);
        
        const names: Record<string, string> = {};
        roleData?.forEach(r => {
          names[r.user_id] = r.company_name || 'مقهى';
        });
        setCafeNames(names);

        // Fetch milestones
        const partnerIds = partnerData.map(p => p.id);
        const { data: milestoneData } = await supabase
          .from('partnership_milestones')
          .select('*')
          .in('partnership_id', partnerIds)
          .order('created_at', { ascending: false })
          .limit(10);
        
        setMilestones(milestoneData || []);

        // Calculate stats
        const totalDiscount = partnerData.reduce((sum, p) => sum + (p.current_discount_percentage || 0), 0);
        setStats({
          totalPartners: partnerData.length,
          totalDiscount: totalDiscount / partnerData.length,
          avgTier: getMostCommonTier(partnerData)
        });
      }
    } catch (error) {
      console.error('Error fetching partnerships:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getMostCommonTier = (data: Partnership[]) => {
    const counts: Record<string, number> = {};
    data.forEach(p => {
      counts[p.partnership_tier] = (counts[p.partnership_tier] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'bronze';
  };

  const getTierProgress = (partnership: Partnership) => {
    const tier = partnership.partnership_tier as keyof typeof TIER_CONFIG;
    const config = TIER_CONFIG[tier];
    if (!config.next) return 100;
    
    const prevThreshold = tier === 'bronze' ? 0 : 
      tier === 'silver' ? 5000 : 
      tier === 'gold' ? 20000 : 
      tier === 'platinum' ? 50000 : 0;
    
    const progress = ((partnership.total_spent - prevThreshold) / (config.next - prevThreshold)) * 100;
    return Math.min(100, Math.max(0, progress));
  };

  const getTierName = (tier: string) => {
    const names: Record<string, string> = {
      bronze: 'برونزي',
      silver: 'فضي',
      gold: 'ذهبي',
      platinum: 'بلاتيني',
      diamond: 'ماسي'
    };
    return names[tier] || tier;
  };

  if (isLoading) {
    return <div className="text-center py-8">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-primary/20 to-primary/5">
          <CardContent className="p-6 text-center">
            <Handshake className="h-8 w-8 mx-auto mb-2 text-primary" />
            <div className="text-3xl font-bold">{stats.totalPartners}</div>
            <p className="text-sm text-muted-foreground">شريك نشط</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-500/20 to-green-500/5">
          <CardContent className="p-6 text-center">
            <Gift className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <div className="text-3xl font-bold">{stats.totalDiscount.toFixed(1)}%</div>
            <p className="text-sm text-muted-foreground">متوسط الخصم المقدم</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-yellow-500/20 to-yellow-500/5">
          <CardContent className="p-6 text-center">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
            <div className="text-3xl font-bold">{getTierName(stats.avgTier)}</div>
            <p className="text-sm text-muted-foreground">المستوى الأكثر شيوعاً</p>
          </CardContent>
        </Card>
      </div>

      {/* Tier Explanation */}
      <Card>
        <CardHeader>
          <CardTitle>نظام مستويات الشراكة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Object.entries(TIER_CONFIG).map(([tier, config]) => {
              const Icon = config.icon;
              return (
                <div 
                  key={tier}
                  className={`p-3 rounded-lg bg-gradient-to-br ${config.color} text-white text-center`}
                >
                  <Icon className="h-6 w-6 mx-auto mb-1" />
                  <p className="font-bold text-sm">{getTierName(tier)}</p>
                  <p className="text-xs opacity-90">خصم {config.discount}%</p>
                  {config.next && (
                    <p className="text-xs opacity-75 mt-1">
                      حتى {config.next.toLocaleString()} ر.س
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Partnerships List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Handshake className="h-5 w-5" />
            الشراكات النشطة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {partnerships.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Handshake className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>لا توجد شراكات بعد</p>
              <p className="text-sm">ستبدأ الشراكات تلقائياً عند أول طلب مكتمل</p>
            </div>
          ) : (
            partnerships.map((p) => {
              const tier = p.partnership_tier as keyof typeof TIER_CONFIG;
              const config = TIER_CONFIG[tier];
              const Icon = config.icon;
              const progress = getTierProgress(p);

              return (
                <div key={p.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full bg-gradient-to-br ${config.color}`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{cafeNames[p.cafe_id] || 'مقهى'}</h4>
                        <p className="text-xs text-muted-foreground">
                          شريك منذ {format(new Date(p.started_at), 'MMMM yyyy', { locale: ar })}
                        </p>
                      </div>
                    </div>
                    
                    <Badge className={`bg-gradient-to-r ${config.color} text-white`}>
                      {getTierName(tier)} - خصم {p.current_discount_percentage}%
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">الطلبات</p>
                      <p className="font-bold">{p.total_orders}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">إجمالي الإنفاق</p>
                      <p className="font-bold">{p.total_spent?.toLocaleString()} ر.س</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">الخصم الحالي</p>
                      <p className="font-bold text-green-600">{p.current_discount_percentage}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">المستوى التالي</p>
                      <p className="font-bold">
                        {p.next_tier_threshold 
                          ? `${p.next_tier_threshold.toLocaleString()} ر.س` 
                          : 'أعلى مستوى ✨'
                        }
                      </p>
                    </div>
                  </div>
                  
                  {p.next_tier_threshold && (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>التقدم نحو المستوى التالي</span>
                        <span>{progress.toFixed(0)}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Recent Milestones */}
      {milestones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              آخر الإنجازات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {milestones.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                  <div className="p-2 bg-green-500/20 rounded-full">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">
                      ترقية من <strong>{getTierName(m.old_tier || '')}</strong> إلى{' '}
                      <strong>{getTierName(m.new_tier || '')}</strong>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(m.created_at), 'dd MMMM yyyy', { locale: ar })}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-green-600">
                    +{m.discount_earned}% خصم
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
