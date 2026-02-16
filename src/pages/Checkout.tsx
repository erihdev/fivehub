import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Package, 
  Send, 
  ArrowLeft,
  Loader2,
  CheckCircle2,
  ShoppingBag
} from 'lucide-react';

const Checkout = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { totalBySupplier, items, clearCart } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isArabic = language === 'ar';

  const handleSubmit = async () => {
    if (!user || items.length === 0) return;

    setIsSubmitting(true);
    try {
      // Create orders directly for each supplier
      for (const [supplierId, supplierData] of Object.entries(totalBySupplier)) {
        for (const item of supplierData.items) {
          const totalPrice = (item.coffee?.price || 0) * item.quantity_kg;
          
          const { error } = await supabase
            .from('orders')
            .insert({
              user_id: user.id,
              supplier_id: supplierId,
              coffee_id: item.coffee_id,
              quantity_kg: item.quantity_kg,
              total_price: totalPrice,
              status: 'pending',
              payment_status: 'unpaid',
              notes: notes[supplierId] || null,
              order_date: new Date().toISOString(),
            });

          if (error) throw error;
        }
      }

      // Clear the cart
      await clearCart();
      setSubmitted(true);

      toast({
        title: isArabic ? 'تم إرسال الطلبات' : 'Orders Placed',
        description: isArabic 
          ? `تم إرسال ${items.length} طلب بنجاح`
          : `${items.length} orders placed successfully`,
      });

    } catch (error) {
      console.error('Error submitting orders:', error);
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'فشل في إرسال الطلبات' : 'Failed to place orders',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <main className="min-h-screen bg-background font-arabic" dir={isArabic ? 'rtl' : 'ltr'}>
        <div className="container mx-auto px-6 py-20">
          <div className="max-w-md mx-auto text-center">
            <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold mb-4">
              {isArabic ? 'تم إرسال طلباتك بنجاح!' : 'Orders Placed Successfully!'}
            </h1>
            <p className="text-muted-foreground mb-8">
              {isArabic 
                ? 'سيتم إشعار الموردين وسيقومون بتأكيد طلباتك قريباً. يمكنك متابعة حالة الطلبات من صفحة طلباتي.'
                : 'Suppliers will be notified and will confirm your orders soon. You can track the status from My Orders page.'}
            </p>
            <div className="flex flex-col gap-3">
              <Button onClick={() => navigate('/buyer-orders')} className="bg-primary hover:bg-primary/90">
                {isArabic ? 'عرض طلباتي' : 'View My Orders'}
              </Button>
              <Button variant="outline" onClick={() => navigate('/suppliers')}>
                {isArabic ? 'تصفح المزيد من الموردين' : 'Browse More Suppliers'}
              </Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-background font-arabic" dir={isArabic ? 'rtl' : 'ltr'}>
        <div className="container mx-auto px-6 py-20">
          <div className="max-w-md mx-auto text-center">
            <ShoppingBag className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-4">
              {isArabic ? 'السلة فارغة' : 'Cart is Empty'}
            </h1>
            <p className="text-muted-foreground mb-8">
              {isArabic ? 'أضف محاصيل القهوة للسلة أولاً' : 'Add coffee to your cart first'}
            </p>
            <Button onClick={() => navigate('/suppliers')} className="bg-primary hover:bg-primary/90">
              {isArabic ? 'تصفح الموردين' : 'Browse Suppliers'}
            </Button>
          </div>
        </div>
      </main>
    );
  }

  const grandTotal = Object.values(totalBySupplier).reduce((sum, s) => sum + s.total, 0);

  return (
    <main className="min-h-screen bg-background font-arabic" dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isArabic ? 'إتمام الطلب' : 'Checkout'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isArabic 
                ? `${Object.keys(totalBySupplier).length} مورد • ${items.length} منتج`
                : `${Object.keys(totalBySupplier).length} suppliers • ${items.length} items`}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {Object.entries(totalBySupplier).map(([supplierId, supplierData]) => (
            <Card key={supplierId}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary" />
                    {supplierData.supplierName}
                  </div>
                  <Badge variant="secondary">{supplierData.items.length} {isArabic ? 'منتج' : 'items'}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  {supplierData.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{item.coffee?.name}</p>
                        <p className="text-xs text-muted-foreground">{item.coffee?.origin}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">{item.quantity_kg} kg</p>
                        <p className="text-xs text-muted-foreground">
                          {((item.coffee?.price || 0) * item.quantity_kg).toFixed(2)} SAR
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="flex items-center justify-between font-bold text-sm">
                  <span>{isArabic ? 'إجمالي المورد:' : 'Supplier Total:'}</span>
                  <span className="text-primary">{supplierData.total.toFixed(2)} SAR</span>
                </div>

                <div>
                  <label className="text-xs font-medium mb-1 block">
                    {isArabic ? 'ملاحظات (اختياري):' : 'Notes (optional):'}
                  </label>
                  <Textarea
                    placeholder={isArabic ? 'أي ملاحظات للمورد...' : 'Any notes for the supplier...'}
                    value={notes[supplierId] || ''}
                    onChange={(e) => setNotes({ ...notes, [supplierId]: e.target.value })}
                    rows={2}
                    className="text-sm"
                  />
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Summary & Submit */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between font-bold text-lg">
                <span>{isArabic ? 'الإجمالي الكلي:' : 'Grand Total:'}</span>
                <span className="text-primary">{grandTotal.toFixed(2)} SAR</span>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                {isArabic 
                  ? 'سيتم إرسال الطلبات للموردين مباشرة وستدفع عند تأكيد الطلب'
                  : 'Orders will be sent directly to suppliers. Payment after confirmation.'}
              </p>

              <Button 
                className="w-full"
                size="lg"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin ml-2" />
                    {isArabic ? 'جاري الإرسال...' : 'Placing Orders...'}
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5 ml-2" />
                    {isArabic ? 'تأكيد وإرسال الطلبات' : 'Confirm & Place Orders'}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
};

export default Checkout;
