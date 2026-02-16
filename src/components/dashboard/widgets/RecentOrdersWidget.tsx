import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Order {
  id: string;
  coffeeName: string;
  quantity: number;
  status: string;
  date: string;
}

export const RecentOrdersWidget = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchOrders = async () => {
      const { data } = await supabase
        .from('orders')
        .select(`
          id,
          quantity_kg,
          status,
          order_date,
          coffee:coffee_offerings(name)
        `)
        .eq('user_id', user.id)
        .order('order_date', { ascending: false })
        .limit(5);

      if (data) {
        setOrders(
          data.map(order => ({
            id: order.id,
            coffeeName: (order.coffee as any)?.name || 'Unknown',
            quantity: order.quantity_kg,
            status: order.status,
            date: order.order_date,
          }))
        );
      }
    };

    fetchOrders();
  }, [user]);

  const isArabic = language === 'ar';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-600';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-600';
      case 'cancelled':
        return 'bg-red-500/10 text-red-600';
      default:
        return 'bg-secondary text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      completed: { ar: 'مكتمل', en: 'Completed' },
      pending: { ar: 'قيد الانتظار', en: 'Pending' },
      shipped: { ar: 'تم الشحن', en: 'Shipped' },
      cancelled: { ar: 'ملغي', en: 'Cancelled' },
    };
    return labels[status]?.[isArabic ? 'ar' : 'en'] || status;
  };

  if (orders.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        {isArabic ? 'لا توجد طلبات حديثة' : 'No recent orders'}
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-48 overflow-auto">
      {orders.map(order => (
        <div
          key={order.id}
          className="flex items-center justify-between p-2 bg-secondary/50 rounded-lg"
        >
          <div>
            <p className="text-sm font-medium truncate max-w-[120px]">{order.coffeeName}</p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(order.date), 'dd MMM', { locale: isArabic ? ar : undefined })}
            </p>
          </div>
          <div className="text-end">
            <Badge className={getStatusColor(order.status)}>{getStatusLabel(order.status)}</Badge>
            <p className="text-xs text-muted-foreground mt-1">
              {order.quantity} {isArabic ? 'كجم' : 'kg'}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RecentOrdersWidget;
