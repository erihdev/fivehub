import { useState, useEffect } from "react";
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  Loader2,
  RefreshCw,
  CreditCard,
  ShieldCheck,
  DollarSign,
  Wallet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { format, formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import OrderPaymentDialog from "@/components/order/OrderPaymentDialog";

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
  expected_delivery: string | null;
  supplier: {
    name: string;
  } | null;
  coffee: {
    name: string;
  } | null;
  tracking?: {
    status: string;
    location: string | null;
    tracking_number: string | null;
    carrier: string | null;
    estimated_arrival: string | null;
    updated_at: string;
  }[];
}

const ORDER_STATUSES = ["pending", "confirmed", "paid", "shipped", "delivered"];

const OrderTracking = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<Order | null>(null);

  const isArabic = language === "ar";

  const openPaymentDialog = (order: Order) => {
    setSelectedOrderForPayment(order);
    setPaymentDialogOpen(true);
  };

  const fetchOrders = async (showRefresh = false) => {
    if (!user) return;

    if (showRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    
    try {
      const { data } = await supabase
        .from("orders")
        .select(`
          *,
          supplier:suppliers(name),
          coffee:coffee_offerings(name),
          tracking:shipment_tracking(*)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      const transformedOrders = (data || []).map(order => ({
        ...order,
        supplier: Array.isArray(order.supplier) ? order.supplier[0] : order.supplier,
        coffee: Array.isArray(order.coffee) ? order.coffee[0] : order.coffee,
      }));

      setOrders(transformedOrders);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    // Subscribe to tracking updates
    const channel = supabase
      .channel("order-tracking")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shipment_tracking",
        },
        () => {
          fetchOrders();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const getStatusProgress = (status: string) => {
    const index = ORDER_STATUSES.indexOf(status);
    return index >= 0 ? ((index + 1) / ORDER_STATUSES.length) * 100 : 0;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "confirmed":
        return <CreditCard className="w-4 h-4" />;
      case "paid":
        return <ShieldCheck className="w-4 h-4" />;
      case "shipped":
        return <Truck className="w-4 h-4" />;
      case "delivered":
        return <Package className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusLabel = (status: string) => {
    if (isArabic) {
      switch (status) {
        case "pending": return "قيد الانتظار";
        case "confirmed": return "بانتظار الدفع";
        case "paid": return "في الضمان";
        case "shipped": return "تم الشحن";
        case "delivered": return "تم التسليم";
        default: return status;
      }
    }
    switch (status) {
      case "pending": return "Pending";
      case "confirmed": return "Awaiting Payment";
      case "paid": return "In Escrow";
      case "shipped": return "Shipped";
      case "delivered": return "Delivered";
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-amber-500";
      case "confirmed": return "bg-blue-500";
      case "paid": return "bg-green-500";
      case "shipped": return "bg-purple-500";
      case "delivered": return "bg-emerald-500";
      default: return "bg-gray-500";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5" />
              {isArabic ? "تتبع الشحنات" : "Shipment Tracking"}
            </CardTitle>
            <CardDescription>
              {isArabic
                ? "تتبع حالة طلباتك في الوقت الفعلي"
                : "Track your orders status in real-time"}
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fetchOrders(true)}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {orders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Truck className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>{isArabic ? "لا توجد طلبات للتتبع" : "No orders to track"}</p>
          </div>
        ) : (
          orders.map((order) => (
            <div
              key={order.id}
              className="border rounded-lg p-4 space-y-4"
            >
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div>
                  <h4 className="font-medium">
                    {order.coffee?.name || (isArabic ? "منتج" : "Product")}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {order.supplier?.name} • {order.quantity_kg} {isArabic ? "كغ" : "kg"}
                    {order.total_price && ` • ${order.total_price} ${order.currency || 'SAR'}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={getStatusColor(order.status)}>
                    {getStatusIcon(order.status)}
                    <span className="mr-1">{getStatusLabel(order.status)}</span>
                  </Badge>
                  {order.escrow_id && (
                    <Badge variant="outline" className="bg-success/10 text-success border-success">
                      <ShieldCheck className="w-3 h-3 mr-1" />
                      {isArabic ? "محمي" : "Protected"}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Payment Button - Show when confirmed and not paid */}
              {order.status === 'confirmed' && order.payment_status !== 'paid' && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {isArabic ? 'المورد أكد الطلب - ادفع الآن' : 'Supplier confirmed - Pay now'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isArabic ? 'المبلغ محمي في الضمان حتى الاستلام' : 'Amount protected in escrow until delivery'}
                        </p>
                      </div>
                    </div>
                    <Button 
                      onClick={() => openPaymentDialog(order)}
                      className="bg-gradient-to-r from-fivehub-orange to-fivehub-gold hover:from-fivehub-orange-dark hover:to-fivehub-orange"
                    >
                      <CreditCard className="w-4 h-4 ml-2" />
                      {isArabic ? 'ادفع الآن' : 'Pay Now'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Escrow Status */}
              {order.payment_status === 'paid' && order.escrow_id && (
                <div className="bg-success/5 border border-success/20 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-success">
                    <ShieldCheck className="w-5 h-5" />
                    <span className="font-medium text-sm">
                      {isArabic ? 'المبلغ في حساب الضمان' : 'Amount held in escrow'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isArabic 
                      ? 'سيتم تحويل المبلغ للمورد تلقائياً عند تأكيد الاستلام' 
                      : 'Will be released to supplier upon delivery confirmation'}
                  </p>
                </div>
              )}

              {/* Progress Bar */}
              <div className="space-y-2">
                <Progress value={getStatusProgress(order.status)} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  {ORDER_STATUSES.map((status, i) => (
                    <span
                      key={status}
                      className={
                        ORDER_STATUSES.indexOf(order.status) >= i
                          ? "text-primary font-medium"
                          : ""
                      }
                    >
                      {getStatusLabel(status)}
                    </span>
                  ))}
                </div>
              </div>

              {/* Tracking Details */}
              {order.tracking && order.tracking.length > 0 && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span>
                      {order.tracking[0].location || (isArabic ? "جاري التحديث" : "Updating...")}
                    </span>
                  </div>
                  {order.tracking[0].tracking_number && (
                    <p className="text-xs text-muted-foreground">
                      {isArabic ? "رقم التتبع:" : "Tracking #:"} {order.tracking[0].tracking_number}
                    </p>
                  )}
                  {order.tracking[0].carrier && (
                    <p className="text-xs text-muted-foreground">
                      {isArabic ? "الناقل:" : "Carrier:"} {order.tracking[0].carrier}
                    </p>
                  )}
                  {order.tracking[0].estimated_arrival && (
                    <p className="text-xs text-muted-foreground">
                      {isArabic ? "الوصول المتوقع:" : "ETA:"}{" "}
                      {format(new Date(order.tracking[0].estimated_arrival), "dd/MM/yyyy", {
                        locale: isArabic ? ar : undefined,
                      })}
                    </p>
                  )}
                </div>
              )}

              {/* Dates */}
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {isArabic ? "تاريخ الطلب:" : "Order date:"}{" "}
                  {format(new Date(order.order_date), "dd/MM/yyyy")}
                </span>
                {order.expected_delivery && (
                  <span>
                    {isArabic ? "التسليم المتوقع:" : "Expected:"}{" "}
                    {format(new Date(order.expected_delivery), "dd/MM/yyyy")}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>

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
          coffee_name: selectedOrderForPayment.coffee?.name,
          supplier_name: selectedOrderForPayment.supplier?.name,
        }}
        onPaymentSuccess={() => {
          fetchOrders();
          setSelectedOrderForPayment(null);
        }}
      />
    )}
  </>
  );
};

export default OrderTracking;
