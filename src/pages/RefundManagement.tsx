import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { 
  Loader2, CheckCircle2, Clock, XCircle, RefreshCcw, 
  Eye, Building2, CreditCard
} from "lucide-react";
import BackButton from "@/components/BackButton";

interface RefundRequest {
  id: string;
  contract_id: string;
  user_id: string;
  original_amount: number;
  refund_amount: number;
  refund_reason: string;
  refund_method: string | null;
  bank_details: any;
  status: string;
  admin_notes: string | null;
  processed_at: string | null;
  created_at: string;
  direct_supply_contracts?: {
    contract_number: string;
    buyer_id: string;
    total_amount: number;
    currency: string;
  };
  profiles?: {
    full_name: string;
  };
}

const statusConfig: Record<string, { label: string; labelAr: string; color: string }> = {
  pending: { label: "Pending", labelAr: "قيد الانتظار", color: "bg-yellow-500" },
  approved: { label: "Approved", labelAr: "موافق عليه", color: "bg-blue-500" },
  processing: { label: "Processing", labelAr: "قيد التحويل", color: "bg-purple-500" },
  completed: { label: "Completed", labelAr: "مكتمل", color: "bg-green-500" },
  denied: { label: "Denied", labelAr: "مرفوض", color: "bg-red-500" },
};

export default function RefundManagement() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isArabic = language === "ar";

  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(null);
  const [showProcessDialog, setShowProcessDialog] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [transferReceipt, setTransferReceipt] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchRefunds();
  }, []);

  const fetchRefunds = async () => {
    try {
      const { data, error } = await supabase
        .from('commission_refunds')
        .select(`
          *,
          direct_supply_contracts (
            contract_number,
            buyer_id,
            total_amount,
            currency
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user profiles
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(r => r.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);

        const refundsWithProfiles = data.map(r => ({
          ...r,
          profiles: profiles?.find(p => p.user_id === r.user_id)
        }));

        setRefunds(refundsWithProfiles);
      } else {
        setRefunds([]);
      }
    } catch (error: any) {
      toast.error(isArabic ? "خطأ في تحميل البيانات" : "Error loading data");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (refund: RefundRequest) => {
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('commission_refunds')
        .update({
          status: 'approved',
          processed_by: user?.id,
          admin_notes: 'Approved for refund'
        })
        .eq('id', refund.id);

      if (error) throw error;

      toast.success(isArabic ? "تمت الموافقة على الاسترداد" : "Refund approved");
      fetchRefunds();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeny = async (refund: RefundRequest) => {
    setSubmitting(true);
    try {
      const { error: refundError } = await supabase
        .from('commission_refunds')
        .update({
          status: 'denied',
          processed_by: user?.id,
          processed_at: new Date().toISOString(),
          admin_notes: adminNotes || 'Refund request denied'
        })
        .eq('id', refund.id);

      if (refundError) throw refundError;

      // Update contract status
      await supabase
        .from('direct_supply_contracts')
        .update({
          commission_refund_status: 'denied',
          status: 'cancelled'
        })
        .eq('id', refund.contract_id);

      toast.success(isArabic ? "تم رفض طلب الاسترداد" : "Refund request denied");
      setShowProcessDialog(false);
      fetchRefunds();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteRefund = async () => {
    if (!selectedRefund) return;

    setSubmitting(true);
    try {
      let receiptUrl = null;

      if (transferReceipt) {
        const fileName = `refunds/${selectedRefund.id}_${Date.now()}.${transferReceipt.name.split('.').pop()}`;
        const { error: uploadError } = await supabase.storage
          .from('resale-images')
          .upload(fileName, transferReceipt);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('resale-images')
          .getPublicUrl(fileName);
        
        receiptUrl = urlData.publicUrl;
      }

      const { error: refundError } = await supabase
        .from('commission_refunds')
        .update({
          status: 'completed',
          processed_by: user?.id,
          processed_at: new Date().toISOString(),
          refund_method: 'bank_transfer',
          admin_notes: adminNotes
        })
        .eq('id', selectedRefund.id);

      if (refundError) throw refundError;

      // Update contract status
      await supabase
        .from('direct_supply_contracts')
        .update({
          commission_refund_status: 'refunded',
          commission_refund_processed_at: new Date().toISOString(),
          commission_refund_receipt: receiptUrl,
          status: 'refunded'
        })
        .eq('id', selectedRefund.contract_id);

      toast.success(isArabic ? "تم إكمال الاسترداد بنجاح" : "Refund completed successfully");
      setShowProcessDialog(false);
      setSelectedRefund(null);
      fetchRefunds();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filterRefunds = (status: string) => {
    if (status === "all") return refunds;
    return refunds.filter(r => r.status === status);
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
        <div className="flex items-center gap-4">
          <BackButton />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              {isArabic ? "إدارة طلبات الاسترداد" : "Refund Requests Management"}
            </h1>
            <p className="text-muted-foreground">
              {isArabic ? "مراجعة وتنفيذ طلبات استرداد العمولات" : "Review and process commission refund requests"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Clock className="w-8 h-8 mx-auto text-yellow-500 mb-2" />
                <p className="text-2xl font-bold">{filterRefunds("pending").length}</p>
                <p className="text-sm text-muted-foreground">{isArabic ? "قيد الانتظار" : "Pending"}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <CheckCircle2 className="w-8 h-8 mx-auto text-blue-500 mb-2" />
                <p className="text-2xl font-bold">{filterRefunds("approved").length}</p>
                <p className="text-sm text-muted-foreground">{isArabic ? "موافق عليها" : "Approved"}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <RefreshCcw className="w-8 h-8 mx-auto text-green-500 mb-2" />
                <p className="text-2xl font-bold">{filterRefunds("completed").length}</p>
                <p className="text-sm text-muted-foreground">{isArabic ? "مكتملة" : "Completed"}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <XCircle className="w-8 h-8 mx-auto text-red-500 mb-2" />
                <p className="text-2xl font-bold">{filterRefunds("denied").length}</p>
                <p className="text-sm text-muted-foreground">{isArabic ? "مرفوضة" : "Denied"}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pending">{isArabic ? "قيد الانتظار" : "Pending"}</TabsTrigger>
            <TabsTrigger value="approved">{isArabic ? "موافق عليها" : "Approved"}</TabsTrigger>
            <TabsTrigger value="completed">{isArabic ? "مكتملة" : "Completed"}</TabsTrigger>
            <TabsTrigger value="denied">{isArabic ? "مرفوضة" : "Denied"}</TabsTrigger>
            <TabsTrigger value="all">{isArabic ? "الكل" : "All"}</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4 mt-4">
            {filterRefunds(activeTab).length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <RefreshCcw className="w-16 h-16 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">{isArabic ? "لا توجد طلبات" : "No requests found"}</p>
                </CardContent>
              </Card>
            ) : (
              filterRefunds(activeTab).map((refund) => (
                <Card key={refund.id}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold">
                            {refund.direct_supply_contracts?.contract_number}
                          </span>
                          <Badge className={statusConfig[refund.status]?.color}>
                            {isArabic ? statusConfig[refund.status]?.labelAr : statusConfig[refund.status]?.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {isArabic ? "مقدم الطلب:" : "Requester:"} {refund.profiles?.full_name}
                        </p>
                        <p className="text-sm">
                          <span className="text-muted-foreground">{isArabic ? "السبب:" : "Reason:"}</span> {refund.refund_reason}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(refund.created_at), 'dd MMM yyyy HH:mm', { locale: isArabic ? ar : undefined })}
                        </p>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2">
                        <p className="text-2xl font-bold text-primary">
                          {refund.refund_amount.toLocaleString()} {refund.direct_supply_contracts?.currency}
                        </p>
                        
                        {refund.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              onClick={() => handleApprove(refund)}
                              disabled={submitting}
                            >
                              <CheckCircle2 className="w-4 h-4 me-1" />
                              {isArabic ? "موافقة" : "Approve"}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => {
                                setSelectedRefund(refund);
                                setShowProcessDialog(true);
                              }}
                            >
                              <XCircle className="w-4 h-4 me-1" />
                              {isArabic ? "رفض" : "Deny"}
                            </Button>
                          </div>
                        )}
                        
                        {refund.status === 'approved' && (
                          <Button 
                            size="sm"
                            onClick={() => {
                              setSelectedRefund(refund);
                              setAdminNotes("");
                              setShowProcessDialog(true);
                            }}
                          >
                            <CreditCard className="w-4 h-4 me-1" />
                            {isArabic ? "تنفيذ التحويل" : "Process Transfer"}
                          </Button>
                        )}

                        {refund.bank_details && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedRefund(refund);
                              setShowProcessDialog(true);
                            }}
                          >
                            <Eye className="w-4 h-4 me-1" />
                            {isArabic ? "عرض التفاصيل" : "View Details"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Process Dialog */}
      <Dialog open={showProcessDialog} onOpenChange={setShowProcessDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedRefund?.status === 'pending' 
                ? (isArabic ? "رفض طلب الاسترداد" : "Deny Refund Request")
                : (isArabic ? "تنفيذ الاسترداد" : "Process Refund")}
            </DialogTitle>
          </DialogHeader>
          
          {selectedRefund && (
            <div className="space-y-4">
              {/* Bank Details */}
              {selectedRefund.bank_details && (
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-4 h-4" />
                    <span className="font-medium">{isArabic ? "بيانات الحساب البنكي" : "Bank Account Details"}</span>
                  </div>
                  <p><strong>{isArabic ? "البنك:" : "Bank:"}</strong> {selectedRefund.bank_details.bank}</p>
                  <p><strong>IBAN:</strong> {selectedRefund.bank_details.iban}</p>
                  <p><strong>{isArabic ? "الاسم:" : "Name:"}</strong> {selectedRefund.bank_details.name}</p>
                </div>
              )}

              <div className="p-4 bg-primary/10 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">{isArabic ? "مبلغ الاسترداد" : "Refund Amount"}</p>
                <p className="text-3xl font-bold text-primary">
                  {selectedRefund.refund_amount.toLocaleString()} {selectedRefund.direct_supply_contracts?.currency}
                </p>
              </div>

              {selectedRefund.status === 'approved' && (
                <div>
                  <Label>{isArabic ? "إيصال التحويل (اختياري)" : "Transfer Receipt (Optional)"}</Label>
                  <Input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setTransferReceipt(e.target.files?.[0] || null)}
                    className="mt-1"
                  />
                </div>
              )}

              <div>
                <Label>{isArabic ? "ملاحظات" : "Notes"}</Label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder={isArabic ? "ملاحظات إضافية..." : "Additional notes..."}
                  rows={2}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProcessDialog(false)}>
              {isArabic ? "إغلاق" : "Close"}
            </Button>
            {selectedRefund?.status === 'pending' && (
              <Button variant="destructive" onClick={() => handleDeny(selectedRefund)} disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 animate-spin me-2" />}
                {isArabic ? "تأكيد الرفض" : "Confirm Deny"}
              </Button>
            )}
            {selectedRefund?.status === 'approved' && (
              <Button onClick={handleCompleteRefund} disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 animate-spin me-2" />}
                {isArabic ? "تأكيد التحويل" : "Confirm Transfer"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
