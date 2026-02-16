import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format, addHours, differenceInHours } from "date-fns";
import { ar } from "date-fns/locale";
import { 
  Loader2, CheckCircle2, Clock, AlertCircle, Upload, CreditCard, 
  Building2, Signature, Download, FileText, ArrowLeft, ArrowRight,
  XCircle, RefreshCcw, Timer, Ban
} from "lucide-react";
import SignaturePad from "@/components/SignaturePad";
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
  commission_payment_method: string | null;
  commission_paid: boolean;
  commission_paid_at: string | null;
  commission_transfer_receipt: string | null;
  commission_confirmed_at: string | null;
  seller_payment_confirmed: boolean;
  seller_transfer_receipt: string | null;
  seller_signature: string | null;
  seller_signed_at: string | null;
  buyer_signature: string | null;
  buyer_signed_at: string | null;
  platform_signature: string | null;
  platform_signed_at: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  seller_response_deadline: string | null;
  seller_rejection_reason: string | null;
  commission_refund_status: string | null;
}

interface ContractExtended extends Contract {
  [key: string]: any;
}

const statusSteps = [
  { key: 'pending_seller', labelAr: 'موافقة البائع', labelEn: 'Seller Approval' },
  { key: 'pending_buyer_payment', labelAr: 'دفع العمولة', labelEn: 'Pay Commission' },
  { key: 'awaiting_seller_sign', labelAr: 'توقيع البائع', labelEn: 'Seller Sign' },
  { key: 'awaiting_buyer_sign', labelAr: 'توقيع المشتري', labelEn: 'Buyer Sign' },
  { key: 'awaiting_platform_sign', labelAr: 'توقيع المنصة', labelEn: 'Platform Sign' },
  { key: 'awaiting_seller_payment', labelAr: 'دفع البائع', labelEn: 'Pay Seller' },
  { key: 'completed', labelAr: 'مكتمل', labelEn: 'Completed' },
];

export default function ContractDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isArabic = language === "ar";

  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [showSignature, setShowSignature] = useState(false);
  const [buyerName, setBuyerName] = useState("");
  const [sellerName, setSellerName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [refundBankDetails, setRefundBankDetails] = useState({ bank: "", iban: "", name: "" });

  useEffect(() => {
    if (id && user) {
      fetchContract();
      checkAdmin();
      
      // Realtime
      const channel = supabase
        .channel(`contract_${id}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'direct_supply_contracts',
          filter: `id=eq.${id}`
        }, () => {
          fetchContract();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [id, user]);

  const fetchContract = async () => {
    try {
      const { data, error } = await supabase
        .from('direct_supply_contracts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setContract(data);

      // Fetch names
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', [data.buyer_id, data.seller_id]);

      if (profiles) {
        setBuyerName(profiles.find(p => p.user_id === data.buyer_id)?.full_name || '');
        setSellerName(profiles.find(p => p.user_id === data.seller_id)?.full_name || '');
      }
    } catch (error: any) {
      toast.error(isArabic ? "خطأ في تحميل العقد" : "Error loading contract");
    } finally {
      setLoading(false);
    }
  };

  const checkAdmin = async () => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user?.id)
      .eq('role', 'admin')
      .single();
    
    setIsAdmin(!!data);
  };

  const getMyRole = () => {
    if (!contract) return null;
    if (contract.buyer_id === user?.id) return 'buyer';
    if (contract.seller_id === user?.id) return 'seller';
    if (isAdmin) return 'admin';
    return null;
  };

  const getCurrentStepIndex = () => {
    if (!contract) return 0;
    const index = statusSteps.findIndex(s => s.key === contract.status);
    return index >= 0 ? index : 0;
  };

  const handlePayCommission = async () => {
    if (!paymentMethod) {
      toast.error(isArabic ? "اختر طريقة الدفع" : "Select payment method");
      return;
    }

    if (paymentMethod === 'bank_transfer' && !receiptFile) {
      toast.error(isArabic ? "ارفع إيصال التحويل" : "Upload transfer receipt");
      return;
    }

    setSubmitting(true);
    try {
      let receiptUrl = null;

      if (receiptFile) {
        const fileName = `${contract?.id}/commission_${Date.now()}.${receiptFile.name.split('.').pop()}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('resale-images')
          .upload(fileName, receiptFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('resale-images')
          .getPublicUrl(fileName);
        
        receiptUrl = urlData.publicUrl;
      }

      const { error } = await supabase
        .from('direct_supply_contracts')
        .update({
          commission_payment_method: paymentMethod,
          commission_paid: true,
          commission_paid_at: new Date().toISOString(),
          commission_transfer_receipt: receiptUrl,
          status: paymentMethod === 'online_payment' ? 'awaiting_seller_sign' : 'pending_commission_confirm'
        })
        .eq('id', contract?.id);

      if (error) throw error;

      toast.success(isArabic ? "تم دفع العمولة بنجاح" : "Commission paid successfully");
      fetchContract();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmCommission = async () => {
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('direct_supply_contracts')
        .update({
          commission_confirmed_at: new Date().toISOString(),
          status: 'awaiting_seller_sign'
        })
        .eq('id', contract?.id);

      if (error) throw error;
      toast.success(isArabic ? "تم تأكيد استلام العمولة" : "Commission receipt confirmed");
      fetchContract();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSign = async (signatureData: string) => {
    const role = getMyRole();
    if (!role || !contract) return;

    setSubmitting(true);
    try {
      let updateData: any = {};
      let newStatus = contract.status;

      if (role === 'seller' && contract.status === 'awaiting_seller_sign') {
        updateData = {
          seller_signature: signatureData,
          seller_signed_at: new Date().toISOString()
        };
        newStatus = 'awaiting_buyer_sign';
      } else if (role === 'buyer' && contract.status === 'awaiting_buyer_sign') {
        updateData = {
          buyer_signature: signatureData,
          buyer_signed_at: new Date().toISOString()
        };
        newStatus = 'awaiting_platform_sign';
      } else if (role === 'admin' && contract.status === 'awaiting_platform_sign') {
        updateData = {
          platform_signature: signatureData,
          platform_signed_at: new Date().toISOString(),
          platform_signed_by: user?.id
        };
        newStatus = 'awaiting_seller_payment';
      }

      const { error } = await supabase
        .from('direct_supply_contracts')
        .update({ ...updateData, status: newStatus })
        .eq('id', contract.id);

      if (error) throw error;

      // إرسال إشعارات البريد الإلكتروني عند توقيع المنصة
      if (role === 'admin' && newStatus === 'awaiting_seller_payment') {
        try {
          // جلب البريد الإلكتروني للمشتري والبائع
          const { data: authData } = await supabase.auth.admin?.listUsers?.() || { data: null };
          
          // جلب بيانات المستخدمين من profiles
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, full_name')
            .in('user_id', [contract.buyer_id, contract.seller_id]);
          
          // استخدام edge function لإرسال الإشعارات
          const sellerAmount = contract.total_amount - contract.platform_commission_amount;
          
          await supabase.functions.invoke('notify-contract-signed', {
            body: {
              contract_id: contract.id,
              buyer_email: user?.email, // مؤقتاً
              seller_email: user?.email, // مؤقتاً
              buyer_name: buyerName || (isArabic ? 'المشتري' : 'Buyer'),
              seller_name: sellerName || (isArabic ? 'البائع' : 'Seller'),
              contract_number: contract.contract_number,
              total_amount: sellerAmount,
              currency: contract.currency,
              language: isArabic ? 'ar' : 'en'
            }
          });
        } catch (emailError) {
          console.error('Error sending notification emails:', emailError);
          // لا نوقف العملية إذا فشل إرسال البريد
        }
        
        // حفظ نسخ العقود في سجلات الأطراف
        await supabase.from('contract_copies').insert([
          { contract_id: contract.id, user_id: contract.buyer_id, user_role: 'buyer' },
          { contract_id: contract.id, user_id: contract.seller_id, user_role: 'seller' },
        ]);
      }

      toast.success(isArabic ? "تم التوقيع بنجاح" : "Signed successfully");
      setShowSignature(false);
      fetchContract();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmSellerPayment = async () => {
    if (!receiptFile) {
      toast.error(isArabic ? "ارفع إيصال التحويل" : "Upload transfer receipt");
      return;
    }

    setSubmitting(true);
    try {
      const fileName = `${contract?.id}/seller_payment_${Date.now()}.${receiptFile.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage
        .from('resale-images')
        .upload(fileName, receiptFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('resale-images')
        .getPublicUrl(fileName);

      const { error } = await supabase
        .from('direct_supply_contracts')
        .update({
          seller_payment_confirmed: true,
          seller_transfer_receipt: urlData.publicUrl,
          status: 'completed'
        })
        .eq('id', contract?.id);

      if (error) throw error;

      // Create contract copies for all parties
      await supabase.from('contract_copies').insert([
        { contract_id: contract?.id, user_id: contract?.buyer_id, user_role: 'buyer' },
        { contract_id: contract?.id, user_id: contract?.seller_id, user_role: 'seller' },
      ]);

      toast.success(isArabic ? "تم إكمال العقد بنجاح!" : "Contract completed successfully!");
      fetchContract();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const canSign = () => {
    const role = getMyRole();
    if (!contract || !role) return false;
    
    if (role === 'seller' && contract.status === 'awaiting_seller_sign') return true;
    if (role === 'buyer' && contract.status === 'awaiting_buyer_sign') return true;
    if (role === 'admin' && contract.status === 'awaiting_platform_sign') return true;
    
    return false;
  };

  // البائع يوافق على الطلب
  const handleSellerApprove = async () => {
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('direct_supply_contracts')
        .update({
          status: 'pending_buyer_payment'
        })
        .eq('id', contract?.id);

      if (error) throw error;

      toast.success(isArabic ? "تم الموافقة على الطلب" : "Order approved");
      fetchContract();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // البائع يرفض الطلب
  const handleSellerReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error(isArabic ? "يرجى كتابة سبب الرفض" : "Please provide rejection reason");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('direct_supply_contracts')
        .update({
          status: 'seller_rejected',
          seller_rejection_reason: rejectionReason,
          cancelled_by: user?.id
        })
        .eq('id', contract?.id);

      if (error) throw error;

      toast.success(isArabic ? "تم رفض الطلب" : "Order rejected");
      setShowRejectDialog(false);
      fetchContract();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // المشتري يطلب استرداد العمولة
  const handleRequestRefund = async () => {
    if (!refundBankDetails.iban || !refundBankDetails.name) {
      toast.error(isArabic ? "يرجى إدخال بيانات الحساب البنكي" : "Please enter bank details");
      return;
    }

    setSubmitting(true);
    try {
      // Create refund request
      const { error: refundError } = await supabase
        .from('commission_refunds')
        .insert([{
          contract_id: contract?.id,
          user_id: user?.id,
          original_amount: contract?.platform_commission_amount,
          refund_amount: contract?.platform_commission_amount,
          refund_reason: contract?.status === 'seller_rejected' 
            ? (isArabic ? 'البائع رفض الطلب' : 'Seller rejected order')
            : (isArabic ? 'انتهت مهلة رد البائع' : 'Seller response deadline expired'),
          bank_details: refundBankDetails,
          status: 'pending'
        }]);

      if (refundError) throw refundError;

      // Update contract status
      const { error } = await supabase
        .from('direct_supply_contracts')
        .update({
          commission_refund_status: 'requested',
          commission_refund_requested_at: new Date().toISOString(),
          status: 'refund_pending'
        })
        .eq('id', contract?.id);

      if (error) throw error;

      toast.success(isArabic ? "تم إرسال طلب الاسترداد" : "Refund request submitted");
      setShowRefundDialog(false);
      fetchContract();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // حساب الوقت المتبقي للرد
  const getTimeRemaining = () => {
    if (!contract?.seller_response_deadline) return null;
    const deadline = new Date(contract.seller_response_deadline);
    const now = new Date();
    const hoursLeft = differenceInHours(deadline, now);
    if (hoursLeft <= 0) return { expired: true, hours: 0 };
    return { expired: false, hours: hoursLeft };
  };

  // هل يمكن للمشتري طلب الاسترداد؟ (فقط في حالة رفض البائع قبل الدفع)
  const canRequestRefund = () => {
    if (!contract || getMyRole() !== 'buyer') return false;
    // لا يوجد استرداد لأن المشتري لم يدفع قبل موافقة البائع
    return false;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>{isArabic ? "العقد غير موجود" : "Contract not found"}</p>
      </div>
    );
  }

  const myRole = getMyRole();
  const currentStep = getCurrentStepIndex();
  const sellerAmount = contract.total_amount - contract.platform_commission_amount;

  return (
    <div className={`min-h-screen bg-background p-4 md:p-8 ${isArabic ? 'rtl' : 'ltr'}`}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <BackButton />
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{contract.contract_number}</h1>
              <Badge variant="outline">
                {myRole === 'buyer' ? (isArabic ? 'مشتري' : 'Buyer') : 
                 myRole === 'seller' ? (isArabic ? 'بائع' : 'Seller') : 
                 (isArabic ? 'مسؤول' : 'Admin')}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {format(new Date(contract.created_at), 'dd MMMM yyyy', { locale: isArabic ? ar : undefined })}
            </p>
          </div>
        </div>

        {/* Progress Steps */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between overflow-x-auto">
              {statusSteps.map((step, index) => (
                <div key={step.key} className="flex items-center">
                  <div className={`flex flex-col items-center ${index <= currentStep ? 'text-primary' : 'text-muted-foreground'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      index < currentStep ? 'bg-primary text-white' : 
                      index === currentStep ? 'bg-primary/20 text-primary border-2 border-primary' : 
                      'bg-muted'
                    }`}>
                      {index < currentStep ? <CheckCircle2 className="w-5 h-5" /> : index + 1}
                    </div>
                    <span className="text-xs mt-1 whitespace-nowrap">
                      {isArabic ? step.labelAr : step.labelEn}
                    </span>
                  </div>
                  {index < statusSteps.length - 1 && (
                    <div className={`w-8 md:w-16 h-0.5 mx-1 ${index < currentStep ? 'bg-primary' : 'bg-muted'}`} />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Contract Details */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{isArabic ? "تفاصيل الأطراف" : "Party Details"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{isArabic ? "المشتري" : "Buyer"}</span>
                <span className="font-medium">{buyerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{isArabic ? "البائع" : "Seller"}</span>
                <span className="font-medium">{sellerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{isArabic ? "نوع الصفقة" : "Deal Type"}</span>
                <span className="font-medium">
                  {contract.order_type === 'cafe_to_roaster' 
                    ? (isArabic ? "مقهى ← محمصة" : "Cafe → Roaster")
                    : (isArabic ? "محمصة ← مورد" : "Roaster → Supplier")}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{isArabic ? "ملخص المبالغ" : "Amount Summary"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{isArabic ? "إجمالي الطلب" : "Order Total"}</span>
                <span className="font-bold">{contract.total_amount.toLocaleString()} {contract.currency}</span>
              </div>
              <div className="flex justify-between text-primary">
                <span>{isArabic ? `عمولة المنصة (${contract.platform_commission_rate}%)` : `Commission (${contract.platform_commission_rate}%)`}</span>
                <span className="font-bold">{contract.platform_commission_amount.toLocaleString()} {contract.currency}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-green-600">
                <span>{isArabic ? "للبائع" : "To Seller"}</span>
                <span className="font-bold">{sellerAmount.toLocaleString()} {contract.currency}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Products */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{isArabic ? "المنتجات" : "Products"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(contract.items as any[]).map((item: any, index: number) => (
                <div key={index} className="flex justify-between items-center py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.quantity} kg × {item.unit_price} {contract.currency}
                    </p>
                  </div>
                  <span className="font-bold">{item.total.toLocaleString()} {contract.currency}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Action Cards based on status */}
        
        {/* Step 1: Seller Approval */}
        {myRole === 'seller' && contract.status === 'pending_seller' && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-primary" />
                {isArabic ? "طلب عقد جديد" : "New Contract Request"}
              </CardTitle>
              <CardDescription>
                {isArabic 
                  ? `${buyerName} يريد شراء منتجات منك`
                  : `${buyerName} wants to purchase products from you`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {isArabic 
                    ? "راجع تفاصيل الطلب أعلاه. إذا وافقت، سيقوم المشتري بدفع عمولة المنصة ثم يتم التوقيع على العقد."
                    : "Review the order details above. If you approve, buyer will pay platform commission then contract will be signed."}
                </AlertDescription>
              </Alert>
              <div className="flex gap-3">
                <Button 
                  onClick={handleSellerApprove} 
                  className="flex-1 gap-2" 
                  disabled={submitting}
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {isArabic ? "موافقة على الطلب" : "Approve Order"}
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => setShowRejectDialog(true)} 
                  className="flex-1 gap-2" 
                  disabled={submitting}
                >
                  <XCircle className="w-4 h-4" />
                  {isArabic ? "رفض الطلب" : "Reject Order"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Buyer waiting for seller approval */}
        {myRole === 'buyer' && contract.status === 'pending_seller' && (
          <Alert className="border-blue-500 bg-blue-50">
            <Clock className="h-5 w-5 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>{isArabic ? "في انتظار موافقة البائع" : "Waiting for Seller Approval"}</strong>
              <p className="mt-1">
                {isArabic 
                  ? "تم إرسال طلبك للبائع. سيتم إعلامك عند الموافقة أو الرفض."
                  : "Your request has been sent to seller. You'll be notified when approved or rejected."}
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* Step 2: Pay Commission (Buyer) - After seller approval */}
        {myRole === 'buyer' && contract.status === 'pending_buyer_payment' && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                {isArabic ? "دفع عمولة المنصة" : "Pay Platform Commission"}
              </CardTitle>
              <CardDescription>
                {isArabic 
                  ? `المطلوب دفعه: ${contract.platform_commission_amount.toLocaleString()} ${contract.currency}`
                  : `Amount due: ${contract.platform_commission_amount.toLocaleString()} ${contract.currency}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                <div className="flex items-center space-x-2 rtl:space-x-reverse p-3 border rounded-lg">
                  <RadioGroupItem value="bank_transfer" id="bank" />
                  <Label htmlFor="bank" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Building2 className="w-5 h-5" />
                    {isArabic ? "تحويل بنكي" : "Bank Transfer"}
                  </Label>
                </div>
                <div className="flex items-center space-x-2 rtl:space-x-reverse p-3 border rounded-lg">
                  <RadioGroupItem value="online_payment" id="online" />
                  <Label htmlFor="online" className="flex items-center gap-2 cursor-pointer flex-1">
                    <CreditCard className="w-5 h-5" />
                    {isArabic ? "دفع إلكتروني (مدى/أبل باي)" : "Online Payment (Mada/Apple Pay)"}
                  </Label>
                </div>
              </RadioGroup>

              {paymentMethod === 'bank_transfer' && (
                <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                  <Alert>
                    <Building2 className="h-4 w-4" />
                    <AlertDescription>
                      {isArabic ? (
                        <>
                          <strong>معلومات الحساب البنكي:</strong><br />
                          البنك: البنك الأهلي السعودي<br />
                          رقم الحساب: SAXXXXXXXXXXXXXXXXXX<br />
                          اسم المستفيد: FiveHub Platform
                        </>
                      ) : (
                        <>
                          <strong>Bank Account Details:</strong><br />
                          Bank: Saudi National Bank<br />
                          Account: SAXXXXXXXXXXXXXXXXXX<br />
                          Beneficiary: FiveHub Platform
                        </>
                      )}
                    </AlertDescription>
                  </Alert>
                  <div>
                    <Label>{isArabic ? "إيصال التحويل" : "Transfer Receipt"}</Label>
                    <Input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                      className="mt-1"
                    />
                  </div>
                </div>
              )}

              <Button 
                onClick={handlePayCommission} 
                className="w-full gap-2" 
                disabled={submitting || !paymentMethod}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {isArabic ? "تأكيد الدفع" : "Confirm Payment"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Admin confirm commission (for bank transfers) */}
        {isAdmin && contract.status === 'pending_commission_confirm' && !contract.commission_confirmed_at && (
          <Card className="border-orange-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-600">
                <AlertCircle className="w-5 h-5" />
                {isArabic ? "تأكيد استلام العمولة" : "Confirm Commission Receipt"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {contract.commission_transfer_receipt && (
                <div>
                  <Label>{isArabic ? "إيصال التحويل:" : "Transfer Receipt:"}</Label>
                  <a href={contract.commission_transfer_receipt} target="_blank" className="text-primary underline block mt-1">
                    {isArabic ? "عرض الإيصال" : "View Receipt"}
                  </a>
                </div>
              )}
              <Button onClick={handleConfirmCommission} className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {isArabic ? "تأكيد الاستلام" : "Confirm Receipt"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Signature Section */}
        {canSign() && !showSignature && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Signature className="w-5 h-5 text-primary" />
                {isArabic ? "توقيعك مطلوب" : "Your Signature Required"}
              </CardTitle>
              <CardDescription>
                {isArabic 
                  ? "يرجى التوقيع للمتابعة في إجراءات العقد"
                  : "Please sign to proceed with the contract"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setShowSignature(true)} className="w-full gap-2">
                <Signature className="w-4 h-4" />
                {isArabic ? "التوقيع الآن" : "Sign Now"}
              </Button>
            </CardContent>
          </Card>
        )}

        {showSignature && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle>{isArabic ? "وقّع هنا" : "Sign Here"}</CardTitle>
            </CardHeader>
            <CardContent>
              <SignaturePad
                onSave={(signature) => handleSign(signature)}
                onCancel={() => setShowSignature(false)}
              />
              <Button variant="outline" onClick={() => setShowSignature(false)} className="w-full mt-4">
                {isArabic ? "إلغاء" : "Cancel"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Pay Seller (Buyer) */}
        {myRole === 'buyer' && contract.status === 'awaiting_seller_payment' && (
          <Card className="border-green-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CreditCard className="w-5 h-5" />
                {isArabic ? "دفع المبلغ للبائع" : "Pay Amount to Seller"}
              </CardTitle>
              <CardDescription>
                {isArabic 
                  ? `المطلوب تحويله للبائع: ${sellerAmount.toLocaleString()} ${contract.currency}`
                  : `Amount to transfer to seller: ${sellerAmount.toLocaleString()} ${contract.currency}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Building2 className="h-4 w-4" />
                <AlertDescription>
                  {isArabic 
                    ? "حوّل المبلغ مباشرة لحساب البائع وارفع إيصال التحويل"
                    : "Transfer the amount directly to seller's account and upload the receipt"}
                </AlertDescription>
              </Alert>
              <div>
                <Label>{isArabic ? "إيصال التحويل" : "Transfer Receipt"}</Label>
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                  className="mt-1"
                />
              </div>
              <Button onClick={handleConfirmSellerPayment} className="w-full gap-2" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {isArabic ? "تأكيد التحويل وإكمال العقد" : "Confirm Transfer & Complete Contract"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Signatures Display */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{isArabic ? "التوقيعات" : "Signatures"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">{isArabic ? "البائع" : "Seller"}</p>
                {contract.seller_signature ? (
                  <>
                    <img src={contract.seller_signature} alt="Seller signature" className="h-16 mx-auto" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {contract.seller_signed_at && format(new Date(contract.seller_signed_at), 'dd/MM/yyyy HH:mm')}
                    </p>
                  </>
                ) : (
                  <div className="h-16 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="text-center p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">{isArabic ? "المشتري" : "Buyer"}</p>
                {contract.buyer_signature ? (
                  <>
                    <img src={contract.buyer_signature} alt="Buyer signature" className="h-16 mx-auto" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {contract.buyer_signed_at && format(new Date(contract.buyer_signed_at), 'dd/MM/yyyy HH:mm')}
                    </p>
                  </>
                ) : (
                  <div className="h-16 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="text-center p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">{isArabic ? "المنصة" : "Platform"}</p>
                {contract.platform_signature ? (
                  <>
                    <img src={contract.platform_signature} alt="Platform signature" className="h-16 mx-auto" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {contract.platform_signed_at && format(new Date(contract.platform_signed_at), 'dd/MM/yyyy HH:mm')}
                    </p>
                  </>
                ) : (
                  <div className="h-16 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Completed Status */}
        {contract.status === 'completed' && (
          <Alert className="border-green-500 bg-green-50">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>{isArabic ? "تم إكمال العقد بنجاح!" : "Contract Completed Successfully!"}</strong>
              <p className="mt-1">
                {isArabic 
                  ? "تم حفظ نسخة من العقد في حسابك"
                  : "A copy of the contract has been saved to your account"}
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* Seller Rejected Status - No refund needed as buyer hasn't paid yet */}
        {contract.status === 'seller_rejected' && (
          <Alert className="border-red-500 bg-red-50">
            <XCircle className="h-5 w-5 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>{isArabic ? "تم رفض الطلب من البائع" : "Order Rejected by Seller"}</strong>
              {contract.seller_rejection_reason && (
                <p className="mt-1">
                  <strong>{isArabic ? "السبب:" : "Reason:"}</strong> {contract.seller_rejection_reason}
                </p>
              )}
              <p className="mt-2 text-sm">
                {isArabic 
                  ? "يمكنك إنشاء طلب جديد لبائع آخر"
                  : "You can create a new order with another seller"}
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* Refund Pending Status */}
        {contract.status === 'refund_pending' && (
          <Alert className="border-blue-500 bg-blue-50">
            <RefreshCcw className="h-5 w-5 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>{isArabic ? "طلب الاسترداد قيد المراجعة" : "Refund Request Under Review"}</strong>
              <p className="mt-1">
                {isArabic 
                  ? "سيتم مراجعة طلبك وإعادة العمولة خلال 3-5 أيام عمل"
                  : "Your request will be reviewed and refunded within 3-5 business days"}
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* Refunded Status */}
        {contract.status === 'refunded' && (
          <Alert className="border-green-500 bg-green-50">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>{isArabic ? "تم استرداد العمولة" : "Commission Refunded"}</strong>
              <p className="mt-1">
                {isArabic 
                  ? `تم إعادة مبلغ ${contract.platform_commission_amount?.toLocaleString()} ${contract.currency} إلى حسابك`
                  : `${contract.platform_commission_amount?.toLocaleString()} ${contract.currency} has been refunded to your account`}
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* Seller Reject Button */}
        {myRole === 'seller' && contract.status === 'awaiting_seller_sign' && (
          <Card className="border-red-200">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Ban className="w-4 h-4" />
                  <span>{isArabic ? "لا تستطيع تنفيذ الطلب؟" : "Can't fulfill this order?"}</span>
                </div>
                <Button 
                  variant="outline" 
                  className="border-red-300 text-red-600 hover:bg-red-50"
                  onClick={() => setShowRejectDialog(true)}
                >
                  {isArabic ? "رفض الطلب" : "Reject Order"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Time Remaining for Seller */}
        {contract.status === 'awaiting_seller_sign' && contract.seller_response_deadline && (
          <Alert className={getTimeRemaining()?.hours && getTimeRemaining()!.hours <= 12 ? "border-orange-500 bg-orange-50" : ""}>
            <Timer className="h-4 w-4" />
            <AlertDescription>
              {(() => {
                const time = getTimeRemaining();
                if (!time) return null;
                if (time.expired) {
                  return isArabic ? "انتهت المهلة" : "Deadline expired";
                }
                return isArabic 
                  ? `متبقي ${time.hours} ساعة للرد على الطلب`
                  : `${time.hours} hours remaining to respond`;
              })()}
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isArabic ? "رفض الطلب" : "Reject Order"}</DialogTitle>
            <DialogDescription>
              {isArabic 
                ? "يرجى توضيح سبب رفض الطلب"
                : "Please explain why you're rejecting this order"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{isArabic ? "سبب الرفض" : "Rejection Reason"}</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={isArabic ? "مثال: الكمية المطلوبة غير متوفرة حالياً" : "e.g. Requested quantity not currently available"}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              {isArabic ? "إلغاء" : "Cancel"}
            </Button>
            <Button variant="destructive" onClick={handleSellerReject} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin me-2" />}
              {isArabic ? "تأكيد الرفض" : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund Request Dialog */}
      <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isArabic ? "طلب استرداد العمولة" : "Request Commission Refund"}</DialogTitle>
            <DialogDescription>
              {isArabic 
                ? `سيتم استرداد مبلغ ${contract?.platform_commission_amount?.toLocaleString()} ${contract?.currency} إلى حسابك البنكي`
                : `${contract?.platform_commission_amount?.toLocaleString()} ${contract?.currency} will be refunded to your bank account`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{isArabic ? "اسم البنك" : "Bank Name"}</Label>
              <Input
                value={refundBankDetails.bank}
                onChange={(e) => setRefundBankDetails({ ...refundBankDetails, bank: e.target.value })}
                placeholder={isArabic ? "مثال: البنك الأهلي" : "e.g. Al Ahli Bank"}
              />
            </div>
            <div>
              <Label>{isArabic ? "رقم الآيبان (IBAN)" : "IBAN Number"}</Label>
              <Input
                value={refundBankDetails.iban}
                onChange={(e) => setRefundBankDetails({ ...refundBankDetails, iban: e.target.value })}
                placeholder="SA..."
                dir="ltr"
              />
            </div>
            <div>
              <Label>{isArabic ? "اسم صاحب الحساب" : "Account Holder Name"}</Label>
              <Input
                value={refundBankDetails.name}
                onChange={(e) => setRefundBankDetails({ ...refundBankDetails, name: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRefundDialog(false)}>
              {isArabic ? "إلغاء" : "Cancel"}
            </Button>
            <Button onClick={handleRequestRefund} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin me-2" />}
              {isArabic ? "إرسال طلب الاسترداد" : "Submit Refund Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
