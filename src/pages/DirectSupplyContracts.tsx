import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { 
  ArrowLeft, ArrowRight, Plus, FileText, Clock, CheckCircle2, 
  XCircle, AlertCircle, Loader2, Eye, Signature 
} from "lucide-react";
import BackButton from "@/components/BackButton";

interface Contract {
  id: string;
  contract_number: string | null;
  buyer_id: string;
  seller_id: string;
  buyer_role: string;
  seller_role: string;
  order_type: string;
  items: any;
  total_amount: number;
  currency: string;
  platform_commission_rate: number;
  platform_commission_amount: number;
  commission_paid: boolean;
  seller_signature: string | null;
  buyer_signature: string | null;
  platform_signature: string | null;
  status: string;
  created_at: string;
}

const statusConfig: Record<string, { label: string; labelAr: string; color: string; icon: any }> = {
  pending_commission: { label: "Pending Commission", labelAr: "بانتظار دفع العمولة", color: "bg-yellow-500", icon: Clock },
  commission_paid: { label: "Commission Paid", labelAr: "تم دفع العمولة", color: "bg-blue-500", icon: CheckCircle2 },
  awaiting_seller_sign: { label: "Awaiting Seller Sign", labelAr: "بانتظار توقيع البائع", color: "bg-orange-500", icon: Signature },
  awaiting_buyer_sign: { label: "Awaiting Buyer Sign", labelAr: "بانتظار توقيع المشتري", color: "bg-orange-500", icon: Signature },
  awaiting_platform_sign: { label: "Awaiting Platform Sign", labelAr: "بانتظار توقيع المنصة", color: "bg-purple-500", icon: Signature },
  fully_signed: { label: "Fully Signed", labelAr: "تم التوقيع", color: "bg-green-500", icon: CheckCircle2 },
  awaiting_seller_payment: { label: "Awaiting Payment", labelAr: "بانتظار الدفع للبائع", color: "bg-indigo-500", icon: Clock },
  completed: { label: "Completed", labelAr: "مكتمل", color: "bg-green-600", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", labelAr: "ملغي", color: "bg-red-500", icon: XCircle },
  disputed: { label: "Disputed", labelAr: "نزاع", color: "bg-red-600", icon: AlertCircle },
};

export default function DirectSupplyContracts() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isArabic = language === "ar";
  
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    if (user) {
      fetchContracts();
      
      // Realtime subscription
      const channel = supabase
        .channel('direct_contracts_changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'direct_supply_contracts',
        }, () => {
          fetchContracts();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchContracts = async () => {
    try {
      const { data, error } = await supabase
        .from('direct_supply_contracts')
        .select('*')
        .or(`buyer_id.eq.${user?.id},seller_id.eq.${user?.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContracts(data || []);
    } catch (error: any) {
      toast.error(isArabic ? "خطأ في تحميل العقود" : "Error loading contracts");
    } finally {
      setLoading(false);
    }
  };

  const filterContracts = (tab: string) => {
    if (tab === "all") return contracts;
    if (tab === "pending") return contracts.filter(c => 
      ['pending_commission', 'commission_paid', 'awaiting_seller_sign', 'awaiting_buyer_sign', 'awaiting_platform_sign'].includes(c.status)
    );
    if (tab === "active") return contracts.filter(c => 
      ['fully_signed', 'awaiting_seller_payment'].includes(c.status)
    );
    if (tab === "completed") return contracts.filter(c => c.status === 'completed');
    return contracts;
  };

  const getMyRole = (contract: Contract) => {
    if (contract.buyer_id === user?.id) return 'buyer';
    if (contract.seller_id === user?.id) return 'seller';
    return null;
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || statusConfig.pending_commission;
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} text-white gap-1`}>
        <Icon className="w-3 h-3" />
        {isArabic ? config.labelAr : config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-background p-4 md:p-8 ${isArabic ? 'rtl' : 'ltr'}`}>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackButton />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">
                {isArabic ? "عقود التوريد المباشرة" : "Direct Supply Contracts"}
              </h1>
              <p className="text-muted-foreground">
                {isArabic ? "إدارة عقود التوريد مع التوقيع الإلكتروني" : "Manage supply contracts with electronic signatures"}
              </p>
            </div>
          </div>
          <Button onClick={() => navigate('/create-direct-contract')} className="gap-2">
            <Plus className="w-4 h-4" />
            {isArabic ? "عقد جديد" : "New Contract"}
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">
              {isArabic ? "الكل" : "All"} ({contracts.length})
            </TabsTrigger>
            <TabsTrigger value="pending">
              {isArabic ? "قيد الانتظار" : "Pending"} ({filterContracts("pending").length})
            </TabsTrigger>
            <TabsTrigger value="active">
              {isArabic ? "نشط" : "Active"} ({filterContracts("active").length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              {isArabic ? "مكتمل" : "Completed"} ({filterContracts("completed").length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4 mt-4">
            {filterContracts(activeTab).length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="w-16 h-16 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-lg">
                    {isArabic ? "لا توجد عقود" : "No contracts found"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filterContracts(activeTab).map((contract) => {
                const myRole = getMyRole(contract);
                return (
                  <Card key={contract.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-primary" />
                          <CardTitle className="text-lg">{contract.contract_number}</CardTitle>
                          <Badge variant="outline">
                            {myRole === 'buyer' 
                              ? (isArabic ? "مشتري" : "Buyer") 
                              : (isArabic ? "بائع" : "Seller")}
                          </Badge>
                        </div>
                        {getStatusBadge(contract.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {isArabic ? "إجمالي المبلغ" : "Total Amount"}
                          </p>
                          <p className="font-bold text-lg">
                            {contract.total_amount.toLocaleString()} {contract.currency}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {isArabic ? "عمولة المنصة" : "Platform Commission"}
                          </p>
                          <p className="font-semibold text-primary">
                            {contract.platform_commission_amount.toLocaleString()} {contract.currency}
                            <span className="text-xs text-muted-foreground ms-1">
                              ({contract.platform_commission_rate}%)
                            </span>
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {isArabic ? "نوع الطلب" : "Order Type"}
                          </p>
                          <p className="font-medium">
                            {contract.order_type === 'cafe_to_roaster' 
                              ? (isArabic ? "مقهى ← محمصة" : "Cafe → Roaster")
                              : (isArabic ? "محمصة ← مورد" : "Roaster → Supplier")}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {isArabic ? "تاريخ الإنشاء" : "Created At"}
                          </p>
                          <p className="font-medium">
                            {format(new Date(contract.created_at), 'dd MMM yyyy', { 
                              locale: isArabic ? ar : undefined 
                            })}
                          </p>
                        </div>
                      </div>

                      {/* Signatures Progress */}
                      <div className="flex items-center gap-2 mb-4">
                        <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                          contract.seller_signature ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          <Signature className="w-3 h-3" />
                          {isArabic ? "البائع" : "Seller"}
                          {contract.seller_signature && <CheckCircle2 className="w-3 h-3" />}
                        </div>
                        <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                          contract.buyer_signature ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          <Signature className="w-3 h-3" />
                          {isArabic ? "المشتري" : "Buyer"}
                          {contract.buyer_signature && <CheckCircle2 className="w-3 h-3" />}
                        </div>
                        <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                          contract.platform_signature ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          <Signature className="w-3 h-3" />
                          {isArabic ? "المنصة" : "Platform"}
                          {contract.platform_signature && <CheckCircle2 className="w-3 h-3" />}
                        </div>
                      </div>

                      <Button 
                        onClick={() => navigate(`/contract/${contract.id}`)}
                        className="w-full gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        {isArabic ? "عرض التفاصيل" : "View Details"}
                        {isArabic ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
