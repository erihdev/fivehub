import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export const PerformanceWidget = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [performance, setPerformance] = useState({
    ordersThisMonth: 0,
    ordersLastMonth: 0,
    inventoryValue: 0,
    lowStockCount: 0,
  });

  useEffect(() => {
    if (!user) return;

    const fetchPerformance = async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();

      const [ordersThisMonthRes, ordersLastMonthRes, inventoryRes] = await Promise.all([
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('order_date', startOfMonth.split('T')[0]),
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('order_date', startOfLastMonth.split('T')[0])
          .lte('order_date', endOfLastMonth.split('T')[0]),
        supabase
          .from('inventory')
          .select(`
            quantity_kg,
            min_quantity_kg,
            coffee:coffee_offerings(price)
          `)
          .eq('user_id', user.id),
      ]);

      const inventory = inventoryRes.data || [];
      const inventoryValue = inventory.reduce((sum, item) => {
        const price = (item.coffee as any)?.price || 0;
        return sum + item.quantity_kg * price;
      }, 0);
      const lowStockCount = inventory.filter(item => item.quantity_kg <= item.min_quantity_kg).length;

      setPerformance({
        ordersThisMonth: ordersThisMonthRes.count || 0,
        ordersLastMonth: ordersLastMonthRes.count || 0,
        inventoryValue,
        lowStockCount,
      });
    };

    fetchPerformance();
  }, [user]);

  const isArabic = language === 'ar';
  const ordersTrend = performance.ordersThisMonth - performance.ordersLastMonth;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
        <div>
          <p className="text-xs text-muted-foreground">
            {isArabic ? 'طلبات هذا الشهر' : 'Orders This Month'}
          </p>
          <p className="text-xl font-bold">{performance.ordersThisMonth}</p>
        </div>
        <div className="flex items-center gap-1">
          {ordersTrend > 0 ? (
            <TrendingUp className="w-4 h-4 text-green-500" />
          ) : ordersTrend < 0 ? (
            <TrendingDown className="w-4 h-4 text-red-500" />
          ) : (
            <Minus className="w-4 h-4 text-muted-foreground" />
          )}
          <span
            className={`text-sm ${
              ordersTrend > 0
                ? 'text-green-500'
                : ordersTrend < 0
                ? 'text-red-500'
                : 'text-muted-foreground'
            }`}
          >
            {ordersTrend > 0 ? '+' : ''}
            {ordersTrend}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
        <div>
          <p className="text-xs text-muted-foreground">
            {isArabic ? 'قيمة المخزون' : 'Inventory Value'}
          </p>
          <p className="text-xl font-bold">{performance.inventoryValue.toLocaleString()} SAR</p>
        </div>
      </div>

      <div className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg">
        <div>
          <p className="text-xs text-muted-foreground">
            {isArabic ? 'منتجات منخفضة' : 'Low Stock Items'}
          </p>
          <p className="text-xl font-bold text-destructive">{performance.lowStockCount}</p>
        </div>
      </div>
    </div>
  );
};

export default PerformanceWidget;
