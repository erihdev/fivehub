import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { ThemeToggle } from '@/components/ThemeToggle';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { 
  Coffee, 
  Package, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  FileText,
  ArrowLeft
} from 'lucide-react';

interface QuoteRequest {
  id: string;
  supplier_id: string;
  status: string;
  total_amount: number | null;
  supplier_total: number | null;
  supplier_notes: string | null;
  roaster_notes: string | null;
  currency: string | null;
  valid_until: string | null;
  responded_at: string | null;
  accepted_at: string | null;
  created_at: string;
  supplier?: {
    name: string;
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

const MyQuotes = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isArabic = language === 'ar';

  useEffect(() => {
    if (!user) return;
    fetchQuotes();
  }, [user]);

  const fetchQuotes = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('quote_requests')
        .select(`
          *,
          supplier:suppliers(name),
          items:quote_request_items(*)
        `)
        .eq('roaster_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuotes((data as any) || []);
    } catch (error) {
      console.error('Error fetching quotes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptQuote = async (quoteId: string) => {
    try {
      const quote = quotes.find(q => q.id === quoteId);
      if (!quote) return;

      // Update quote status
      const { error: updateError } = await supabase
        .from('quote_requests')
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', quoteId);

      if (updateError) throw updateError;

      // Create order from quote
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user!.id,
          supplier_id: quote.supplier_id,
          quantity_kg: quote.items?.reduce((sum, item) => sum + item.quantity_kg, 0) || 0,
          total_price: quote.supplier_total || quote.total_amount,
          status: 'pending',
          notes: `طلب من عرض سعر #${quoteId.slice(0, 8)}`,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Update quote with order reference
      await supabase
        .from('quote_requests')
        .update({ 
          status: 'converted',
          converted_order_id: orderData.id 
        })
        .eq('id', quoteId);

      fetchQuotes();
    } catch (error) {
      console.error('Error accepting quote:', error);
    }
  };

  const handleRejectQuote = async (quoteId: string) => {
    try {
      await supabase
        .from('quote_requests')
        .update({ status: 'rejected' })
        .eq('id', quoteId);

      fetchQuotes();
    } catch (error) {
      console.error('Error rejecting quote:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; icon: any }> = {
      pending: { label: isArabic ? 'في الانتظار' : 'Pending', variant: 'secondary', icon: Clock },
      responded: { label: isArabic ? 'تم الرد' : 'Responded', variant: 'default', icon: FileText },
      accepted: { label: isArabic ? 'مقبول' : 'Accepted', variant: 'default', icon: CheckCircle2 },
      rejected: { label: isArabic ? 'مرفوض' : 'Rejected', variant: 'destructive', icon: XCircle },
      converted: { label: isArabic ? 'تم التحويل لطلب' : 'Converted', variant: 'outline', icon: CheckCircle2 },
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
      <div className="container mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-8">
          {isArabic ? 'طلبات عروض الأسعار' : 'My Quote Requests'}
        </h1>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all">{isArabic ? 'الكل' : 'All'} ({quotes.length})</TabsTrigger>
            <TabsTrigger value="pending">{isArabic ? 'في الانتظار' : 'Pending'} ({filterQuotes('pending').length})</TabsTrigger>
            <TabsTrigger value="responded">{isArabic ? 'تم الرد' : 'Responded'} ({filterQuotes('responded').length})</TabsTrigger>
            <TabsTrigger value="converted">{isArabic ? 'محول لطلب' : 'Converted'} ({filterQuotes('converted').length})</TabsTrigger>
          </TabsList>

          {['all', 'pending', 'responded', 'converted'].map(tab => (
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
                          {quote.supplier?.name}
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
                              {item.supplier_unit_price ? (
                                <div className="text-sm">
                                  <span className="line-through text-muted-foreground">{item.unit_price}</span>
                                  <span className="text-coffee-gold mr-2">{item.supplier_unit_price} SAR/kg</span>
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">{item.unit_price} SAR/kg</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between p-3 bg-coffee-gold/10 rounded-lg">
                        <span className="font-semibold">{isArabic ? 'الإجمالي:' : 'Total:'}</span>
                        <div className="text-left">
                          {quote.supplier_total && quote.supplier_total !== quote.total_amount ? (
                            <>
                              <span className="line-through text-muted-foreground text-sm mr-2">
                                {quote.total_amount?.toFixed(2)}
                              </span>
                              <span className="font-bold text-coffee-gold text-lg">
                                {quote.supplier_total.toFixed(2)} SAR
                              </span>
                            </>
                          ) : (
                            <span className="font-bold text-lg">{quote.total_amount?.toFixed(2)} SAR</span>
                          )}
                        </div>
                      </div>

                      {quote.supplier_notes && (
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-sm font-medium mb-1">{isArabic ? 'ملاحظات المورد:' : 'Supplier notes:'}</p>
                          <p className="text-sm text-muted-foreground">{quote.supplier_notes}</p>
                        </div>
                      )}

                      {quote.status === 'responded' && (
                        <div className="flex gap-2">
                          <Button 
                            className="flex-1 bg-coffee-gold hover:bg-coffee-gold/90"
                            onClick={() => handleAcceptQuote(quote.id)}
                          >
                            <CheckCircle2 className="w-4 h-4 ml-2" />
                            {isArabic ? 'قبول وتحويل لطلب' : 'Accept & Convert to Order'}
                          </Button>
                          <Button 
                            variant="outline"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleRejectQuote(quote.id)}
                          >
                            <XCircle className="w-4 h-4 ml-2" />
                            {isArabic ? 'رفض' : 'Reject'}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </main>
  );
};

export default MyQuotes;
