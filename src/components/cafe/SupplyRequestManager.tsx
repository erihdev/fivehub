import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { 
  Gavel, Plus, Clock, CheckCircle, XCircle, 
  Package, MapPin, Calendar, Loader2, Users,
  TrendingUp, Award
} from 'lucide-react';

interface SupplyRequest {
  id: string;
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
  awarded_bid_id: string | null;
  created_at: string;
  bids_count?: number;
}

interface Bid {
  id: string;
  request_id: string;
  bidder_id: string;
  bidder_type: string;
  price_per_kg: number;
  total_price: number;
  currency: string;
  delivery_days: number;
  coffee_name: string | null;
  coffee_origin: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  bidder_name?: string;
}

const SupplyRequestManager = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isArabic = language === 'ar';
  
  const [requests, setRequests] = useState<SupplyRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<SupplyRequest | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showBidsDialog, setShowBidsDialog] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    title_ar: '',
    description: '',
    coffee_type: 'roasted',
    origin_preference: '',
    quantity_kg: '',
    max_price_per_kg: '',
    delivery_location: '',
    deadline: ''
  });

  useEffect(() => {
    if (user) {
      fetchRequests();
      subscribeToUpdates();
    }
  }, [user]);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('cafe_supply_requests')
        .select('*')
        .eq('cafe_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get bid counts for each request
      const requestsWithCounts = await Promise.all(
        (data || []).map(async (req) => {
          const { count } = await supabase
            .from('supply_request_bids')
            .select('*', { count: 'exact', head: true })
            .eq('request_id', req.id);
          return { ...req, bids_count: count || 0 };
        })
      );

      setRequests(requestsWithCounts);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error(isArabic ? 'خطأ في تحميل الطلبات' : 'Error loading requests');
    } finally {
      setLoading(false);
    }
  };

  const subscribeToUpdates = () => {
    const channel = supabase
      .channel('supply-requests-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'supply_request_bids'
      }, () => {
        fetchRequests();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchBids = async (requestId: string) => {
    try {
      const { data, error } = await supabase
        .from('supply_request_bids')
        .select('*')
        .eq('request_id', requestId)
        .order('price_per_kg', { ascending: true });

      if (error) throw error;

      // Get bidder names from user_roles
      const bidsWithNames = await Promise.all(
        (data || []).map(async (bid) => {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('company_name')
            .eq('user_id', bid.bidder_id)
            .single();
          return { ...bid, bidder_name: roleData?.company_name || (isArabic ? 'مورد' : 'Supplier') };
        })
      );

      setBids(bidsWithNames);
    } catch (error) {
      console.error('Error fetching bids:', error);
    }
  };

  const handleCreateRequest = async () => {
    if (!formData.title || !formData.quantity_kg || !formData.deadline) {
      toast.error(isArabic ? 'يرجى ملء الحقول المطلوبة' : 'Please fill required fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('cafe_supply_requests')
        .insert({
          cafe_id: user?.id,
          title: formData.title,
          title_ar: formData.title_ar || null,
          description: formData.description || null,
          coffee_type: formData.coffee_type,
          origin_preference: formData.origin_preference || null,
          quantity_kg: parseFloat(formData.quantity_kg),
          max_price_per_kg: formData.max_price_per_kg ? parseFloat(formData.max_price_per_kg) : null,
          delivery_location: formData.delivery_location || null,
          deadline: formData.deadline
        });

      if (error) throw error;

      toast.success(isArabic ? 'تم إنشاء الطلب بنجاح!' : 'Request created successfully!');
      setShowCreateDialog(false);
      setFormData({
        title: '', title_ar: '', description: '', coffee_type: 'roasted',
        origin_preference: '', quantity_kg: '', max_price_per_kg: '',
        delivery_location: '', deadline: ''
      });
      fetchRequests();
    } catch (error) {
      console.error('Error creating request:', error);
      toast.error(isArabic ? 'خطأ في إنشاء الطلب' : 'Error creating request');
    }
  };

  const handleAcceptBid = async (bid: Bid) => {
    try {
      // Update the bid status
      const { error: bidError } = await supabase
        .from('supply_request_bids')
        .update({ status: 'accepted' })
        .eq('id', bid.id);

      if (bidError) throw bidError;

      // Update the request status
      const { error: requestError } = await supabase
        .from('cafe_supply_requests')
        .update({ 
          status: 'awarded',
          awarded_bid_id: bid.id
        })
        .eq('id', bid.request_id);

      if (requestError) throw requestError;

      // Reject other bids
      await supabase
        .from('supply_request_bids')
        .update({ status: 'rejected' })
        .eq('request_id', bid.request_id)
        .neq('id', bid.id);

      toast.success(isArabic ? 'تم قبول العرض!' : 'Bid accepted!');
      setShowBidsDialog(false);
      fetchRequests();
    } catch (error) {
      console.error('Error accepting bid:', error);
      toast.error(isArabic ? 'خطأ في قبول العرض' : 'Error accepting bid');
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('cafe_supply_requests')
        .update({ status: 'cancelled' })
        .eq('id', requestId);

      if (error) throw error;

      toast.success(isArabic ? 'تم إلغاء الطلب' : 'Request cancelled');
      fetchRequests();
    } catch (error) {
      console.error('Error cancelling request:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; icon: React.ReactNode; label: string }> = {
      open: { 
        bg: 'bg-green-500/10 text-green-600 border-green-500/20', 
        icon: <Clock className="w-3 h-3" />,
        label: isArabic ? 'مفتوح' : 'Open'
      },
      awarded: { 
        bg: 'bg-blue-500/10 text-blue-600 border-blue-500/20', 
        icon: <Award className="w-3 h-3" />,
        label: isArabic ? 'تم الترسية' : 'Awarded'
      },
      closed: { 
        bg: 'bg-gray-500/10 text-gray-600 border-gray-500/20', 
        icon: <CheckCircle className="w-3 h-3" />,
        label: isArabic ? 'مغلق' : 'Closed'
      },
      cancelled: { 
        bg: 'bg-red-500/10 text-red-600 border-red-500/20', 
        icon: <XCircle className="w-3 h-3" />,
        label: isArabic ? 'ملغي' : 'Cancelled'
      }
    };
    const style = styles[status] || styles.open;
    return (
      <Badge variant="outline" className={`gap-1 ${style.bg}`}>
        {style.icon}
        {style.label}
      </Badge>
    );
  };

  const getCoffeeTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      green: isArabic ? 'قهوة خضراء' : 'Green Coffee',
      roasted: isArabic ? 'قهوة محمصة' : 'Roasted Coffee',
      any: isArabic ? 'أي نوع' : 'Any Type'
    };
    return types[type] || type;
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Gavel className="w-6 h-6 text-primary" />
            {isArabic ? 'طلبات التوريد' : 'Supply Requests'}
          </h2>
          <p className="text-muted-foreground mt-1">
            {isArabic 
              ? 'انشر احتياجاتك واحصل على أفضل العروض من الموردين والمحامص'
              : 'Post your needs and get the best offers from suppliers and roasters'}
          </p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              {isArabic ? 'طلب جديد' : 'New Request'}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {isArabic ? 'إنشاء طلب توريد جديد' : 'Create New Supply Request'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isArabic ? 'العنوان (إنجليزي)' : 'Title (English)'}</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Ethiopian Yirgacheffe"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isArabic ? 'العنوان (عربي)' : 'Title (Arabic)'}</Label>
                  <Input
                    value={formData.title_ar}
                    onChange={(e) => setFormData({ ...formData, title_ar: e.target.value })}
                    placeholder="مثال: يرغاتشيف إثيوبي"
                    dir="rtl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{isArabic ? 'الوصف' : 'Description'}</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={isArabic ? 'تفاصيل إضافية عن متطلباتك...' : 'Additional details about your requirements...'}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isArabic ? 'نوع القهوة' : 'Coffee Type'}</Label>
                  <Select
                    value={formData.coffee_type}
                    onValueChange={(v) => setFormData({ ...formData, coffee_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="roasted">{isArabic ? 'محمصة' : 'Roasted'}</SelectItem>
                      <SelectItem value="green">{isArabic ? 'خضراء' : 'Green'}</SelectItem>
                      <SelectItem value="any">{isArabic ? 'أي نوع' : 'Any'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{isArabic ? 'المنشأ المفضل' : 'Origin Preference'}</Label>
                  <Input
                    value={formData.origin_preference}
                    onChange={(e) => setFormData({ ...formData, origin_preference: e.target.value })}
                    placeholder={isArabic ? 'اختياري' : 'Optional'}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isArabic ? 'الكمية (كجم)' : 'Quantity (kg)'} *</Label>
                  <Input
                    type="number"
                    value={formData.quantity_kg}
                    onChange={(e) => setFormData({ ...formData, quantity_kg: e.target.value })}
                    placeholder="50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isArabic ? 'أقصى سعر للكيلو' : 'Max Price/kg'}</Label>
                  <Input
                    type="number"
                    value={formData.max_price_per_kg}
                    onChange={(e) => setFormData({ ...formData, max_price_per_kg: e.target.value })}
                    placeholder={isArabic ? 'اختياري' : 'Optional'}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{isArabic ? 'موقع التسليم' : 'Delivery Location'}</Label>
                <Input
                  value={formData.delivery_location}
                  onChange={(e) => setFormData({ ...formData, delivery_location: e.target.value })}
                  placeholder={isArabic ? 'مثال: الرياض - حي النخيل' : 'e.g. Riyadh - Al Nakheel'}
                />
              </div>

              <div className="space-y-2">
                <Label>{isArabic ? 'آخر موعد للعروض' : 'Deadline for Bids'} *</Label>
                <Input
                  type="datetime-local"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                />
              </div>

              <Button onClick={handleCreateRequest} className="w-full">
                {isArabic ? 'نشر الطلب' : 'Publish Request'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Requests List */}
      {requests.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Gavel className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              {isArabic 
                ? 'لا توجد طلبات توريد حالياً. أنشئ طلباً جديداً للحصول على عروض!'
                : 'No supply requests yet. Create a new request to get offers!'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => (
            <Card key={request.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">
                        {isArabic && request.title_ar ? request.title_ar : request.title}
                      </h3>
                      {getStatusBadge(request.status)}
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
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <TrendingUp className="w-4 h-4" />
                          {isArabic ? 'حد أقصى:' : 'Max:'} {request.max_price_per_kg} {request.currency}
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
                        {format(new Date(request.deadline), 'PPP', { locale: isArabic ? ar : enUS })}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    {request.status === 'open' && (
                      <>
                        <Button
                          variant="default"
                          size="sm"
                          className="gap-1"
                          onClick={() => {
                            setSelectedRequest(request);
                            fetchBids(request.id);
                            setShowBidsDialog(true);
                          }}
                        >
                          <Users className="w-4 h-4" />
                          {request.bids_count || 0} {isArabic ? 'عروض' : 'Bids'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => handleCancelRequest(request.id)}
                        >
                          {isArabic ? 'إلغاء' : 'Cancel'}
                        </Button>
                      </>
                    )}
                    {request.status === 'awarded' && (
                      <Badge className="bg-green-500">
                        <CheckCircle className="w-3 h-3 me-1" />
                        {isArabic ? 'تم الترسية' : 'Awarded'}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Bids Dialog */}
      <Dialog open={showBidsDialog} onOpenChange={setShowBidsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isArabic ? 'العروض المقدمة' : 'Submitted Bids'}
              {selectedRequest && (
                <span className="text-muted-foreground font-normal ms-2">
                  - {isArabic && selectedRequest.title_ar ? selectedRequest.title_ar : selectedRequest.title}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4 max-h-[60vh] overflow-y-auto">
            {bids.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                {isArabic ? 'لا توجد عروض بعد' : 'No bids yet'}
              </div>
            ) : (
              bids.map((bid, index) => (
                <Card key={bid.id} className={index === 0 ? 'ring-2 ring-green-500' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold">{bid.bidder_name}</span>
                          <Badge variant="outline">
                            {bid.bidder_type === 'roaster' 
                              ? (isArabic ? 'محمصة' : 'Roaster')
                              : (isArabic ? 'مورد' : 'Supplier')
                            }
                          </Badge>
                          {index === 0 && (
                            <Badge className="bg-green-500">
                              {isArabic ? 'أفضل سعر' : 'Best Price'}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                          <div>
                            <span className="text-muted-foreground">{isArabic ? 'السعر/كجم:' : 'Price/kg:'}</span>
                            <span className="font-semibold ms-1">{bid.price_per_kg} {bid.currency}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{isArabic ? 'الإجمالي:' : 'Total:'}</span>
                            <span className="font-semibold ms-1">{bid.total_price} {bid.currency}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{isArabic ? 'التوصيل:' : 'Delivery:'}</span>
                            <span className="ms-1">{bid.delivery_days} {isArabic ? 'أيام' : 'days'}</span>
                          </div>
                          {bid.coffee_origin && (
                            <div>
                              <span className="text-muted-foreground">{isArabic ? 'المنشأ:' : 'Origin:'}</span>
                              <span className="ms-1">{bid.coffee_origin}</span>
                            </div>
                          )}
                        </div>
                        
                        {bid.notes && (
                          <p className="text-sm text-muted-foreground">{bid.notes}</p>
                        )}
                      </div>
                      
                      {bid.status === 'pending' && selectedRequest?.status === 'open' && (
                        <Button 
                          size="sm" 
                          className="gap-1"
                          onClick={() => handleAcceptBid(bid)}
                        >
                          <CheckCircle className="w-4 h-4" />
                          {isArabic ? 'قبول' : 'Accept'}
                        </Button>
                      )}
                      {bid.status === 'accepted' && (
                        <Badge className="bg-green-500">
                          {isArabic ? 'مقبول' : 'Accepted'}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupplyRequestManager;
