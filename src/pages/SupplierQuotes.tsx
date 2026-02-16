import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ThemeToggle } from '@/components/ThemeToggle';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { 
  Coffee, 
  Package, 
  Clock, 
  CheckCircle2, 
  Loader2,
  FileText,
  ArrowLeft,
  Send,
  Edit
} from 'lucide-react';

interface QuoteRequest {
  id: string;
  roaster_id: string;
  status: string;
  total_amount: number | null;
  supplier_total: number | null;
  supplier_notes: string | null;
  roaster_notes: string | null;
  currency: string | null;
  created_at: string;
  roaster?: {
    full_name: string | null;
  };
  items?: {
    id: string;
    coffee_name: string;
    origin: string | null;
    quantity_kg: number;
    unit_price: number;
    supplier_unit_price: number | null;
    total_price: number;
    supplier_total_price: number | null;
  }[];
}

const SupplierQuotes = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState<QuoteRequest | null>(null);
  const [editedPrices, setEditedPrices] = useState<Record<string, number>>({});
  const [supplierNotes, setSupplierNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isArabic = language === 'ar';

  useEffect(() => {
    if (!user) return;
    fetchQuotes();
  }, [user]);

  const fetchQuotes = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Get supplier ID first
      const { data: supplierData } = await supabase
        .from('suppliers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!supplierData) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('quote_requests')
        .select(`
          *,
          items:quote_request_items(*)
        `)
        .eq('supplier_id', supplierData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch roaster profiles separately
      const quotesWithRoasters = await Promise.all(
        (data || []).map(async (quote: any) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', quote.roaster_id)
            .single();
          return { ...quote, roaster: profile };
        })
      );

      setQuotes(quotesWithRoasters);
    } catch (error) {
      console.error('Error fetching quotes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRespond = (quote: QuoteRequest) => {
    setSelectedQuote(quote);
    const prices: Record<string, number> = {};
    quote.items?.forEach(item => {
      prices[item.id] = item.supplier_unit_price || item.unit_price;
    });
    setEditedPrices(prices);
    setSupplierNotes(quote.supplier_notes || '');
  };

  const calculateNewTotal = () => {
    if (!selectedQuote?.items) return 0;
    return selectedQuote.items.reduce((sum, item) => {
      const price = editedPrices[item.id] || item.unit_price;
      return sum + (price * item.quantity_kg);
    }, 0);
  };

  const handleSubmitResponse = async () => {
    if (!selectedQuote) return;

    setIsSubmitting(true);
    try {
      // Update item prices
      for (const item of selectedQuote.items || []) {
        const newPrice = editedPrices[item.id];
        if (newPrice && newPrice !== item.unit_price) {
          await supabase
            .from('quote_request_items')
            .update({
              supplier_unit_price: newPrice,
              supplier_total_price: newPrice * item.quantity_kg,
            })
            .eq('id', item.id);
        }
      }

      // Update quote request
      const newTotal = calculateNewTotal();
      await supabase
        .from('quote_requests')
        .update({
          status: 'responded',
          supplier_total: newTotal,
          supplier_notes: supplierNotes,
          responded_at: new Date().toISOString(),
        })
        .eq('id', selectedQuote.id);

      toast({
        title: isArabic ? 'تم إرسال الرد' : 'Response Sent',
        description: isArabic ? 'تم إرسال عرض السعر للمحمصة' : 'Quote response sent to roaster',
      });

      setSelectedQuote(null);
      fetchQuotes();
    } catch (error) {
      console.error('Error responding to quote:', error);
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'فشل في إرسال الرد' : 'Failed to send response',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline'; icon: any }> = {
      pending: { label: isArabic ? 'جديد' : 'New', variant: 'secondary', icon: Clock },
      responded: { label: isArabic ? 'تم الرد' : 'Responded', variant: 'default', icon: FileText },
      accepted: { label: isArabic ? 'مقبول' : 'Accepted', variant: 'default', icon: CheckCircle2 },
      converted: { label: isArabic ? 'تم التحويل' : 'Converted', variant: 'outline', icon: CheckCircle2 },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const filterQuotes = (status: string) => {
    if (status === 'all') return quotes;
    return quotes.filter(q => q.status === status);
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center" dir={isArabic ? 'rtl' : 'ltr'}>
        <Loader2 className="w-8 h-8 animate-spin text-coffee-gold" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background font-arabic" dir={isArabic ? 'rtl' : 'ltr'}>
      <header className="bg-primary py-4">
        <div className="container mx-auto px-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Coffee className="w-8 h-8 text-coffee-gold" />
            <span className="text-2xl font-display font-bold text-primary-foreground">دال</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitcher />
            <Link to="/supplier-dashboard">
              <Button variant="ghost" className="text-primary-foreground">
                <ArrowLeft className="w-4 h-4 ml-2" />
                {isArabic ? 'لوحة التحكم' : 'Dashboard'}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-8">
          {isArabic ? 'طلبات عروض الأسعار الواردة' : 'Incoming Quote Requests'}
        </h1>

        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList>
            <TabsTrigger value="pending">
              {isArabic ? 'جديد' : 'New'} ({filterQuotes('pending').length})
            </TabsTrigger>
            <TabsTrigger value="responded">
              {isArabic ? 'تم الرد' : 'Responded'} ({filterQuotes('responded').length})
            </TabsTrigger>
            <TabsTrigger value="all">
              {isArabic ? 'الكل' : 'All'} ({quotes.length})
            </TabsTrigger>
          </TabsList>

          {['pending', 'responded', 'all'].map(tab => (
            <TabsContent key={tab} value={tab} className="space-y-4">
              {filterQuotes(tab).length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      {isArabic ? 'لا توجد طلبات' : 'No quotes found'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filterQuotes(tab).map(quote => (
                  <Card key={quote.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <Package className="w-5 h-5 text-coffee-gold" />
                          {quote.roaster?.full_name || (isArabic ? 'محمصة' : 'Roaster')}
                        </CardTitle>
                        {getStatusBadge(quote.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(quote.created_at).toLocaleDateString('ar-SA')}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        {quote.items?.map(item => (
                          <div key={item.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                            <div>
                              <p className="font-medium">{item.coffee_name}</p>
                              <p className="text-sm text-muted-foreground">{item.origin}</p>
                            </div>
                            <div className="text-left">
                              <p className="font-medium">{item.quantity_kg} kg</p>
                              <p className="text-sm text-muted-foreground">{item.unit_price} SAR/kg</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between p-3 bg-coffee-gold/10 rounded-lg">
                        <span className="font-semibold">{isArabic ? 'الإجمالي المطلوب:' : 'Requested Total:'}</span>
                        <span className="font-bold text-lg">{quote.total_amount?.toFixed(2)} SAR</span>
                      </div>

                      {quote.roaster_notes && (
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-sm font-medium mb-1">{isArabic ? 'ملاحظات المحمصة:' : 'Roaster notes:'}</p>
                          <p className="text-sm text-muted-foreground">{quote.roaster_notes}</p>
                        </div>
                      )}

                      {quote.status === 'pending' && (
                        <Button 
                          className="w-full bg-coffee-gold hover:bg-coffee-gold/90"
                          onClick={() => handleRespond(quote)}
                        >
                          <Edit className="w-4 h-4 ml-2" />
                          {isArabic ? 'تقديم عرض السعر' : 'Submit Quote'}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Response Dialog */}
      <Dialog open={!!selectedQuote} onOpenChange={() => setSelectedQuote(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isArabic ? 'تقديم عرض السعر' : 'Submit Quote'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              {isArabic 
                ? 'يمكنك تعديل الأسعار إذا أردت تقديم عرض مختلف'
                : 'You can modify prices if you want to offer different rates'}
            </p>

            {selectedQuote?.items?.map(item => (
              <div key={item.id} className="flex items-center justify-between gap-4 p-3 bg-muted/30 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-sm">{item.coffee_name}</p>
                  <p className="text-xs text-muted-foreground">{item.quantity_kg} kg</p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={editedPrices[item.id] || item.unit_price}
                    onChange={(e) => setEditedPrices({ ...editedPrices, [item.id]: Number(e.target.value) })}
                    className="w-24 text-center"
                    step="0.01"
                  />
                  <span className="text-sm text-muted-foreground">SAR/kg</span>
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between p-3 bg-coffee-gold/10 rounded-lg">
              <span className="font-semibold">{isArabic ? 'الإجمالي الجديد:' : 'New Total:'}</span>
              <span className="font-bold text-lg text-coffee-gold">{calculateNewTotal().toFixed(2)} SAR</span>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                {isArabic ? 'ملاحظات (اختياري):' : 'Notes (optional):'}
              </label>
              <Textarea
                placeholder={isArabic ? 'أي ملاحظات للمحمصة...' : 'Any notes for the roaster...'}
                value={supplierNotes}
                onChange={(e) => setSupplierNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedQuote(null)}>
              {isArabic ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button 
              className="bg-coffee-gold hover:bg-coffee-gold/90"
              onClick={handleSubmitResponse}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
              ) : (
                <Send className="w-4 h-4 ml-2" />
              )}
              {isArabic ? 'إرسال العرض' : 'Send Quote'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default SupplierQuotes;
