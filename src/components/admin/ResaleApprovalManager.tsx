import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, X, Clock, Package, DollarSign, Loader2, Eye, Percent, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface ResaleListing {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  origin: string | null;
  process: string | null;
  quantity_kg: number;
  price_per_kg: number;
  currency: string;
  roast_date: string | null;
  reason: string | null;
  status: string;
  approval_status: string;
  admin_notes: string | null;
  platform_commission_rate: number;
  images: string[] | null;
  created_at: string;
  seller_name?: string;
}

const ResaleApprovalManager = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [listings, setListings] = useState<ResaleListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedListing, setSelectedListing] = useState<ResaleListing | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [commissionRate, setCommissionRate] = useState('5');
  const [adminNotes, setAdminNotes] = useState('');
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      const { data, error } = await supabase
        .from('coffee_resale')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const sellerIds = [...new Set((data || []).map(l => l.seller_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', sellerIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p.full_name]));

      const listingsWithSellers = (data || []).map(listing => ({
        ...listing,
        seller_name: profileMap.get(listing.seller_id) || (language === 'ar' ? 'محمصة' : 'Roaster')
      }));

      setListings(listingsWithSellers);
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (listing: ResaleListing) => {
    if (!user) return;
    setProcessing(listing.id);

    try {
      const { error } = await supabase
        .from('coffee_resale')
        .update({
          approval_status: 'approved',
          platform_commission_rate: parseFloat(commissionRate),
          admin_notes: adminNotes || null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id
        })
        .eq('id', listing.id);

      if (error) throw error;

      toast.success(language === 'ar' ? 'تمت الموافقة على العرض' : 'Listing approved');
      setShowDetailsDialog(false);
      setSelectedListing(null);
      setAdminNotes('');
      fetchListings();
    } catch (error) {
      console.error('Error approving listing:', error);
      toast.error(language === 'ar' ? 'فشل في الموافقة' : 'Failed to approve');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (listing: ResaleListing) => {
    if (!user || !adminNotes.trim()) {
      toast.error(language === 'ar' ? 'يرجى كتابة سبب الرفض' : 'Please provide rejection reason');
      return;
    }
    setProcessing(listing.id);

    try {
      const { error } = await supabase
        .from('coffee_resale')
        .update({
          approval_status: 'rejected',
          admin_notes: adminNotes,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id
        })
        .eq('id', listing.id);

      if (error) throw error;

      toast.success(language === 'ar' ? 'تم رفض العرض' : 'Listing rejected');
      setShowDetailsDialog(false);
      setSelectedListing(null);
      setAdminNotes('');
      fetchListings();
    } catch (error) {
      console.error('Error rejecting listing:', error);
      toast.error(language === 'ar' ? 'فشل في الرفض' : 'Failed to reject');
    } finally {
      setProcessing(null);
    }
  };

  const openDetails = (listing: ResaleListing) => {
    setSelectedListing(listing);
    setCommissionRate((listing.platform_commission_rate || 5).toString());
    setAdminNotes(listing.admin_notes || '');
    setImageIndex(0);
    setShowDetailsDialog(true);
  };

  const pendingListings = listings.filter(l => l.approval_status === 'pending');
  const approvedListings = listings.filter(l => l.approval_status === 'approved');
  const rejectedListings = listings.filter(l => l.approval_status === 'rejected');

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const renderListingCard = (listing: ResaleListing, showActions: boolean = false) => {
    const images = listing.images || [];
    
    return (
      <Card key={listing.id} className="overflow-hidden">
        {images.length > 0 && (
          <div className="h-32 bg-muted">
            <img src={images[0]} alt={listing.title} className="w-full h-full object-cover" />
          </div>
        )}
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-bold">{listing.title}</h4>
              <p className="text-sm text-muted-foreground">{listing.seller_name}</p>
            </div>
            <Badge variant={
              listing.approval_status === 'approved' ? 'default' :
              listing.approval_status === 'rejected' ? 'destructive' : 'secondary'
            }>
              {listing.approval_status === 'approved' 
                ? (language === 'ar' ? 'موافق' : 'Approved')
                : listing.approval_status === 'rejected'
                ? (language === 'ar' ? 'مرفوض' : 'Rejected')
                : (language === 'ar' ? 'معلق' : 'Pending')}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-1">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span>{listing.quantity_kg} {language === 'ar' ? 'كجم' : 'kg'}</span>
            </div>
            <div className="flex items-center gap-1">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span>{listing.price_per_kg} {listing.currency}</span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-sm text-primary">
            <Percent className="h-4 w-4" />
            <span>{language === 'ar' ? 'العمولة:' : 'Commission:'} {listing.platform_commission_rate || 5}%</span>
          </div>

          {showActions ? (
            <div className="flex gap-2 pt-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => openDetails(listing)}>
                <Eye className="h-4 w-4 ml-1" />
                {language === 'ar' ? 'تفاصيل' : 'Details'}
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" className="w-full" onClick={() => openDetails(listing)}>
              <Eye className="h-4 w-4 ml-1" />
              {language === 'ar' ? 'عرض التفاصيل' : 'View Details'}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            {language === 'ar' ? 'إدارة موافقات إعادة البيع' : 'Resale Approval Manager'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {language === 'ar' ? 'معلق' : 'Pending'} ({pendingListings.length})
              </TabsTrigger>
              <TabsTrigger value="approved" className="flex items-center gap-2">
                <Check className="h-4 w-4" />
                {language === 'ar' ? 'موافق' : 'Approved'} ({approvedListings.length})
              </TabsTrigger>
              <TabsTrigger value="rejected" className="flex items-center gap-2">
                <X className="h-4 w-4" />
                {language === 'ar' ? 'مرفوض' : 'Rejected'} ({rejectedListings.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              {pendingListings.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {pendingListings.map(listing => renderListingCard(listing, true))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{language === 'ar' ? 'لا توجد عروض معلقة' : 'No pending listings'}</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="approved">
              {approvedListings.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {approvedListings.map(listing => renderListingCard(listing))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Check className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{language === 'ar' ? 'لا توجد عروض موافق عليها' : 'No approved listings'}</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="rejected">
              {rejectedListings.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {rejectedListings.map(listing => renderListingCard(listing))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <X className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{language === 'ar' ? 'لا توجد عروض مرفوضة' : 'No rejected listings'}</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedListing && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedListing.title}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Images */}
                {selectedListing.images && selectedListing.images.length > 0 && (
                  <div className="relative h-64 bg-muted rounded-lg overflow-hidden">
                    <img
                      src={selectedListing.images[imageIndex]}
                      alt={selectedListing.title}
                      className="w-full h-full object-cover"
                    />
                    {selectedListing.images.length > 1 && (
                      <>
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                          {selectedListing.images.map((_, idx) => (
                            <div
                              key={idx}
                              className={`w-2 h-2 rounded-full ${idx === imageIndex ? 'bg-primary' : 'bg-white/50'}`}
                            />
                          ))}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white"
                          onClick={() => setImageIndex(prev => (prev - 1 + selectedListing.images!.length) % selectedListing.images!.length)}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white"
                          onClick={() => setImageIndex(prev => (prev + 1) % selectedListing.images!.length)}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                )}

                {/* Details */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">{language === 'ar' ? 'البائع' : 'Seller'}</Label>
                    <p className="font-medium">{selectedListing.seller_name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{language === 'ar' ? 'المنشأ' : 'Origin'}</Label>
                    <p className="font-medium">{selectedListing.origin || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{language === 'ar' ? 'المعالجة' : 'Process'}</Label>
                    <p className="font-medium">{selectedListing.process || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{language === 'ar' ? 'الكمية' : 'Quantity'}</Label>
                    <p className="font-medium">{selectedListing.quantity_kg} {language === 'ar' ? 'كجم' : 'kg'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{language === 'ar' ? 'السعر/كجم' : 'Price/kg'}</Label>
                    <p className="font-medium">{selectedListing.price_per_kg} {selectedListing.currency}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{language === 'ar' ? 'تاريخ التحميص' : 'Roast Date'}</Label>
                    <p className="font-medium">
                      {selectedListing.roast_date 
                        ? format(new Date(selectedListing.roast_date), 'PP', { locale: language === 'ar' ? ar : undefined })
                        : '-'}
                    </p>
                  </div>
                </div>

                {selectedListing.description && (
                  <div>
                    <Label className="text-muted-foreground">{language === 'ar' ? 'الوصف' : 'Description'}</Label>
                    <p className="mt-1">{selectedListing.description}</p>
                  </div>
                )}

                {selectedListing.reason && (
                  <div>
                    <Label className="text-muted-foreground">{language === 'ar' ? 'سبب البيع' : 'Reason'}</Label>
                    <p className="mt-1">{selectedListing.reason}</p>
                  </div>
                )}

                {/* Commission Rate Input */}
                {selectedListing.approval_status === 'pending' && (
                  <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 space-y-3">
                    <Label className="text-primary font-medium">
                      {language === 'ar' ? 'نسبة عمولة المنصة (%)' : 'Platform Commission Rate (%)'}
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={commissionRate}
                      onChange={(e) => setCommissionRate(e.target.value)}
                      placeholder="5"
                    />
                  </div>
                )}

                {/* Admin Notes */}
                <div>
                  <Label>{language === 'ar' ? 'ملاحظات الأدمن' : 'Admin Notes'}</Label>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder={language === 'ar' ? 'أضف ملاحظات أو سبب الرفض...' : 'Add notes or rejection reason...'}
                    className="mt-2"
                    disabled={selectedListing.approval_status !== 'pending'}
                  />
                </div>
              </div>

              {selectedListing.approval_status === 'pending' && (
                <DialogFooter className="gap-2">
                  <Button
                    variant="destructive"
                    onClick={() => handleReject(selectedListing)}
                    disabled={processing === selectedListing.id}
                  >
                    {processing === selectedListing.id ? (
                      <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    ) : (
                      <X className="h-4 w-4 ml-2" />
                    )}
                    {language === 'ar' ? 'رفض' : 'Reject'}
                  </Button>
                  <Button
                    onClick={() => handleApprove(selectedListing)}
                    disabled={processing === selectedListing.id}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {processing === selectedListing.id ? (
                      <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    ) : (
                      <Check className="h-4 w-4 ml-2" />
                    )}
                    {language === 'ar' ? 'موافقة' : 'Approve'}
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ResaleApprovalManager;
