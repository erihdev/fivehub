import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SupplierBadgesDisplay } from '@/components/SupplierBadgesDisplay';
import { 
  Trophy, Medal, Award, Crown, TrendingUp, 
  ArrowLeft, Star, Package, Clock 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LeaderboardSupplier {
  id: string;
  name: string;
  performance_score: number | null;
  performance_level: string | null;
  total_orders: number | null;
  delayed_orders: number | null;
  avg_delay_days: number | null;
}

const SupplierLeaderboard = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<LeaderboardSupplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const isRtl = language === 'ar';

  useEffect(() => {
    const fetchRole = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      setUserRole(data?.role || null);
    };
    fetchRole();
  }, [user]);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name, performance_score, performance_level, total_orders, delayed_orders, avg_delay_days')
        .not('performance_score', 'is', null)
        .order('performance_score', { ascending: false })
        .limit(20);

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Crown className="w-8 h-8 text-amber-500" />;
      case 1:
        return <Medal className="w-7 h-7 text-gray-400" />;
      case 2:
        return <Medal className="w-6 h-6 text-amber-700" />;
      default:
        return <span className="text-lg font-bold text-muted-foreground">{index + 1}</span>;
    }
  };

  const getLevelBadge = (level: string | null) => {
    switch (level) {
      case 'excellent':
        return <Badge className="bg-green-500 text-white">{language === 'ar' ? 'ممتاز' : 'Excellent'}</Badge>;
      case 'good':
        return <Badge className="bg-blue-500 text-white">{language === 'ar' ? 'جيد' : 'Good'}</Badge>;
      case 'average':
        return <Badge className="bg-amber-500 text-white">{language === 'ar' ? 'متوسط' : 'Average'}</Badge>;
      case 'poor':
        return <Badge className="bg-red-500 text-white">{language === 'ar' ? 'ضعيف' : 'Poor'}</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className={`h-5 w-5 ${isRtl ? 'rotate-180' : ''}`} />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Trophy className="w-8 h-8 text-amber-500" />
              {language === 'ar' ? 'لوحة صدارة الموردين' : 'Supplier Leaderboard'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {language === 'ar' ? 'أفضل الموردين أداءً' : 'Top performing suppliers'}
            </p>
          </div>
        </div>

        {/* Top 3 Podium */}
        {suppliers.length >= 3 && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            {/* Second Place */}
            <Card className="mt-8 border-gray-300 bg-gradient-to-b from-gray-50 to-background dark:from-gray-900">
              <CardContent className="pt-6 text-center">
                <div className="flex justify-center mb-3">
                  <Medal className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="font-bold text-lg mb-2">{suppliers[1].name}</h3>
                <div className="text-2xl font-bold text-gray-500 mb-2">
                  {suppliers[1].performance_score}%
                </div>
                {getLevelBadge(suppliers[1].performance_level)}
                <div className="mt-3">
                  <SupplierBadgesDisplay supplierId={suppliers[1].id} size="sm" />
                </div>
              </CardContent>
            </Card>

            {/* First Place */}
            <Card className="border-amber-300 bg-gradient-to-b from-amber-50 to-background dark:from-amber-950 shadow-lg">
              <CardContent className="pt-6 text-center">
                <div className="flex justify-center mb-3">
                  <Crown className="w-16 h-16 text-amber-500" />
                </div>
                <h3 className="font-bold text-xl mb-2">{suppliers[0].name}</h3>
                <div className="text-3xl font-bold text-amber-600 mb-2">
                  {suppliers[0].performance_score}%
                </div>
                {getLevelBadge(suppliers[0].performance_level)}
                <div className="mt-3">
                  <SupplierBadgesDisplay supplierId={suppliers[0].id} size="md" />
                </div>
              </CardContent>
            </Card>

            {/* Third Place */}
            <Card className="mt-12 border-amber-700 bg-gradient-to-b from-amber-100 to-background dark:from-amber-900">
              <CardContent className="pt-6 text-center">
                <div className="flex justify-center mb-3">
                  <Medal className="w-10 h-10 text-amber-700" />
                </div>
                <h3 className="font-bold text-lg mb-2">{suppliers[2].name}</h3>
                <div className="text-2xl font-bold text-amber-700 mb-2">
                  {suppliers[2].performance_score}%
                </div>
                {getLevelBadge(suppliers[2].performance_level)}
                <div className="mt-3">
                  <SupplierBadgesDisplay supplierId={suppliers[2].id} size="sm" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Full Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              {language === 'ar' ? 'الترتيب الكامل' : 'Full Rankings'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
              </div>
            ) : suppliers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {language === 'ar' ? 'لا توجد بيانات أداء بعد' : 'No performance data yet'}
              </div>
            ) : (
              <div className="space-y-3">
                {suppliers.map((supplier, index) => (
                  <div
                    key={supplier.id}
                    className={`flex items-center gap-4 p-4 rounded-lg border ${
                      index < 3 ? 'bg-accent/30' : 'bg-card'
                    }`}
                  >
                    <div className="w-10 flex justify-center">
                      {getRankIcon(index)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{supplier.name}</span>
                        {getLevelBadge(supplier.performance_level)}
                      </div>
                      <SupplierBadgesDisplay supplierId={supplier.id} size="sm" />
                    </div>

                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Package className="w-4 h-4" />
                        <span>{supplier.total_orders || 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{(supplier.avg_delay_days || 0).toFixed(1)} {language === 'ar' ? 'يوم' : 'days'}</span>
                      </div>
                    </div>

                    <div className="text-2xl font-bold text-primary">
                      {supplier.performance_score}%
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SupplierLeaderboard;
