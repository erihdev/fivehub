import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { ArrowLeft, Package, Clock, CheckCircle2, Truck, Loader2, ShieldCheck, CreditCard, Star } from "lucide-react";
import OrderPaymentDialog from "@/components/order/OrderPaymentDialog";
import OrderRatingDialog from "@/components/OrderRatingDialog";

interface Order {
  id: string;
  quantity_kg: number;
  total_price: number | null;
  price_per_kg: number | null;
  currency: string;
  status: string;
  payment_status: string | null;
  escrow_id: string | null;
  order_date: string;
  rated?: boolean;
  supplier_id: string;
  supplier?: { name: string } | null;
  coffee?: { name: string } | null;
}

const STEPS = ["pending", "confirmed", "paid", "shipped", "delivered"];
const STEP_LABELS = {
  ar: ["طلب", "تأكيد", "دفع", "شحن", "تسليم"],
  en: ["Order", "Confirm", "Pay", "Ship", "Done"]
};

const BuyerOrdersHub = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'active' | 'done'>('all');

  const isArabic = language === "ar";

  useEffect(() => {
    if (user) {
      fetchData();
      const channel = supabase.channel('buyer-orders').on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchData).subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("orders")
        .select(`*, supplier:suppliers(name), coffee:coffee_offerings(name)`)
        .eq("user_id", user.id)
        .order("order_date", { ascending: false });

      setOrders((data || []).map((order: any) => ({
        ...order,
        supplier: Array.isArray(order.supplier) ? order.supplier[0] : order.supplier,
        coffee: Array.isArray(order.coffee) ? order.coffee[0] : order.coffee,
      })));
    } finally {
      setIsLoading(false);
    }
  };

  const getProgress = (status: string) => {
    const idx = STEPS.indexOf(status);
    return idx >= 0 ? ((idx + 1) / STEPS.length) * 100 : 0;
  };

  const counts = {
    pending: orders.filter(o => ['pending', 'confirmed'].includes(o.status)).length,
    active: orders.filter(o => ['paid', 'shipped'].includes(o.status)).length,
    done: orders.filter(o => o.status === 'delivered').length,
  };

  const filteredOrders = orders.filter(o => {
    if (activeFilter === 'pending') return ['pending', 'confirmed'].includes(o.status);
    if (activeFilter === 'active') return ['paid', 'shipped'].includes(o.status);
    if (activeFilter === 'done') return o.status === 'delivered';
    return true;
  });

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background" dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <h1 className="text-xl font-bold">{isArabic ? "طلباتي" : "My Orders"}</h1>
        </div>

        {/* Stats Row - Clickable Filters */}
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveFilter(activeFilter === 'pending' ? 'all' : 'pending')}
            className={`flex-1 rounded-xl p-3 text-center transition-all ${activeFilter === 'pending' ? 'ring-2 ring-amber-500 bg-amber-200 dark:bg-amber-800/50' : 'bg-amber-100 dark:bg-amber-900/30'}`}
          >
            <Clock className="w-5 h-5 mx-auto text-amber-600 mb-1" />
            <span className="text-xl font-bold text-amber-700">{counts.pending}</span>
            <p className="text-xs text-amber-600">{isArabic ? "معلق" : "Pending"}</p>
          </button>
          <button 
            onClick={() => setActiveFilter(activeFilter === 'active' ? 'all' : 'active')}
            className={`flex-1 rounded-xl p-3 text-center transition-all ${activeFilter === 'active' ? 'ring-2 ring-blue-500 bg-blue-200 dark:bg-blue-800/50' : 'bg-blue-100 dark:bg-blue-900/30'}`}
          >
            <Truck className="w-5 h-5 mx-auto text-blue-600 mb-1" />
            <span className="text-xl font-bold text-blue-700">{counts.active}</span>
            <p className="text-xs text-blue-600">{isArabic ? "شحن" : "Shipping"}</p>
          </button>
          <button 
            onClick={() => setActiveFilter(activeFilter === 'done' ? 'all' : 'done')}
            className={`flex-1 rounded-xl p-3 text-center transition-all ${activeFilter === 'done' ? 'ring-2 ring-green-500 bg-green-200 dark:bg-green-800/50' : 'bg-green-100 dark:bg-green-900/30'}`}
          >
            <CheckCircle2 className="w-5 h-5 mx-auto text-green-600 mb-1" />
            <span className="text-xl font-bold text-green-700">{counts.done}</span>
            <p className="text-xs text-green-600">{isArabic ? "مكتمل" : "Done"}</p>
          </button>
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>{isArabic ? "لا توجد طلبات" : "No orders yet"}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map(order => (
              <div key={order.id} className="bg-card border rounded-xl p-4 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold truncate">{order.coffee?.name || (isArabic ? 'منتج' : 'Product')}</h3>
                    <p className="text-sm text-muted-foreground">{order.supplier?.name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold">{order.total_price?.toLocaleString()} <span className="text-xs">{order.currency || 'ر.س'}</span></p>
                    <p className="text-xs text-muted-foreground">{order.quantity_kg} {isArabic ? 'كجم' : 'kg'}</p>
                  </div>
                </div>

                {/* Pay Button */}
                {order.status === 'confirmed' && order.payment_status !== 'paid' && (
                  <Button 
                    onClick={() => { setSelectedOrder(order); setPaymentOpen(true); }} 
                    className="w-full gap-2 bg-primary hover:bg-primary/90"
                  >
                    <CreditCard className="w-4 h-4" />
                    {isArabic ? "ادفع الآن" : "Pay Now"}
                  </Button>
                )}

                {/* Escrow Badge */}
                {order.payment_status === 'paid' && order.status !== 'delivered' && (
                  <div className="flex items-center gap-2 text-sm bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg px-3 py-2">
                    <ShieldCheck className="w-4 h-4" />
                    <span>{isArabic ? "المبلغ محمي في الضمان" : "Protected in Escrow"}</span>
                  </div>
                )}

                {/* Rating Button for delivered orders */}
                {order.status === 'delivered' && !order.rated && (
                  <Button 
                    onClick={() => { setSelectedOrder(order); setRatingOpen(true); }} 
                    variant="outline"
                    className="w-full gap-2 border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                  >
                    <Star className="w-4 h-4" />
                    {isArabic ? "قيّم المورد" : "Rate Supplier"}
                  </Button>
                )}

                {/* Rated Badge */}
                {order.status === 'delivered' && order.rated && (
                  <div className="flex items-center justify-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-900/20 rounded-lg px-3 py-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isArabic ? "تم التقييم" : "Rated"}</span>
                  </div>
                )}

                {/* Progress */}
                <div className="space-y-2">
                  <Progress value={getProgress(order.status)} className="h-2" />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    {STEP_LABELS[isArabic ? 'ar' : 'en'].map((label, i) => (
                      <span key={i} className={STEPS.indexOf(order.status) >= i ? "text-primary font-medium" : ""}>{label}</span>
                    ))}
                  </div>
                </div>

                {/* Date */}
                <p className="text-xs text-muted-foreground text-center">
                  {format(new Date(order.order_date), 'dd MMM yyyy', { locale: isArabic ? ar : enUS })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment Dialog */}
      {selectedOrder && (
        <OrderPaymentDialog
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
          order={{
            id: selectedOrder.id,
            total_price: selectedOrder.total_price || 0,
            quantity_kg: selectedOrder.quantity_kg,
            price_per_kg: selectedOrder.price_per_kg || undefined,
            currency: selectedOrder.currency,
            coffee_name: selectedOrder.coffee?.name,
            supplier_name: selectedOrder.supplier?.name,
          }}
          onPaymentSuccess={() => { fetchData(); setSelectedOrder(null); }}
        />
      )}

      {/* Rating Dialog */}
      {selectedOrder && user && (
        <OrderRatingDialog
          open={ratingOpen}
          onOpenChange={setRatingOpen}
          orderId={selectedOrder.id}
          supplierId={selectedOrder.supplier_id}
          supplierName={selectedOrder.supplier?.name || "المورد"}
          userId={user.id}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
};

export default BuyerOrdersHub;
