import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, CheckCircle2, Truck, Package, ArrowLeft, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface OrderStep {
  key: 'pending' | 'confirmed' | 'shipped' | 'delivered';
  label: { ar: string; en: string };
  icon: any;
}

const ORDER_STEPS: OrderStep[] = [
  { key: 'pending', label: { ar: 'طلب جديد', en: 'New Order' }, icon: ClipboardList },
  { key: 'confirmed', label: { ar: 'تم التأكيد', en: 'Confirmed' }, icon: CheckCircle2 },
  { key: 'shipped', label: { ar: 'تم الشحن', en: 'Shipped' }, icon: Truck },
  { key: 'delivered', label: { ar: 'تم التسليم', en: 'Delivered' }, icon: Package },
];

const SupplyChainTracking = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isArabic = language === 'ar';

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    fetchOrders();
  }, [user]);

  const fetchOrders = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    
    try {
      const { data } = await supabase
        .from('orders')
        .select(`
          id,
          quantity_kg,
          status,
          order_date,
          coffee_offerings(name),
          suppliers(name)
        `)
        .eq('user_id', user.id)
        .order('order_date', { ascending: false })
        .limit(10);

      if (data) {
        setOrders(data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getStepIndex = (status: string) => {
    const map: Record<string, number> = {
      pending: 0,
      confirmed: 1,
      shipped: 2,
      delivered: 3,
    };
    return map[status] ?? 0;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-500 text-white';
      case 'shipped': return 'bg-blue-500 text-white';
      case 'confirmed': return 'bg-amber-500 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="container mx-auto py-6 px-4 max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">
            {isArabic ? 'سير عمل الطلبات' : 'Order Workflow'}
          </h1>
        </div>

        {orders.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                {isArabic ? 'لا توجد طلبات' : 'No Orders'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {isArabic ? 'لم تقم بأي طلبات بعد' : "You haven't placed any orders yet"}
              </p>
              <Button onClick={() => navigate('/suppliers')}>
                {isArabic ? 'تصفح الموردين' : 'Browse Suppliers'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const currentStepIndex = getStepIndex(order.status);
              
              return (
                <Card key={order.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    {/* Order Info */}
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {(order.coffee_offerings as any)?.name || (isArabic ? 'قهوة' : 'Coffee')}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {(order.suppliers as any)?.name} • {order.quantity_kg} {isArabic ? 'كجم' : 'kg'}
                        </p>
                      </div>
                      <Badge className={getStatusColor(order.status)}>
                        {ORDER_STEPS[currentStepIndex]?.label[isArabic ? 'ar' : 'en']}
                      </Badge>
                    </div>

                    {/* Simple Progress Steps */}
                    <div className="flex items-center justify-between gap-1">
                      {ORDER_STEPS.map((step, index) => {
                        const Icon = step.icon;
                        const isCompleted = index <= currentStepIndex;
                        const isCurrent = index === currentStepIndex;
                        
                        return (
                          <div key={step.key} className="flex items-center flex-1">
                            {/* Step Circle */}
                            <div className="flex flex-col items-center flex-1">
                              <div 
                                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                                  isCompleted 
                                    ? 'bg-primary text-primary-foreground' 
                                    : 'bg-muted text-muted-foreground'
                                } ${isCurrent ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                              >
                                <Icon className="h-5 w-5" />
                              </div>
                              <span className={`text-xs mt-1 text-center ${isCompleted ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                                {step.label[isArabic ? 'ar' : 'en']}
                              </span>
                            </div>
                            
                            {/* Connector Line */}
                            {index < ORDER_STEPS.length - 1 && (
                              <div className={`h-1 flex-1 mx-1 rounded ${
                                index < currentStepIndex ? 'bg-primary' : 'bg-muted'
                              }`} />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Date */}
                    <p className="text-xs text-muted-foreground mt-3 text-center">
                      {format(new Date(order.order_date), 'dd MMM yyyy', {
                        locale: isArabic ? ar : enUS
                      })}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SupplyChainTracking;
