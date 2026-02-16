import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  Coffee, 
  Send, 
  ArrowRight, 
  ArrowLeft,
  Loader2,
  CheckCircle2,
  ShoppingBag
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import LanguageSwitcher from '@/components/LanguageSwitcher';

const QuoteRequest = () => {
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
      // Create quote requests for each supplier
      for (const [supplierId, supplierData] of Object.entries(totalBySupplier)) {
        // Create quote request
        const { data: quoteRequest, error: quoteError } = await supabase
          .from('quote_requests')
          .insert({
            roaster_id: user.id,
            supplier_id: supplierId,
            total_amount: supplierData.total,
            roaster_notes: notes[supplierId] || null,
            currency: 'SAR',
            valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
          })
          .select()
          .single();

        if (quoteError) throw quoteError;

        // Create quote request items
        const quoteItems = supplierData.items.map(item => ({
          quote_request_id: quoteRequest.id,
          coffee_id: item.coffee_id,
          coffee_name: item.coffee?.name || '',
          origin: item.coffee?.origin || null,
          quantity_kg: item.quantity_kg,
          unit_price: item.coffee?.price || 0,
          total_price: (item.coffee?.price || 0) * item.quantity_kg,
        }));

        const { error: itemsError } = await supabase
          .from('quote_request_items')
          .insert(quoteItems);

        if (itemsError) throw itemsError;
      }

      // Clear the cart
      await clearCart();
      setSubmitted(true);

      toast({
        title: isArabic ? 'تم إرسال الطلبات' : 'Quotes Requested',
        description: isArabic 
          ? `تم إرسال ${Object.keys(totalBySupplier).length} طلب عرض سعر بنجاح`
          : `${Object.keys(totalBySupplier).length} quote requests sent successfully`,
      });

    } catch (error) {
      console.error('Error submitting quotes:', error);
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'فشل في إرسال طلبات العروض' : 'Failed to submit quote requests',
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
              {isArabic ? 'تم إرسال طلبات عروض الأسعار!' : 'Quote Requests Sent!'}
            </h1>
            <p className="text-muted-foreground mb-8">
              {isArabic 
                ? 'سيتم إشعار الموردين وسيقومون بالرد على طلباتك قريباً. يمكنك متابعة حالة الطلبات من صفحة عروض الأسعار.'
                : 'Suppliers will be notified and will respond to your requests soon. You can track the status from the quotes page.'}
            </p>
            <div className="flex flex-col gap-3">
              <Button onClick={() => navigate('/my-quotes')} className="bg-coffee-gold hover:bg-coffee-gold/90">
                {isArabic ? 'عرض طلباتي' : 'View My Quotes'}
                {isArabic ? <ArrowLeft className="w-4 h-4 mr-2" /> : <ArrowRight className="w-4 h-4 ml-2" />}
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
            <Button onClick={() => navigate('/suppliers')} className="bg-coffee-gold hover:bg-coffee-gold/90">
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
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {isArabic ? 'طلب عروض الأسعار' : 'Request Quotes'}
          </h1>
          <p className="text-muted-foreground">
            {isArabic 
              ? `سيتم إرسال ${Object.keys(totalBySupplier).length} طلب عرض سعر منفصل للموردين التاليين`
              : `${Object.keys(totalBySupplier).length} separate quote requests will be sent to the following suppliers`}
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {Object.entries(totalBySupplier).map(([supplierId, supplierData]) => (
              <Card key={supplierId}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="w-5 h-5 text-coffee-gold" />
                      {supplierData.supplierName}
                    </div>
                    <Badge>{supplierData.items.length} {isArabic ? 'منتج' : 'items'}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {supplierData.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div>
                          <p className="font-medium">{item.coffee?.name}</p>
                          <p className="text-sm text-muted-foreground">{item.coffee?.origin}</p>
                        </div>
                        <div className="text-left">
                          <p className="font-semibold">{item.quantity_kg} kg</p>
                          <p className="text-sm text-muted-foreground">
                            {item.coffee?.price} × {item.quantity_kg} = {((item.coffee?.price || 0) * item.quantity_kg).toFixed(2)} SAR
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between font-bold">
                    <span>{isArabic ? 'إجمالي العرض:' : 'Quote Total:'}</span>
                    <span className="text-coffee-gold">{supplierData.total.toFixed(2)} SAR</span>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      {isArabic ? 'ملاحظات للمورد (اختياري):' : 'Notes to supplier (optional):'}
                    </label>
                    <Textarea
                      placeholder={isArabic ? 'أي ملاحظات أو متطلبات خاصة...' : 'Any notes or special requirements...'}
                      value={notes[supplierId] || ''}
                      onChange={(e) => setNotes({ ...notes, [supplierId]: e.target.value })}
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>{isArabic ? 'ملخص الطلب' : 'Order Summary'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {Object.entries(totalBySupplier).map(([supplierId, supplierData]) => (
                    <div key={supplierId} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{supplierData.supplierName}</span>
                      <span>{supplierData.total.toFixed(2)} SAR</span>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="flex items-center justify-between font-bold text-lg">
                  <span>{isArabic ? 'الإجمالي:' : 'Total:'}</span>
                  <span className="text-coffee-gold">{grandTotal.toFixed(2)} SAR</span>
                </div>

                <p className="text-xs text-muted-foreground">
                  {isArabic 
                    ? 'الأسعار تقديرية وقد يقوم الموردون بتعديلها في عروضهم'
                    : 'Prices are estimated and suppliers may adjust them in their quotes'}
                </p>

                <Button 
                  className="w-full bg-coffee-gold hover:bg-coffee-gold/90"
                  size="lg"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                      {isArabic ? 'جاري الإرسال...' : 'Sending...'}
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5 ml-2" />
                      {isArabic ? 'إرسال طلبات العروض' : 'Send Quote Requests'}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
};

export default QuoteRequest;
