import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  CreditCard, 
  Smartphone, 
  Wallet,
  ShieldCheck,
  Loader2,
  Lock,
  AlertCircle,
  CheckCircle2
} from "lucide-react";

interface OrderPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: {
    id: string;
    total_price: number;
    quantity_kg: number;
    price_per_kg?: number;
    currency?: string;
    coffee_name?: string;
    supplier_name?: string;
  };
  onPaymentSuccess?: () => void;
}

type PaymentMethod = 'mada' | 'apple_pay' | 'credit_card';

const VAT_RATE = 0.15;

const OrderPaymentDialog = ({ 
  open, 
  onOpenChange, 
  order,
  onPaymentSuccess 
}: OrderPaymentDialogProps) => {
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mada');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const orderTotal = order.total_price || (order.quantity_kg * (order.price_per_kg || 0));
  const vatAmount = orderTotal * VAT_RATE;
  const totalWithVat = orderTotal + vatAmount;
  const currency = order.currency || 'SAR';

  const paymentMethods = [
    {
      id: 'mada' as PaymentMethod,
      name: isArabic ? 'مدى' : 'Mada',
      icon: Wallet,
      description: isArabic ? 'بطاقة مدى السعودية' : 'Saudi Mada Card',
      color: 'text-success'
    },
    {
      id: 'apple_pay' as PaymentMethod,
      name: 'Apple Pay',
      icon: Smartphone,
      description: isArabic ? 'الدفع عبر آبل باي' : 'Pay with Apple Pay',
      color: 'text-foreground'
    },
    {
      id: 'credit_card' as PaymentMethod,
      name: isArabic ? 'بطاقة ائتمان' : 'Credit Card',
      icon: CreditCard,
      description: isArabic ? 'فيزا / ماستركارد' : 'Visa / Mastercard',
      color: 'text-info'
    }
  ];

  const handlePayment = async () => {
    setIsProcessing(true);
    
    try {
      // Simulate payment processing (in production, integrate with real payment gateway)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update order payment_status to 'paid' - this will trigger the escrow creation
      // Note: status stays as 'confirmed', only payment_status changes to 'paid'
      const { error } = await supabase
        .from('orders')
        .update({ 
          payment_status: 'paid'
        })
        .eq('id', order.id);

      if (error) throw error;
      
      setIsComplete(true);
      
      toast({
        title: isArabic ? 'تم الدفع بنجاح!' : 'Payment Successful!',
        description: isArabic 
          ? 'تم إيداع المبلغ في حساب الضمان. سيتم تحويله للمورد عند التوصيل.' 
          : 'Amount deposited in escrow. Will be released to supplier upon delivery.',
      });
      
      if (onPaymentSuccess) {
        onPaymentSuccess();
      }

      // Close dialog after a short delay
      setTimeout(() => {
        onOpenChange(false);
        setIsComplete(false);
      }, 3000);
      
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: isArabic ? 'خطأ في الدفع' : 'Payment Error',
        description: isArabic ? 'فشل في عملية الدفع. حاول مرة أخرى.' : 'Payment failed. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isComplete) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="text-center space-y-6 py-8">
            <div className="w-20 h-20 mx-auto rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-success" />
            </div>
            
            <div>
              <h3 className="text-2xl font-bold text-success mb-2">
                {isArabic ? 'تم الدفع بنجاح!' : 'Payment Successful!'}
              </h3>
              <p className="text-muted-foreground">
                {isArabic 
                  ? 'تم إيداع المبلغ في حساب الضمان' 
                  : 'Amount deposited in escrow'}
              </p>
            </div>

            <Card className="bg-muted/50">
              <CardContent className="pt-6 space-y-3 text-sm">
                <div className="flex items-center justify-center gap-2 text-success">
                  <ShieldCheck className="w-5 h-5" />
                  <span className="font-medium">
                    {isArabic ? 'حماية الضمان' : 'Escrow Protection'}
                  </span>
                </div>
                <p className="text-muted-foreground text-xs">
                  {isArabic 
                    ? 'سيتم تحويل المبلغ للمورد تلقائياً عند تأكيد استلام الطلب'
                    : 'Amount will be automatically released to supplier upon delivery confirmation'}
                </p>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            {isArabic ? 'الدفع الآمن' : 'Secure Payment'}
          </DialogTitle>
          <DialogDescription>
            {isArabic 
              ? 'ادفع بأمان - المبلغ محمي حتى استلام الطلب' 
              : 'Pay securely - Amount protected until delivery'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Escrow Notice */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-4">
              <div className="flex gap-3">
                <ShieldCheck className="w-5 h-5 text-primary mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-primary">
                    {isArabic ? 'حماية المشتري' : 'Buyer Protection'}
                  </p>
                  <p className="text-muted-foreground mt-1">
                    {isArabic 
                      ? 'المبلغ محفوظ بأمان ولن يُحول للمورد إلا بعد تأكيد استلامك للطلب'
                      : 'Your payment is held securely and only released to supplier after you confirm delivery'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Summary */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">
              {isArabic ? 'ملخص الطلب' : 'Order Summary'}
            </h4>
            
            {order.coffee_name && (
              <div className="flex justify-between text-sm">
                <span>{order.coffee_name}</span>
                <span>{order.quantity_kg} {isArabic ? 'كجم' : 'kg'}</span>
              </div>
            )}
            
            {order.supplier_name && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{isArabic ? 'المورد' : 'Supplier'}</span>
                <span>{order.supplier_name}</span>
              </div>
            )}
            
            <Separator />
            
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {isArabic ? 'المجموع الفرعي' : 'Subtotal'}
              </span>
              <span>{orderTotal.toFixed(2)} {currency}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {isArabic ? 'ضريبة القيمة المضافة (15%)' : 'VAT (15%)'}
              </span>
              <span>{vatAmount.toFixed(2)} {currency}</span>
            </div>
            
            <Separator />
            
            <div className="flex justify-between font-bold text-lg">
              <span>{isArabic ? 'الإجمالي' : 'Total'}</span>
              <span className="text-primary">{totalWithVat.toFixed(2)} {currency}</span>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">
              {isArabic ? 'طريقة الدفع' : 'Payment Method'}
            </h4>
            
            <RadioGroup 
              value={paymentMethod} 
              onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
              className="space-y-2"
            >
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <Label
                    key={method.id}
                    htmlFor={`payment-${method.id}`}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      paymentMethod === method.id 
                        ? 'border-primary bg-primary/5' 
                        : 'border-muted hover:border-primary/50'
                    }`}
                  >
                    <RadioGroupItem value={method.id} id={`payment-${method.id}`} />
                    <Icon className={`w-5 h-5 ${method.color}`} />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{method.name}</div>
                    </div>
                    {method.id === 'mada' && (
                      <Badge variant="outline" className="text-xs text-success border-success">
                        {isArabic ? 'موصى به' : 'Recommended'}
                      </Badge>
                    )}
                  </Label>
                );
              })}
            </RadioGroup>
          </div>

          {/* Pay Button */}
          <Button 
            onClick={handlePayment} 
            disabled={isProcessing}
            className="w-full h-12 text-lg font-bold bg-gradient-to-r from-fivehub-orange to-fivehub-gold hover:from-fivehub-orange-dark hover:to-fivehub-orange"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                {isArabic ? 'جاري المعالجة...' : 'Processing...'}
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 mr-2" />
                {isArabic 
                  ? `ادفع ${totalWithVat.toFixed(2)} ${currency}` 
                  : `Pay ${totalWithVat.toFixed(2)} ${currency}`}
              </>
            )}
          </Button>

          {/* Security Note */}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-success" />
            {isArabic ? 'معاملة آمنة ومشفرة' : 'Secure & encrypted transaction'}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderPaymentDialog;
