import { useState, useEffect } from "react";
import {
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  Loader2,
  Eye,
  Bell,
  CreditCard,
  ShieldCheck,
  Wallet,
  DollarSign,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/use-toast";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface Order {
  id: string;
  quantity_kg: number;
  total_price: number | null;
  status: string;
  payment_status: string | null;
  escrow_id: string | null;
  created_at: string;
  order_date: string;
  expected_delivery: string | null;
  notes: string | null;
  user_id: string;
  coffee?: {
    name: string;
  } | null;
  roaster_name?: string | null;
}

interface SupplierOrdersListProps {
  showOnlyCompleted?: boolean;
}

const SupplierOrdersList = ({ showOnlyCompleted = false }: SupplierOrdersListProps) => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const { showNotification, isGranted } = usePushNotifications();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const isArabic = language === "ar";

  const fetchOrders = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data: suppliers } = await supabase
        .from("suppliers")
        .select("id")
        .eq("user_id", user.id);

      if (!suppliers?.length) {
        setOrders([]);
        setIsLoading(false);
        return;
      }

      const supplierIds = suppliers.map((s) => s.id);

      let query = supabase
        .from("orders")
        .select(`
          *,
          coffee:coffee_offerings(name)
        `)
        .in("supplier_id", supplierIds)
        .order("created_at", { ascending: false });

      // Filter by completed orders if showOnlyCompleted is true
      if (showOnlyCompleted) {
        query = query.eq("status", "delivered");
      }

      const { data } = await query;

      // Get roaster names from profiles by user_id
      const userIds = [...new Set((data || []).map(o => o.user_id).filter(Boolean))];
      let roastersMap: Record<string, string> = {};
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, business_name")
          .in("user_id", userIds);
        
        // Build map from profiles
        (profiles || []).forEach((p) => {
          if (p.user_id) roastersMap[p.user_id] = p.business_name || p.full_name || '';
        });

        // For users without profiles, try to get from auth metadata via user_id lookup
        const missingUserIds = userIds.filter(id => !roastersMap[id]);
        if (missingUserIds.length > 0) {
          // Fallback: check if they have entries in any user table (e.g. suppliers table but as buyers)
          // For now, just mark as unknown buyer
          missingUserIds.forEach(id => {
            if (!roastersMap[id]) roastersMap[id] = isArabic ? 'مشتري' : 'Buyer';
          });
        }
      }

      const transformedOrders = (data || []).map(order => ({
        ...order,
        coffee: Array.isArray(order.coffee) ? order.coffee[0] : order.coffee,
        roaster_name: order.user_id ? roastersMap[order.user_id] || (isArabic ? 'مشتري' : 'Buyer') : null
      }));

      setOrders(transformedOrders);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    // Subscribe to new orders
    const channel = supabase
      .channel("supplier-orders")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
        },
        async (payload) => {
          // Check if this order is for our supplier
          const { data: suppliers } = await supabase
            .from("suppliers")
            .select("id")
            .eq("user_id", user?.id);

          if (suppliers?.some((s) => s.id === payload.new.supplier_id)) {
            fetchOrders();
            
            toast({
              title: isArabic ? "طلب جديد!" : "New Order!",
              description: isArabic
                ? `تم استلام طلب جديد بكمية ${payload.new.quantity_kg} كغ`
                : `New order received: ${payload.new.quantity_kg} kg`,
            });

            if (isGranted) {
              showNotification(isArabic ? "طلب جديد!" : "New Order!", {
                body: isArabic
                  ? `تم استلام طلب جديد بكمية ${payload.new.quantity_kg} كغ`
                  : `New order received: ${payload.new.quantity_kg} kg`,
                tag: "new-order",
                url: "/supplier-dashboard",
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);

      if (error) throw error;

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );

      toast({
        title: isArabic ? "تم التحديث" : "Updated",
        description: isArabic ? "تم تحديث حالة الطلب" : "Order status updated",
      });
    } catch (error) {
      console.error("Error updating order:", error);
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "فشل تحديث الحالة" : "Failed to update status",
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100">
            <Clock className="w-3 h-3 mr-1" />
            {isArabic ? "معلق" : "Pending"}
          </Badge>
        );
      case "confirmed":
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
            <CreditCard className="w-3 h-3 mr-1" />
            {isArabic ? "مؤكد - بانتظار الدفع" : "Confirmed - Awaiting Payment"}
          </Badge>
        );
      case "paid":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
            <ShieldCheck className="w-3 h-3 mr-1" />
            {isArabic ? "تم الدفع - في الضمان" : "Paid - In Escrow"}
          </Badge>
        );
      case "shipped":
        return (
          <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100">
            <Truck className="w-3 h-3 mr-1" />
            {isArabic ? "تم الشحن" : "Shipped"}
          </Badge>
        );
      case "delivered":
        return (
          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100">
            <DollarSign className="w-3 h-3 mr-1" />
            {isArabic ? "تم التسليم - تم التحويل" : "Delivered - Released"}
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            {isArabic ? "ملغي" : "Cancelled"}
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getPaymentBadge = (paymentStatus: string | null, escrowId: string | null) => {
    if (!paymentStatus) return null;
    
    switch (paymentStatus) {
      case "paid":
        return (
          <Badge variant="outline" className="bg-success/10 text-success border-success">
            <ShieldCheck className="w-3 h-3 mr-1" />
            {isArabic ? "في الضمان" : "In Escrow"}
          </Badge>
        );
      case "released":
        return (
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary">
            <DollarSign className="w-3 h-3 mr-1" />
            {isArabic ? "تم التحويل" : "Released"}
          </Badge>
        );
      case "unpaid":
        return (
          <Badge variant="outline" className="bg-warning/10 text-warning border-warning">
            <Wallet className="w-3 h-3 mr-1" />
            {isArabic ? "غير مدفوع" : "Unpaid"}
          </Badge>
        );
      default:
        return null;
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          {showOnlyCompleted 
            ? (isArabic ? "سجل الطلبات المكتملة" : "Completed Orders History")
            : (isArabic ? "الطلبات الواردة" : "Incoming Orders")}
        </CardTitle>
        <CardDescription>
          {showOnlyCompleted
            ? (isArabic ? "الطلبات التي تم تسليمها بنجاح" : "Orders that have been successfully delivered")
            : (isArabic ? "إدارة وتتبع الطلبات من المحامص" : "Manage and track orders from roasters")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>{isArabic ? "لا توجد طلبات بعد" : "No orders yet"}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isArabic ? "التاريخ" : "Date"}</TableHead>
                <TableHead>{isArabic ? "المحمصة" : "Roaster"}</TableHead>
                <TableHead>{isArabic ? "المنتج" : "Product"}</TableHead>
                <TableHead>{isArabic ? "الكمية" : "Quantity"}</TableHead>
                <TableHead>{isArabic ? "المبلغ" : "Amount"}</TableHead>
                <TableHead>{isArabic ? "الحالة" : "Status"}</TableHead>
                <TableHead>{isArabic ? "الدفع" : "Payment"}</TableHead>
                <TableHead>{isArabic ? "تغيير الحالة" : "Update Status"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    {format(new Date(order.order_date), "dd/MM/yyyy", {
                      locale: isArabic ? ar : undefined,
                    })}
                  </TableCell>
                  <TableCell className="font-medium">{order.roaster_name || (isArabic ? "مشتري" : "Buyer")}</TableCell>
                  <TableCell>{order.coffee?.name || (isArabic ? "غير محدد" : "Not specified")}</TableCell>
                  <TableCell>{order.quantity_kg} {isArabic ? "كغ" : "kg"}</TableCell>
                  <TableCell>
                    {order.total_price ? `${order.total_price.toLocaleString()} ر.س` : "-"}
                  </TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell>
                    {getPaymentBadge(order.payment_status, order.escrow_id)}
                    {order.escrow_id && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-success">
                        <ShieldCheck className="w-3 h-3" />
                        {isArabic ? "محمي" : "Protected"}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={order.status}
                      onValueChange={(value) => updateOrderStatus(order.id, value)}
                      disabled={updatingId === order.id || (order.status === 'pending' && order.payment_status !== 'paid')}
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">{isArabic ? "معلق" : "Pending"}</SelectItem>
                        <SelectItem value="confirmed">{isArabic ? "مؤكد" : "Confirmed"}</SelectItem>
                        <SelectItem value="paid" disabled>{isArabic ? "مدفوع" : "Paid"}</SelectItem>
                        <SelectItem value="shipped" disabled={order.payment_status !== 'paid'}>
                          {isArabic ? "تم الشحن" : "Shipped"}
                        </SelectItem>
                        <SelectItem value="delivered" disabled={order.status !== 'shipped'}>
                          {isArabic ? "تم التسليم" : "Delivered"}
                        </SelectItem>
                        <SelectItem value="cancelled">{isArabic ? "ملغي" : "Cancelled"}</SelectItem>
                      </SelectContent>
                    </Select>
                    {order.status === 'pending' && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {isArabic ? "قم بتأكيد الطلب أولاً" : "Confirm order first"}
                      </p>
                    )}
                    {order.status === 'confirmed' && order.payment_status !== 'paid' && (
                      <p className="text-xs text-warning mt-1">
                        {isArabic ? "بانتظار دفع المشتري" : "Awaiting buyer payment"}
                      </p>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default SupplierOrdersList;
