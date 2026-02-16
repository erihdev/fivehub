import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { ArrowRight, Package, Plus, Truck, CheckCircle, XCircle, Clock, Loader2, CreditCard, ShieldCheck, Wallet } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import OrderPaymentDialog from "@/components/order/OrderPaymentDialog";

interface Order {
  id: string;
  supplier_id: string;
  coffee_id: string | null;
  quantity_kg: number;
  price_per_kg: number | null;
  total_price: number | null;
  currency: string;
  status: string;
  payment_status: string | null;
  order_date: string;
  expected_delivery: string | null;
  actual_delivery: string | null;
  notes: string | null;
  escrow_id: string | null;
  suppliers: { name: string };
  coffee_offerings: { name: string; origin: string | null } | null;
}

interface Supplier {
  id: string;
  name: string;
}

interface Coffee {
  id: string;
  name: string;
  origin: string | null;
  supplier_id: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "قيد الانتظار", color: "bg-fivehub-gold", icon: <Clock className="h-4 w-4" /> },
  confirmed: { label: "تم التأكيد", color: "bg-info", icon: <CreditCard className="h-4 w-4" /> },
  shipped: { label: "تم الشحن", color: "bg-fivehub-brown", icon: <Truck className="h-4 w-4" /> },
  delivered: { label: "تم الاستلام", color: "bg-success", icon: <CheckCircle className="h-4 w-4" /> },
  cancelled: { label: "ملغي", color: "bg-destructive", icon: <XCircle className="h-4 w-4" /> },
};

const paymentStatusConfig: Record<string, { label: string; color: string }> = {
  unpaid: { label: "غير مدفوع", color: "bg-warning" },
  pending: { label: "قيد المعالجة", color: "bg-info" },
  paid: { label: "مدفوع (في الضمان)", color: "bg-success" },
  released: { label: "تم التحويل للمورد", color: "bg-primary" },
  refunded: { label: "مسترد", color: "bg-destructive" },
};

const Orders = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [coffees, setCoffees] = useState<Coffee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<Order | null>(null);
  const [newOrder, setNewOrder] = useState({
    supplier_id: "",
    coffee_id: "",
    quantity_kg: "",
    price_per_kg: "",
    order_date: format(new Date(), "yyyy-MM-dd"),
    expected_delivery: "",
    notes: "",
  });

  const openPaymentDialog = (order: Order) => {
    setSelectedOrderForPayment(order);
    setPaymentDialogOpen(true);
  };

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchOrders();
      fetchSuppliers();
      fetchCoffees();
    }
  }, [user]);

  const fetchOrders = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select(`*, suppliers (name), coffee_offerings (name, origin)`)
      .order("order_date", { ascending: false });

    if (!error) setOrders(data as unknown as Order[] || []);
    setIsLoading(false);
  };

  const fetchSuppliers = async () => {
    const { data } = await supabase.from("suppliers").select("id, name");
    setSuppliers(data || []);
  };

  const fetchCoffees = async () => {
    const { data } = await supabase.from("coffee_offerings").select("id, name, origin, supplier_id");
    setCoffees(data || []);
  };

  const createOrder = async () => {
    if (!user || !newOrder.supplier_id || !newOrder.quantity_kg) return;

    const totalPrice = newOrder.price_per_kg ? Number(newOrder.quantity_kg) * Number(newOrder.price_per_kg) : null;

    const { error } = await supabase.from("orders").insert({
      user_id: user.id,
      supplier_id: newOrder.supplier_id,
      coffee_id: newOrder.coffee_id || null,
      quantity_kg: Number(newOrder.quantity_kg),
      price_per_kg: newOrder.price_per_kg ? Number(newOrder.price_per_kg) : null,
      total_price: totalPrice,
      order_date: newOrder.order_date,
      expected_delivery: newOrder.expected_delivery || null,
      notes: newOrder.notes || null,
    });

    if (error) {
      toast({ title: "خطأ", description: "فشل في إنشاء الطلب", variant: "destructive" });
    } else {
      toast({ title: "تم", description: "تم إنشاء الطلب بنجاح" });
      setIsDialogOpen(false);
      setNewOrder({ supplier_id: "", coffee_id: "", quantity_kg: "", price_per_kg: "", order_date: format(new Date(), "yyyy-MM-dd"), expected_delivery: "", notes: "" });
      fetchOrders();
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const updates: Record<string, unknown> = { status };
    if (status === "delivered") updates.actual_delivery = format(new Date(), "yyyy-MM-dd");

    const { error } = await supabase.from("orders").update(updates).eq("id", id);
    if (!error) {
      toast({ title: "تم", description: "تم تحديث حالة الطلب" });
      fetchOrders();
    }
  };

  const filteredCoffees = coffees.filter(c => c.supplier_id === newOrder.supplier_id);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background font-arabic p-6" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">سجل الطلبات</h1>
            <p className="text-muted-foreground mt-1">تتبع طلباتك من الموردين</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="ml-2 h-4 w-4" />طلب جديد</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg" dir="rtl">
                <DialogHeader>
                  <DialogTitle>إضافة طلب جديد</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>المورد *</Label>
                    <Select value={newOrder.supplier_id} onValueChange={(v) => setNewOrder({ ...newOrder, supplier_id: v, coffee_id: "" })}>
                      <SelectTrigger><SelectValue placeholder="اختر المورد" /></SelectTrigger>
                      <SelectContent>
                        {suppliers.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  {filteredCoffees.length > 0 && (
                    <div>
                      <Label>المحصول (اختياري)</Label>
                      <Select value={newOrder.coffee_id} onValueChange={(v) => setNewOrder({ ...newOrder, coffee_id: v })}>
                        <SelectTrigger><SelectValue placeholder="اختر المحصول" /></SelectTrigger>
                        <SelectContent>
                          {filteredCoffees.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name} - {c.origin}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>الكمية (كجم) *</Label>
                      <Input type="number" value={newOrder.quantity_kg} onChange={(e) => setNewOrder({ ...newOrder, quantity_kg: e.target.value })} />
                    </div>
                    <div>
                      <Label>السعر/كجم</Label>
                      <Input type="number" value={newOrder.price_per_kg} onChange={(e) => setNewOrder({ ...newOrder, price_per_kg: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>تاريخ الطلب</Label>
                      <Input type="date" value={newOrder.order_date} onChange={(e) => setNewOrder({ ...newOrder, order_date: e.target.value })} />
                    </div>
                    <div>
                      <Label>التسليم المتوقع</Label>
                      <Input type="date" value={newOrder.expected_delivery} onChange={(e) => setNewOrder({ ...newOrder, expected_delivery: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label>ملاحظات</Label>
                    <Textarea value={newOrder.notes} onChange={(e) => setNewOrder({ ...newOrder, notes: e.target.value })} rows={2} />
                  </div>
                  <Button onClick={createOrder} className="w-full" disabled={!newOrder.supplier_id || !newOrder.quantity_kg}>إنشاء الطلب</Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              <ArrowRight className="ml-2 h-4 w-4" />العودة
            </Button>
          </div>
        </div>

        <div className="grid gap-4">
          {orders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">لا توجد طلبات مسجلة</p>
              </CardContent>
            </Card>
          ) : (
            orders.map((order) => (
              <Card key={order.id}>
                <CardContent className="py-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-lg">{order.suppliers.name}</h3>
                        <Badge className={`${statusConfig[order.status]?.color || 'bg-muted'} text-white`}>
                          {statusConfig[order.status]?.icon}
                          <span className="mr-1">{statusConfig[order.status]?.label || order.status}</span>
                        </Badge>
                        {order.payment_status && paymentStatusConfig[order.payment_status] && (
                          <Badge variant="outline" className={`${paymentStatusConfig[order.payment_status].color} text-white`}>
                            <Wallet className="h-3 w-3 mr-1" />
                            {paymentStatusConfig[order.payment_status].label}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {order.coffee_offerings?.name || "محصول غير محدد"} • {order.quantity_kg} كجم
                        {order.total_price && ` • ${order.total_price} ${order.currency}`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        تاريخ الطلب: {format(new Date(order.order_date), "PPP", { locale: ar })}
                        {order.expected_delivery && ` • التسليم المتوقع: ${format(new Date(order.expected_delivery), "PPP", { locale: ar })}`}
                      </p>
                      {order.escrow_id && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-success">
                          <ShieldCheck className="h-3 w-3" />
                          <span>محمي بنظام الضمان</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 items-center">
                      {/* Show Pay button only when confirmed and not paid */}
                      {order.status === 'confirmed' && order.payment_status !== 'paid' && (
                        <Button 
                          onClick={() => openPaymentDialog(order)}
                          className="bg-gradient-to-r from-fivehub-orange to-fivehub-gold hover:from-fivehub-orange-dark hover:to-fivehub-orange"
                        >
                          <CreditCard className="h-4 w-4 ml-2" />
                          ادفع الآن
                        </Button>
                      )}
                      <Select value={order.status} onValueChange={(v) => updateStatus(order.id, v)}>
                        <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusConfig).map(([key, { label }]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Payment Dialog */}
        {selectedOrderForPayment && (
          <OrderPaymentDialog
            open={paymentDialogOpen}
            onOpenChange={setPaymentDialogOpen}
            order={{
              id: selectedOrderForPayment.id,
              total_price: selectedOrderForPayment.total_price || 0,
              quantity_kg: selectedOrderForPayment.quantity_kg,
              price_per_kg: selectedOrderForPayment.price_per_kg || undefined,
              currency: selectedOrderForPayment.currency,
              coffee_name: selectedOrderForPayment.coffee_offerings?.name,
              supplier_name: selectedOrderForPayment.suppliers.name,
            }}
            onPaymentSuccess={() => {
              fetchOrders();
              setSelectedOrderForPayment(null);
            }}
          />
        )}
      </div>
    </main>
  );
};

export default Orders;
