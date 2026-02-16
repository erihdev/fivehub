import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { ArrowLeft, Package, Clock, CheckCircle2, Truck, Loader2, ShieldCheck, Wallet, Plus, Upload } from "lucide-react";
import AddCoffeeManuallySheet from "@/components/supplier/AddCoffeeManuallySheet";

interface Order {
  id: string;
  quantity_kg: number;
  total_price: number | null;
  status: string;
  payment_status: string | null;
  order_date: string;
  coffee?: { name: string } | null;
  buyer_name?: string;
}

const SellerOrdersHub = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'active' | 'done'>('all');

  const isArabic = language === "ar";

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data: suppliers } = await supabase.from("suppliers").select("id").eq("user_id", user.id);
      const supplierIds = suppliers?.map(s => s.id) || [];

      if (supplierIds.length > 0) {
        const { data: ordersData } = await supabase
          .from("orders")
          .select(`*, coffee:coffee_offerings(name)`)
          .in("supplier_id", supplierIds)
          .order("order_date", { ascending: false });

        const userIds = [...new Set((ordersData || []).map(o => o.user_id).filter(Boolean))];
        let buyersMap: Record<string, string> = {};
        
        if (userIds.length > 0) {
          const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, business_name").in("user_id", userIds);
          (profiles || []).forEach(p => {
            if (p.user_id) buyersMap[p.user_id] = p.business_name || p.full_name || (isArabic ? 'مشتري' : 'Buyer');
          });
        }

        setOrders((ordersData || []).map(order => ({
          ...order,
          coffee: Array.isArray(order.coffee) ? order.coffee[0] : order.coffee,
          buyer_name: order.user_id ? buyersMap[order.user_id] || (isArabic ? 'مشتري' : 'Buyer') : null
        })));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      toast.success(isArabic ? "تم التحديث ✓" : "Updated ✓");
    } catch {
      toast.error(isArabic ? "فشل" : "Failed");
    } finally {
      setUpdatingId(null);
    }
  };

  const counts = {
    pending: orders.filter(o => o.status === 'pending').length,
    active: orders.filter(o => ['confirmed', 'paid', 'shipped'].includes(o.status)).length,
    done: orders.filter(o => o.status === 'delivered').length,
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background" dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <h1 className="text-xl font-bold">{isArabic ? "طلباتي (بائع)" : "My Orders (Seller)"}</h1>
        </div>

        {/* Quick Actions - Add Products */}
        <div className="flex gap-2">
          <AddCoffeeManuallySheet onSuccess={fetchData} />
          <Link to="/ai-upload">
            <Button variant="outline" size="sm" className="gap-2">
              <Upload className="w-4 h-4" />
              {isArabic ? "رفع بالذكاء الاصطناعي" : "AI Upload"}
            </Button>
          </Link>
        </div>

        {/* Stats Row - Clickable Filters */}
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveFilter(activeFilter === 'pending' ? 'all' : 'pending')}
            className={`flex-1 rounded-xl p-3 text-center transition-all ${activeFilter === 'pending' ? 'ring-2 ring-amber-500 bg-amber-200 dark:bg-amber-800/50' : 'bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-800/40'}`}
          >
            <Clock className="w-5 h-5 mx-auto text-amber-600 mb-1" />
            <span className="text-xl font-bold text-amber-700">{counts.pending}</span>
            <p className="text-xs text-amber-600">{isArabic ? "جديد" : "New"}</p>
          </button>
          <button 
            onClick={() => setActiveFilter(activeFilter === 'active' ? 'all' : 'active')}
            className={`flex-1 rounded-xl p-3 text-center transition-all ${activeFilter === 'active' ? 'ring-2 ring-blue-500 bg-blue-200 dark:bg-blue-800/50' : 'bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-800/40'}`}
          >
            <Truck className="w-5 h-5 mx-auto text-blue-600 mb-1" />
            <span className="text-xl font-bold text-blue-700">{counts.active}</span>
            <p className="text-xs text-blue-600">{isArabic ? "نشط" : "Active"}</p>
          </button>
          <button 
            onClick={() => setActiveFilter(activeFilter === 'done' ? 'all' : 'done')}
            className={`flex-1 rounded-xl p-3 text-center transition-all ${activeFilter === 'done' ? 'ring-2 ring-green-500 bg-green-200 dark:bg-green-800/50' : 'bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-800/40'}`}
          >
            <CheckCircle2 className="w-5 h-5 mx-auto text-green-600 mb-1" />
            <span className="text-xl font-bold text-green-700">{counts.done}</span>
            <p className="text-xs text-green-600">{isArabic ? "مكتمل" : "Done"}</p>
          </button>
        </div>

        {/* Active Filter Label */}
        {activeFilter !== 'all' && (
          <div className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
            <span className="text-sm">
              {activeFilter === 'pending' && (isArabic ? 'عرض: الطلبات الجديدة' : 'Showing: New Orders')}
              {activeFilter === 'active' && (isArabic ? 'عرض: الطلبات النشطة' : 'Showing: Active Orders')}
              {activeFilter === 'done' && (isArabic ? 'عرض: الطلبات المكتملة' : 'Showing: Completed Orders')}
            </span>
            <Button variant="ghost" size="sm" onClick={() => setActiveFilter('all')}>
              {isArabic ? 'عرض الكل' : 'Show All'}
            </Button>
          </div>
        )}

        {/* Orders List */}
        {(() => {
          const filteredOrders = orders.filter(o => {
            if (activeFilter === 'all') return true;
            if (activeFilter === 'pending') return o.status === 'pending';
            if (activeFilter === 'active') return ['confirmed', 'paid', 'shipped'].includes(o.status);
            if (activeFilter === 'done') return o.status === 'delivered';
            return true;
          });
          
          return filteredOrders.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>{isArabic ? "لا توجد طلبات" : "No orders yet"}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map(order => (
              <div key={order.id} className="bg-card border rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold truncate">{order.coffee?.name || (isArabic ? 'منتج' : 'Product')}</h3>
                    <p className="text-sm text-muted-foreground">{order.buyer_name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold">{order.total_price?.toLocaleString()} <span className="text-xs">ر.س</span></p>
                    <p className="text-xs text-muted-foreground">{order.quantity_kg} كجم</p>
                  </div>
                </div>

                {/* Payment Status */}
                {order.payment_status === 'paid' && (
                  <div className="flex items-center gap-2 text-sm bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg px-3 py-2">
                    <ShieldCheck className="w-4 h-4" />
                    <span>{isArabic ? "المبلغ في الضمان" : "In Escrow"}</span>
                  </div>
                )}
                {order.payment_status !== 'paid' && order.status === 'confirmed' && (
                  <div className="flex items-center gap-2 text-sm bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-lg px-3 py-2">
                    <Wallet className="w-4 h-4" />
                    <span>{isArabic ? "بانتظار دفع المشتري" : "Awaiting buyer payment"}</span>
                  </div>
                )}

                {/* Status + Actions */}
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(order.order_date), 'dd MMM', { locale: isArabic ? ar : enUS })}
                  </p>
                  <Select
                    value={order.status}
                    onValueChange={(v) => updateOrderStatus(order.id, v)}
                    disabled={updatingId === order.id}
                  >
                    <SelectTrigger className="w-32 h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">{isArabic ? "جديد" : "New"}</SelectItem>
                      <SelectItem value="confirmed">{isArabic ? "مؤكد" : "Confirmed"}</SelectItem>
                      <SelectItem value="shipped" disabled={order.payment_status !== 'paid'}>{isArabic ? "شحن" : "Shipped"}</SelectItem>
                      <SelectItem value="delivered" disabled={order.status !== 'shipped'}>{isArabic ? "تسليم" : "Delivered"}</SelectItem>
                      <SelectItem value="cancelled">{isArabic ? "إلغاء" : "Cancel"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        );
        })()}
      </div>
    </div>
  );
};

export default SellerOrdersHub;
