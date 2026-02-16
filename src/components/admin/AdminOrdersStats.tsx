import { useEffect, useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ShoppingCart, 
  Package, 
  Truck, 
  CheckCircle, 
  XCircle,
  Clock,
  TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface OrderStats {
  total: number;
  pending: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  totalValue: number;
  thisMonthOrders: number;
  thisMonthValue: number;
}

interface RecentOrder {
  id: string;
  status: string;
  quantity_kg: number;
  total_price: number;
  currency: string;
  order_date: string;
  supplier_id: string;
}

export const AdminOrdersStats = () => {
  const { language } = useLanguage();
  const [stats, setStats] = useState<OrderStats>({
    total: 0,
    pending: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    totalValue: 0,
    thisMonthOrders: 0,
    thisMonthValue: 0,
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isArabic = language === 'ar';

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      try {
        // Fetch all orders
        const { data: orders } = await supabase
          .from('orders')
          .select('*')
          .order('order_date', { ascending: false });

        if (orders) {
          const now = new Date();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

          const thisMonthOrders = orders.filter(
            o => new Date(o.order_date) >= startOfMonth
          );

          setStats({
            total: orders.length,
            pending: orders.filter(o => o.status === 'pending').length,
            shipped: orders.filter(o => o.status === 'shipped').length,
            delivered: orders.filter(o => o.status === 'delivered' || o.status === 'completed').length,
            cancelled: orders.filter(o => o.status === 'cancelled').length,
            totalValue: orders.reduce((sum, o) => sum + (o.total_price || 0), 0),
            thisMonthOrders: thisMonthOrders.length,
            thisMonthValue: thisMonthOrders.reduce((sum, o) => sum + (o.total_price || 0), 0),
          });

          setRecentOrders(orders.slice(0, 5));
        }
      } catch (error) {
        console.error('Error fetching order stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();

    // Realtime subscription
    const channel = supabase
      .channel('admin-orders-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchStats)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; labelAr: string; variant: string; icon: React.ReactNode }> = {
      pending: { label: 'Pending', labelAr: 'قيد الانتظار', variant: 'bg-yellow-500/10 text-yellow-600', icon: <Clock className="w-3 h-3" /> },
      shipped: { label: 'Shipped', labelAr: 'تم الشحن', variant: 'bg-blue-500/10 text-blue-600', icon: <Truck className="w-3 h-3" /> },
      delivered: { label: 'Delivered', labelAr: 'تم التسليم', variant: 'bg-green-500/10 text-green-600', icon: <CheckCircle className="w-3 h-3" /> },
      completed: { label: 'Completed', labelAr: 'مكتمل', variant: 'bg-green-500/10 text-green-600', icon: <CheckCircle className="w-3 h-3" /> },
      cancelled: { label: 'Cancelled', labelAr: 'ملغي', variant: 'bg-red-500/10 text-red-600', icon: <XCircle className="w-3 h-3" /> },
    };
    const c = config[status] || config.pending;
    return (
      <Badge className={`${c.variant} flex items-center gap-1`}>
        {c.icon}
        {isArabic ? c.labelAr : c.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-center">
          <ShoppingCart className="w-5 h-5 mx-auto mb-1 text-blue-500" />
          <p className="text-xl font-bold text-blue-600">{stats.total}</p>
          <p className="text-xs text-muted-foreground">{isArabic ? 'إجمالي الطلبات' : 'Total Orders'}</p>
        </div>
        <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 text-center">
          <Clock className="w-5 h-5 mx-auto mb-1 text-yellow-500" />
          <p className="text-xl font-bold text-yellow-600">{stats.pending}</p>
          <p className="text-xs text-muted-foreground">{isArabic ? 'قيد الانتظار' : 'Pending'}</p>
        </div>
        <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 text-center">
          <Truck className="w-5 h-5 mx-auto mb-1 text-purple-500" />
          <p className="text-xl font-bold text-purple-600">{stats.shipped}</p>
          <p className="text-xs text-muted-foreground">{isArabic ? 'قيد الشحن' : 'Shipped'}</p>
        </div>
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 text-center">
          <CheckCircle className="w-5 h-5 mx-auto mb-1 text-green-500" />
          <p className="text-xl font-bold text-green-600">{stats.delivered}</p>
          <p className="text-xs text-muted-foreground">{isArabic ? 'مكتمل' : 'Completed'}</p>
        </div>
      </div>

      {/* This Month Stats */}
      <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <p className="font-semibold">{isArabic ? 'هذا الشهر' : 'This Month'}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-2xl font-bold">{stats.thisMonthOrders}</p>
            <p className="text-xs text-muted-foreground">{isArabic ? 'طلب' : 'Orders'}</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{stats.thisMonthValue.toLocaleString()} <span className="text-sm font-normal">SAR</span></p>
            <p className="text-xs text-muted-foreground">{isArabic ? 'إجمالي القيمة' : 'Total Value'}</p>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      {recentOrders.length > 0 && (
        <div>
          <p className="font-semibold mb-3 flex items-center gap-2">
            <Package className="w-4 h-4" />
            {isArabic ? 'أحدث الطلبات' : 'Recent Orders'}
          </p>
          <div className="space-y-2 max-h-48 overflow-auto">
            {recentOrders.map(order => (
              <div
                key={order.id}
                className="flex items-center justify-between p-2 bg-secondary/50 rounded-lg text-sm"
              >
                <div>
                  <p className="font-medium">{order.quantity_kg} {isArabic ? 'كجم' : 'kg'}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(order.order_date), 'dd MMM yyyy', { locale: isArabic ? ar : undefined })}
                  </p>
                </div>
                <div className="text-end">
                  {getStatusBadge(order.status)}
                  <p className="text-xs text-muted-foreground mt-1">
                    {order.total_price?.toLocaleString() || 0} {order.currency || 'SAR'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrdersStats;
