import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { 
  Users, 
  UserPlus, 
  AlertTriangle, 
  TrendingDown,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  MessageSquare,
  CheckCircle,
  XCircle,
  Search,
  Bell,
  Eye
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Customer {
  id: string;
  customer_name: string;
  phone: string | null;
  email: string | null;
  first_visit_at: string;
  last_visit_at: string;
  total_visits: number;
  total_spent: number;
  avg_days_between_visits: number | null;
  churn_risk: string;
  favorite_products: string[] | null;
}

interface ChurnAlert {
  id: string;
  customer_id: string;
  risk_level: string;
  days_since_last_visit: number;
  suggested_action: string;
  is_read: boolean;
  is_actioned: boolean;
  created_at: string;
}

const CustomerChurnTracker = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isRTL = language === 'ar';
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [alerts, setAlerts] = useState<ChurnAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [visitDialogOpen, setVisitDialogOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '' });
  const [visitAmount, setVisitAmount] = useState("");

  useEffect(() => {
    if (user) {
      fetchData();
      setupRealtimeSubscription();
    }
  }, [user]);

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('churn-alerts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'cafe_churn_alerts' },
        (payload) => {
          toast.warning(
            isRTL ? '⚠️ تنبيه: عميل معرض للخسارة!' : '⚠️ Alert: Customer at risk!',
            { duration: 5000 }
          );
          fetchAlerts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchData = async () => {
    await Promise.all([fetchCustomers(), fetchAlerts()]);
    setLoading(false);
  };

  const fetchCustomers = async () => {
    const { data } = await supabase
      .from('cafe_customers')
      .select('*')
      .eq('cafe_id', user?.id)
      .order('last_visit_at', { ascending: false });

    if (data) {
      setCustomers(data);
    }
  };

  const fetchAlerts = async () => {
    const { data } = await supabase
      .from('cafe_churn_alerts')
      .select('*')
      .eq('cafe_id', user?.id)
      .eq('is_actioned', false)
      .order('created_at', { ascending: false });

    if (data) {
      setAlerts(data);
    }
  };

  const handleAddCustomer = async () => {
    if (!newCustomer.name.trim()) {
      toast.error(isRTL ? 'الاسم مطلوب' : 'Name is required');
      return;
    }

    const { error } = await supabase
      .from('cafe_customers')
      .insert({
        cafe_id: user?.id,
        customer_name: newCustomer.name,
        phone: newCustomer.phone || null,
        email: newCustomer.email || null
      });

    if (error) {
      toast.error(isRTL ? 'حدث خطأ' : 'An error occurred');
    } else {
      toast.success(isRTL ? 'تمت إضافة العميل' : 'Customer added');
      setAddCustomerOpen(false);
      setNewCustomer({ name: '', phone: '', email: '' });
      fetchCustomers();
    }
  };

  const handleRecordVisit = async () => {
    if (!selectedCustomer) return;

    const { error } = await supabase
      .from('cafe_customer_visits')
      .insert({
        customer_id: selectedCustomer.id,
        cafe_id: user?.id,
        amount_spent: visitAmount ? parseFloat(visitAmount) : null
      });

    if (error) {
      toast.error(isRTL ? 'حدث خطأ' : 'An error occurred');
    } else {
      toast.success(isRTL ? 'تم تسجيل الزيارة' : 'Visit recorded');
      setVisitDialogOpen(false);
      setSelectedCustomer(null);
      setVisitAmount("");
      fetchCustomers();
      fetchAlerts();
    }
  };

  const handleMarkAlertActioned = async (alertId: string) => {
    await supabase
      .from('cafe_churn_alerts')
      .update({ is_actioned: true })
      .eq('id', alertId);
    
    fetchAlerts();
    toast.success(isRTL ? 'تم تحديث التنبيه' : 'Alert updated');
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'churned': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      default: return 'bg-green-500 text-white';
    }
  };

  const getRiskLabel = (risk: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      low: { ar: 'منخفض', en: 'Low' },
      medium: { ar: 'متوسط', en: 'Medium' },
      high: { ar: 'مرتفع', en: 'High' },
      churned: { ar: 'مفقود', en: 'Churned' }
    };
    return isRTL ? labels[risk]?.ar : labels[risk]?.en;
  };

  const filteredCustomers = customers.filter(c => 
    c.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.includes(searchQuery) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const atRiskCustomers = customers.filter(c => ['medium', 'high', 'churned'].includes(c.churn_risk));

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-primary" />
              {isRTL ? 'متابعة العملاء والتنبؤ بالخسارة' : 'Customer Tracking & Churn Prediction'}
            </CardTitle>
            <Button size="sm" onClick={() => setAddCustomerOpen(true)}>
              <UserPlus className="h-4 w-4 mr-1" />
              {isRTL ? 'إضافة عميل' : 'Add Customer'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="alerts">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="alerts" className="flex-1 gap-1">
                <Bell className="h-4 w-4" />
                {isRTL ? 'التنبيهات' : 'Alerts'}
                {alerts.length > 0 && (
                  <Badge variant="destructive" className="h-5 w-5 p-0 justify-center">
                    {alerts.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="customers" className="flex-1 gap-1">
                <Users className="h-4 w-4" />
                {isRTL ? 'العملاء' : 'Customers'}
              </TabsTrigger>
            </TabsList>

            {/* Alerts Tab */}
            <TabsContent value="alerts" className="mt-0">
              {alerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="mx-auto h-12 w-12 mb-4 text-green-500 opacity-50" />
                  <p>{isRTL ? 'لا توجد تنبيهات حالياً' : 'No alerts at the moment'}</p>
                  <p className="text-xs mt-2">
                    {isRTL ? 'عملاؤك في حالة جيدة!' : 'Your customers are doing well!'}
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {alerts.map((alert) => {
                      const customer = customers.find(c => c.id === alert.customer_id);
                      return (
                        <div 
                          key={alert.id}
                          className={`rounded-lg border p-3 ${
                            alert.risk_level === 'churned' ? 'border-red-500/50 bg-red-500/5' :
                            alert.risk_level === 'high' ? 'border-orange-500/50 bg-orange-500/5' :
                            'border-yellow-500/50 bg-yellow-500/5'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <AlertTriangle className={`h-4 w-4 ${
                                  alert.risk_level === 'churned' ? 'text-red-500' :
                                  alert.risk_level === 'high' ? 'text-orange-500' : 'text-yellow-500'
                                }`} />
                                <span className="font-medium">{customer?.customer_name}</span>
                                <Badge className={getRiskColor(alert.risk_level)}>
                                  {getRiskLabel(alert.risk_level)}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {isRTL 
                                  ? `آخر زيارة منذ ${alert.days_since_last_visit} يوم`
                                  : `Last visit ${alert.days_since_last_visit} days ago`}
                              </p>
                              <p className="text-sm mt-2 bg-muted/50 rounded p-2">
                                💡 {alert.suggested_action}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-3">
                            {customer?.phone && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => window.open(`tel:${customer.phone}`)}
                              >
                                <Phone className="h-3 w-3 mr-1" />
                                {isRTL ? 'اتصال' : 'Call'}
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleMarkAlertActioned(alert.id)}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              {isRTL ? 'تم التعامل' : 'Mark Done'}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t">
                <div className="text-center p-2 bg-green-500/10 rounded-lg">
                  <p className="text-xl font-bold text-green-600">
                    {customers.filter(c => c.churn_risk === 'low').length}
                  </p>
                  <p className="text-xs text-muted-foreground">{isRTL ? 'نشط' : 'Active'}</p>
                </div>
                <div className="text-center p-2 bg-yellow-500/10 rounded-lg">
                  <p className="text-xl font-bold text-yellow-600">
                    {customers.filter(c => c.churn_risk === 'medium').length}
                  </p>
                  <p className="text-xs text-muted-foreground">{isRTL ? 'معرض' : 'At Risk'}</p>
                </div>
                <div className="text-center p-2 bg-red-500/10 rounded-lg">
                  <p className="text-xl font-bold text-red-600">
                    {customers.filter(c => ['high', 'churned'].includes(c.churn_risk)).length}
                  </p>
                  <p className="text-xs text-muted-foreground">{isRTL ? 'خطر' : 'Critical'}</p>
                </div>
              </div>
            </TabsContent>

            {/* Customers Tab */}
            <TabsContent value="customers" className="mt-0">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-10"
                  placeholder={isRTL ? 'بحث عن عميل...' : 'Search customers...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {filteredCustomers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>{isRTL ? 'لا يوجد عملاء بعد' : 'No customers yet'}</p>
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {filteredCustomers.map((customer) => (
                      <div 
                        key={customer.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{customer.customer_name}</span>
                            <Badge className={`${getRiskColor(customer.churn_risk)} text-xs`}>
                              {getRiskLabel(customer.churn_risk)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDistanceToNow(new Date(customer.last_visit_at), {
                                addSuffix: true,
                                locale: isRTL ? ar : undefined
                              })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {customer.total_visits} {isRTL ? 'زيارة' : 'visits'}
                            </span>
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              {customer.total_spent.toFixed(0)} SAR
                            </span>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setVisitDialogOpen(true);
                          }}
                        >
                          {isRTL ? 'تسجيل زيارة' : 'Log Visit'}
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Add Customer Dialog */}
      <Dialog open={addCustomerOpen} onOpenChange={setAddCustomerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              {isRTL ? 'إضافة عميل جديد' : 'Add New Customer'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{isRTL ? 'الاسم *' : 'Name *'}</label>
              <Input
                value={newCustomer.name}
                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                placeholder={isRTL ? 'اسم العميل' : 'Customer name'}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{isRTL ? 'الهاتف' : 'Phone'}</label>
              <Input
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                placeholder="05xxxxxxxx"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{isRTL ? 'البريد الإلكتروني' : 'Email'}</label>
              <Input
                type="email"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
            <Button className="w-full" onClick={handleAddCustomer}>
              {isRTL ? 'إضافة العميل' : 'Add Customer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Record Visit Dialog */}
      <Dialog open={visitDialogOpen} onOpenChange={setVisitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {isRTL ? 'تسجيل زيارة' : 'Record Visit'}
            </DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="font-semibold">{selectedCustomer.customer_name}</p>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'الزيارات السابقة: ' : 'Previous visits: '}
                  {selectedCustomer.total_visits}
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {isRTL ? 'المبلغ المصروف (اختياري)' : 'Amount spent (optional)'}
                </label>
                <Input
                  type="number"
                  value={visitAmount}
                  onChange={(e) => setVisitAmount(e.target.value)}
                  placeholder="0.00 SAR"
                />
              </div>
              <Button className="w-full" onClick={handleRecordVisit}>
                {isRTL ? 'تسجيل الزيارة' : 'Record Visit'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CustomerChurnTracker;
