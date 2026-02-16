import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Package, TrendingUp, DollarSign } from 'lucide-react';

export const StatsWidget = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [stats, setStats] = useState({
    suppliers: 0,
    coffees: 0,
    available: 0,
    avgPrice: 0,
  });

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      const [suppliersRes, coffeesRes] = await Promise.all([
        supabase.from('suppliers').select('id', { count: 'exact', head: true }),
        supabase.from('coffee_offerings').select('*'),
      ]);

      const coffees = coffeesRes.data || [];
      const available = coffees.filter(c => c.available).length;
      const avgPrice = coffees.filter(c => c.price).reduce((sum, c) => sum + (c.price || 0), 0) / 
        (coffees.filter(c => c.price).length || 1);

      setStats({
        suppliers: suppliersRes.count || 0,
        coffees: coffees.length,
        available,
        avgPrice,
      });
    };

    fetchStats();
  }, [user]);

  const isArabic = language === 'ar';

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="bg-secondary/50 rounded-lg p-3 text-center">
        <Building2 className="w-5 h-5 mx-auto mb-1 text-coffee-gold" />
        <p className="text-xl font-bold">{stats.suppliers}</p>
        <p className="text-xs text-muted-foreground">{isArabic ? 'مورد' : 'Suppliers'}</p>
      </div>
      <div className="bg-secondary/50 rounded-lg p-3 text-center">
        <Package className="w-5 h-5 mx-auto mb-1 text-coffee-green" />
        <p className="text-xl font-bold">{stats.coffees}</p>
        <p className="text-xs text-muted-foreground">{isArabic ? 'محصول' : 'Coffees'}</p>
      </div>
      <div className="bg-secondary/50 rounded-lg p-3 text-center">
        <TrendingUp className="w-5 h-5 mx-auto mb-1 text-green-500" />
        <p className="text-xl font-bold">{stats.available}</p>
        <p className="text-xs text-muted-foreground">{isArabic ? 'متاح' : 'Available'}</p>
      </div>
      <div className="bg-secondary/50 rounded-lg p-3 text-center">
        <DollarSign className="w-5 h-5 mx-auto mb-1 text-coffee-medium" />
        <p className="text-xl font-bold">{stats.avgPrice.toFixed(0)}</p>
        <p className="text-xs text-muted-foreground">{isArabic ? 'متوسط السعر' : 'Avg Price'}</p>
      </div>
    </div>
  );
};

export default StatsWidget;
