import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { 
  Gavel, Package, MapPin, Calendar, Loader2, 
  Clock, CheckCircle, XCircle, TrendingUp, Send
} from 'lucide-react';

interface SupplyRequest {
  id: string;
  cafe_id: string;
  title: string;
  title_ar: string | null;
  description: string | null;
  coffee_type: string;
  origin_preference: string | null;
  quantity_kg: number;
  max_price_per_kg: number | null;
  currency: string;
  delivery_location: string | null;
  deadline: string;
  status: string;
  created_at: string;
  cafe_name?: string;
}

interface MyBid {
  id: string;
  request_id: string;
  price_per_kg: number;
  total_price: number;
  delivery_days: number;
  coffee_name: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  request_title?: string;
}

interface SupplyBidsManagerProps {
  bidderType: 'supplier' | 'roaster';
}

const SupplyBidsManager = ({ bidderType }: SupplyBidsManagerProps) => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isArabic = language === 'ar';
  
  const [openRequests, setOpenRequests] = useState<SupplyRequest[]>([]);
  const [myBids, setMyBids] = useState<MyBid[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBidDialog, setShowBidDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<SupplyRequest | null>(null);
  
  const [bidForm, setBidForm] = useState({
    price_per_kg: '',
    delivery_days: '',
    coffee_name: '',
    coffee_origin: '',
    notes: ''
  });

  useEffect(() => {
    if (user) {
      fetchData();
      subscribeToUpdates();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch open supply requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('cafe_supply_requests')
        .select('*')
        .eq('status', 'open')
        .gt('deadline', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;

      // Get cafe names
      const requestsWithNames = await Promise.all(
        (requestsData || []).map(async (req) => {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('company_name')
            .eq('user_id', req.cafe_id)
            .single();
          return { ...req, cafe_name: roleData?.company_name || (isArabic ? 'مقهى' : 'Cafe') };
        })
      );
      setOpenRequests(requestsWithNames);

      // Fetch my bids
      const { data: bidsData, error: bidsError } = await supabase
        .from('supply_request_bids')
        .select('*')
        .eq('bidder_id', user?.id)
        .order('created_at', { ascending: false });

      if (bidsError) throw bidsError;

      // Get request titles for my bids
      const bidsWithTitles = await Promise.all(
        (bidsData || []).map(async (bid) => {
          const { data: reqData } = await supabase
            .from('cafe_supply_requests')
            .select('title, title_ar')
            .eq('id', bid.request_id)
            .single();
          return { 
            ...bid, 
            request_title: isArabic && reqData?.title_ar ? reqData.title_ar : reqData?.title 
          };
        })
      );
      setMyBids(bidsWithTitles);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error(isArabic ? 'خطأ في تحميل البيانات' : 'Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const subscribeToUpdates = () => {
    const channel = supabase
      .channel('supply-bids-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'cafe_supply_requests'
      }, () => {
        fetchData();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'supply_request_bids',
        filter: `bidder_id=eq.${user?.id}`
      }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSubmitBid = async () => {
    if (!selectedRequest || !bidForm.price_per_kg || !bidForm.delivery_days) {
      toast.error(isArabic ? 'يرجى ملء الحقول المطلوبة' : 'Please fill required fields');
      return;
    }

    // Check if already bid on this request
    const existingBid = myBids.find(b => b.request_id === selectedRequest.id);
    if (existingBid) {
      toast.error(isArabic ? 'لقد قدمت عرضاً على هذا الطلب مسبقاً' : 'You already bid on this request');
      return;
    }

    try {
      const pricePerKg = parseFloat(bidForm.price_per_kg);
      const totalPrice = pricePerKg * selectedRequest.quantity_kg;

      const { error } = await supabase
        .from('supply_request_bids')
        .insert({
          request_id: selectedRequest.id,
          bidder_id: user?.id,
          bidder_type: bidderType,
          price_per_kg: pricePerKg,
          total_price: totalPrice,
          delivery_days: parseInt(bidForm.delivery_days),
          coffee_name: bidForm.coffee_name || null,
          coffee_origin: bidForm.coffee_origin || null,
          notes: bidForm.notes || null
        });

      if (error) throw error;

      toast.success(isArabic ? 'تم تقديم العرض بنجاح!' : 'Bid submitted successfully!');
      setShowBidDialog(false);
      setBidForm({
        price_per_kg: '', delivery_days: '',
        coffee_name: '', coffee_origin: '', notes: ''
      });
      fetchData();
    } catch (error) {
      console.error('Error submitting bid:', error);
      toast.error(isArabic ? 'خطأ في تقديم العرض' : 'Error submitting bid');
    }
  };

  const handleWithdrawBid = async (bidId: string) => {
    try {
      const { error } = await supabase
        .from('supply_request_bids')
        .update({ status: 'withdrawn' })
        .eq('id', bidId);

      if (error) throw error;

      toast.success(isArabic ? 'تم سحب العرض' : 'Bid withdrawn');
      fetchData();
    } catch (error) {
      console.error('Error withdrawing bid:', error);
    }
  };

  const getCoffeeTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      green: isArabic ? 'قهوة خضراء' : 'Green Coffee',
      roasted: isArabic ? 'قهوة محمصة' : 'Roasted Coffee',
      any: isArabic ? 'أي نوع' : 'Any Type'
    };
    return types[type] || type;
  };

  const getBidStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; icon: React.ReactNode; label: string }> = {
      pending: { 
        bg: 'bg-yellow-500/10 text-yellow-600', 
        icon: <Clock className="w-3 h-3" />,
        label: isArabic ? 'قيد المراجعة' : 'Pending'
      },
      accepted: { 
        bg: 'bg-green-500/10 text-green-600', 
        icon: <CheckCircle className="w-3 h-3" />,
        label: isArabic ? 'مقبول' : 'Accepted'
      },
      rejected: { 
        bg: 'bg-red-500/10 text-red-600', 
        icon: <XCircle className="w-3 h-3" />,
        label: isArabic ? 'مرفوض' : 'Rejected'
      },
      withdrawn: { 
        bg: 'bg-gray-500/10 text-gray-600', 
        icon: <XCircle className="w-3 h-3" />,
        label: isArabic ? 'مسحوب' : 'Withdrawn'
      }
    };
    const style = styles[status] || styles.pending;
    return (
      <Badge variant="outline" className={`gap-1 ${style.bg}`}>
        {style.icon}
        {style.label}
      </Badge>
    );
  };

  // Check if user already bid on a request
  const hasBidOnRequest = (requestId: string) => {
    return myBids.some(b => b.request_id === requestId && b.status !== 'withdrawn');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Gavel className="w-6 h-6 text-primary" />
          {isArabic ? 'طلبات التوريد المفتوحة' : 'Open Supply Requests'}
        </h2>
        <p className="text-muted-foreground mt-1">
          {isArabic 
            ? 'تصفح طلبات المقاهي وقدم عروضك التنافسية'
            : 'Browse cafe requests and submit your competitive bids'}
        </p>
      </div>

      {/* Open Requests */}
      {openRequests.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Gavel className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {isArabic ? 'لا توجد طلبات مفتوحة حالياً' : 'No open requests at the moment'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {openRequests.map((request) => (
            <Card key={request.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">
                        {isArabic && request.title_ar ? request.title_ar : request.title}
                      </h3>
                      <Badge variant="outline" className="bg-primary/5">
                        {request.cafe_name}
                      </Badge>
                    </div>
                    
                    {request.description && (
                      <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                        {request.description}
                      </p>
                    )}
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Package className="w-4 h-4" />
                        {request.quantity_kg} {isArabic ? 'كجم' : 'kg'} - {getCoffeeTypeLabel(request.coffee_type)}
                      </span>
                      {request.max_price_per_kg && (
                        <span className="flex items-center gap-1 text-green-600">
                          <TrendingUp className="w-4 h-4" />
                          {isArabic ? 'حد أقصى:' : 'Max:'} {request.max_price_per_kg} {request.currency}/{isArabic ? 'كجم' : 'kg'}
                        </span>
                      )}
                      {request.delivery_location && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          {request.delivery_location}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        {isArabic ? 'ينتهي:' : 'Ends:'} {format(new Date(request.deadline), 'PPP', { locale: isArabic ? ar : enUS })}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    {hasBidOnRequest(request.id) ? (
                      <Badge className="bg-green-500">
                        <CheckCircle className="w-3 h-3 me-1" />
                        {isArabic ? 'تم التقديم' : 'Bid Submitted'}
                      </Badge>
                    ) : (
                      <Button
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowBidDialog(true);
                        }}
                        className="gap-2"
                      >
                        <Send className="w-4 h-4" />
                        {isArabic ? 'قدم عرضك' : 'Submit Bid'}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* My Bids Section */}
      {myBids.length > 0 && (
        <div className="space-y-4 mt-8">
          <h3 className="text-xl font-semibold">
            {isArabic ? 'عروضي' : 'My Bids'}
          </h3>
          <div className="grid gap-3">
            {myBids.map((bid) => (
              <Card key={bid.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{bid.request_title}</span>
                        {getBidStatusBadge(bid.status)}
                      </div>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span>{bid.price_per_kg} {isArabic ? 'ر.س/كجم' : 'SAR/kg'}</span>
                        <span>{isArabic ? 'الإجمالي:' : 'Total:'} {bid.total_price} {isArabic ? 'ر.س' : 'SAR'}</span>
                        <span>{bid.delivery_days} {isArabic ? 'أيام توصيل' : 'days delivery'}</span>
                      </div>
                    </div>
                    {bid.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500"
                        onClick={() => handleWithdrawBid(bid.id)}
                      >
                        {isArabic ? 'سحب العرض' : 'Withdraw'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Bid Dialog */}
      <Dialog open={showBidDialog} onOpenChange={setShowBidDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isArabic ? 'تقديم عرض' : 'Submit Bid'}
              {selectedRequest && (
                <span className="text-muted-foreground font-normal ms-2">
                  - {isArabic && selectedRequest.title_ar ? selectedRequest.title_ar : selectedRequest.title}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4 mt-4">
              {/* Request Summary */}
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <div className="flex justify-between mb-1">
                  <span className="text-muted-foreground">{isArabic ? 'الكمية المطلوبة:' : 'Quantity needed:'}</span>
                  <span className="font-medium">{selectedRequest.quantity_kg} {isArabic ? 'كجم' : 'kg'}</span>
                </div>
                {selectedRequest.max_price_per_kg && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{isArabic ? 'الحد الأقصى للسعر:' : 'Max price:'}</span>
                    <span className="font-medium text-green-600">{selectedRequest.max_price_per_kg} {selectedRequest.currency}/{isArabic ? 'كجم' : 'kg'}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isArabic ? 'السعر لكل كجم' : 'Price per kg'} *</Label>
                  <Input
                    type="number"
                    value={bidForm.price_per_kg}
                    onChange={(e) => setBidForm({ ...bidForm, price_per_kg: e.target.value })}
                    placeholder="150"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isArabic ? 'مدة التوصيل (أيام)' : 'Delivery (days)'} *</Label>
                  <Input
                    type="number"
                    value={bidForm.delivery_days}
                    onChange={(e) => setBidForm({ ...bidForm, delivery_days: e.target.value })}
                    placeholder="3"
                  />
                </div>
              </div>

              {bidForm.price_per_kg && (
                <div className="bg-primary/5 rounded-lg p-3 text-center">
                  <span className="text-muted-foreground">{isArabic ? 'السعر الإجمالي:' : 'Total Price:'}</span>
                  <span className="font-bold text-lg ms-2">
                    {(parseFloat(bidForm.price_per_kg) * selectedRequest.quantity_kg).toLocaleString()} {selectedRequest.currency}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isArabic ? 'اسم القهوة' : 'Coffee Name'}</Label>
                  <Input
                    value={bidForm.coffee_name}
                    onChange={(e) => setBidForm({ ...bidForm, coffee_name: e.target.value })}
                    placeholder={isArabic ? 'اختياري' : 'Optional'}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isArabic ? 'المنشأ' : 'Origin'}</Label>
                  <Input
                    value={bidForm.coffee_origin}
                    onChange={(e) => setBidForm({ ...bidForm, coffee_origin: e.target.value })}
                    placeholder={isArabic ? 'اختياري' : 'Optional'}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{isArabic ? 'ملاحظات إضافية' : 'Additional Notes'}</Label>
                <Textarea
                  value={bidForm.notes}
                  onChange={(e) => setBidForm({ ...bidForm, notes: e.target.value })}
                  placeholder={isArabic ? 'معلومات إضافية عن عرضك...' : 'Additional info about your offer...'}
                />
              </div>

              <Button onClick={handleSubmitBid} className="w-full gap-2">
                <Send className="w-4 h-4" />
                {isArabic ? 'تقديم العرض' : 'Submit Bid'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupplyBidsManager;
