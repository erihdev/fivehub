import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "@/hooks/use-toast";
import { 
  CreditCard, 
  Smartphone, 
  Wallet,
  CheckCircle2,
  ShieldCheck,
  Receipt,
  Loader2,
  Lock
} from "lucide-react";

interface PaymentItem {
  name: string;
  quantity: number;
  unitPrice: number;
}

interface PaymentSystemProps {
  items: PaymentItem[];
  currency?: string;
  onPaymentSuccess?: (invoiceId: string) => void;
  onPaymentError?: (error: string) => void;
}

type PaymentMethod = 'mada' | 'apple_pay' | 'credit_card';

const VAT_RATE = 0.15; // 15% Saudi VAT

const PaymentSystem = ({ 
  items, 
  currency = 'SAR',
  onPaymentSuccess,
  onPaymentError 
}: PaymentSystemProps) => {
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mada');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const vatAmount = subtotal * VAT_RATE;
  const total = subtotal + vatAmount;

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
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate invoice ID
      const newInvoiceId = `INV-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      setInvoiceId(newInvoiceId);
      setIsComplete(true);
      
      toast({
        title: isArabic ? 'تم الدفع بنجاح' : 'Payment Successful',
        description: isArabic 
          ? `رقم الفاتورة: ${newInvoiceId}` 
          : `Invoice #: ${newInvoiceId}`,
      });
      
      if (onPaymentSuccess) {
        onPaymentSuccess(newInvoiceId);
      }
    } catch (error) {
      const errorMessage = isArabic ? 'فشل في عملية الدفع' : 'Payment failed';
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
      if (onPaymentError) {
        onPaymentError(errorMessage);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  if (isComplete && invoiceId) {
    return (
      <Card className="border-2 border-success">
        <CardContent className="pt-8 text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-success/10 flex items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-success" />
          </div>
          
          <div>
            <h3 className="text-2xl font-bold text-success mb-2">
              {isArabic ? 'تم الدفع بنجاح!' : 'Payment Successful!'}
            </h3>
            <p className="text-muted-foreground">
              {isArabic ? 'تم إصدار الفاتورة الإلكترونية' : 'Electronic invoice has been issued'}
            </p>
          </div>

          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Receipt className="w-5 h-5 text-primary" />
                <span className="font-semibold">
                  {isArabic ? 'فاتورة إلكترونية' : 'Electronic Invoice (Fatoorah)'}
                </span>
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {isArabic ? 'رقم الفاتورة' : 'Invoice #'}
                  </span>
                  <span className="font-mono font-medium">{invoiceId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {isArabic ? 'المبلغ الإجمالي' : 'Total Amount'}
                  </span>
                  <span className="font-bold text-lg">
                    {total.toFixed(2)} {currency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {isArabic ? 'ضريبة القيمة المضافة (15%)' : 'VAT (15%)'}
                  </span>
                  <span>{vatAmount.toFixed(2)} {currency}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-success" />
            {isArabic 
              ? 'متوافق مع هيئة الزكاة والضريبة والجمارك' 
              : 'Compliant with ZATCA regulations'}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          {isArabic ? 'الدفع والفواتير' : 'Payment & Invoicing'}
        </CardTitle>
        <CardDescription>
          {isArabic 
            ? 'جميع الأسعار شاملة ضريبة القيمة المضافة 15%' 
            : 'All prices include 15% VAT'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Order Summary */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground">
            {isArabic ? 'ملخص الطلب' : 'Order Summary'}
          </h4>
          
          {items.map((item, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span>
                {item.name} × {item.quantity}
              </span>
              <span className="font-medium">
                {(item.quantity * item.unitPrice).toFixed(2)} {currency}
              </span>
            </div>
          ))}
          
          <Separator />
          
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {isArabic ? 'المجموع الفرعي' : 'Subtotal'}
            </span>
            <span>{subtotal.toFixed(2)} {currency}</span>
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
            <span className="text-primary">{total.toFixed(2)} {currency}</span>
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
            className="space-y-3"
          >
            {paymentMethods.map((method) => {
              const Icon = method.icon;
              return (
                <Label
                  key={method.id}
                  htmlFor={method.id}
                  className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    paymentMethod === method.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-muted hover:border-primary/50'
                  }`}
                >
                  <RadioGroupItem value={method.id} id={method.id} />
                  <Icon className={`w-6 h-6 ${method.color}`} />
                  <div className="flex-1">
                    <div className="font-medium">{method.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {method.description}
                    </div>
                  </div>
                  {method.id === 'mada' && (
                    <Badge variant="outline" className="text-success border-success">
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
          className="w-full h-14 text-lg font-bold bg-gradient-to-r from-fivehub-orange to-fivehub-gold hover:from-fivehub-orange-dark hover:to-fivehub-orange"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              {isArabic ? 'جاري المعالجة...' : 'Processing...'}
            </>
          ) : (
            <>
              <Lock className="w-5 h-5 mr-2" />
              {isArabic ? `ادفع ${total.toFixed(2)} ${currency}` : `Pay ${total.toFixed(2)} ${currency}`}
            </>
          )}
        </Button>

        {/* Security Badge */}
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-success" />
            {isArabic ? 'دفع آمن' : 'Secure Payment'}
          </div>
          <div className="flex items-center gap-1">
            <Receipt className="w-4 h-4 text-primary" />
            {isArabic ? 'فاتورة إلكترونية' : 'E-Invoice'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentSystem;
