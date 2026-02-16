import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Gavel, Check, X, Clock, Eye, Loader2, DollarSign, Package, Percent } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Auction {
  id: string;
  title: string;
  title_ar: string | null;
  description: string | null;
  starting_price: number;
  current_price: number;
  quantity_kg: number;
  currency: string;
  start_time: string;
  end_time: string;
  status: string;
  approval_status: string;
  admin_notes: string | null;
  platform_commission_rate: number;
  supplier_id: string;
  supplier_name?: string;
  created_at: string;
}

const AuctionApprovalManager = () => {
  const { language } = useLanguage();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [commissionRate, setCommissionRate] = useState('5');
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  useEffect(() => {
    fetchAuctions();

    const channel = supabase
      .channel('admin-auctions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coffee_auctions' }, () => {
        fetchAuctions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAuctions = async () => {
    try {
      const { data, error } = await supabase
        .from('coffee_auctions')
        .select(`
          *,
          suppliers(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted = (data || []).map((a: any) => ({
        ...a,
        supplier_name: a.suppliers?.name
      }));

      setAuctions(formatted);
    } catch (error) {
      console.error('Error fetching auctions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (auction: Auction) => {
    const rate = parseFloat(commissionRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      toast.error(language === 'ar' ? 'يرجى إدخال نسبة عمولة صحيحة (0-100)' : 'Please enter a valid commission rate (0-100)');
      return;
    }

    setProcessingId(auction.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('coffee_auctions')
        .update({
          approval_status: 'approved',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          admin_notes: adminNotes || null,
          platform_commission_rate: rate
        })
        .eq('id', auction.id);

      if (error) throw error;

      toast.success(language === 'ar' ? 'تمت الموافقة على المزاد' : 'Auction approved');
      setSelectedAuction(null);
      setAdminNotes('');
      setCommissionRate('5');
    } catch (error) {
      console.error('Error approving auction:', error);
      toast.error(language === 'ar' ? 'فشل في الموافقة' : 'Failed to approve');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (auction: Auction) => {
    if (!adminNotes.trim()) {
      toast.error(language === 'ar' ? 'يرجى إدخال سبب الرفض' : 'Please enter rejection reason');
      return;
    }

    setProcessingId(auction.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('coffee_auctions')
        .update({
          approval_status: 'rejected',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          admin_notes: adminNotes
        })
        .eq('id', auction.id);

      if (error) throw error;

      toast.success(language === 'ar' ? 'تم رفض المزاد' : 'Auction rejected');
      setShowRejectDialog(false);
      setSelectedAuction(null);
      setAdminNotes('');
    } catch (error) {
      console.error('Error rejecting auction:', error);
      toast.error(language === 'ar' ? 'فشل في الرفض' : 'Failed to reject');
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 ml-1" />{language === 'ar' ? 'قيد المراجعة' : 'Pending'}</Badge>;
      case 'approved':
        return <Badge className="bg-success text-success-foreground"><Check className="h-3 w-3 ml-1" />{language === 'ar' ? 'موافق عليه' : 'Approved'}</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><X className="h-3 w-3 ml-1" />{language === 'ar' ? 'مرفوض' : 'Rejected'}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const pendingAuctions = auctions.filter(a => a.approval_status === 'pending');
  const approvedAuctions = auctions.filter(a => a.approval_status === 'approved');
  const rejectedAuctions = auctions.filter(a => a.approval_status === 'rejected');

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const AuctionCard = ({ auction }: { auction: Auction }) => (
    <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium">{language === 'ar' ? auction.title_ar || auction.title : auction.title}</span>
          {getStatusBadge(auction.approval_status)}
        </div>
        <p className="text-sm text-muted-foreground">{auction.supplier_name}</p>
        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            {auction.starting_price} {auction.currency}
          </span>
          <span className="flex items-center gap-1">
            <Package className="h-3 w-3" />
            {auction.quantity_kg} {language === 'ar' ? 'كجم' : 'kg'}
          </span>
          <span>
            {format(new Date(auction.start_time), 'PP', { locale: language === 'ar' ? ar : undefined })}
          </span>
        </div>
      </div>
      <div className="flex gap-2">
        {auction.approval_status === 'pending' && (
          <>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => setSelectedAuction(auction)}>
                  <Eye className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{language === 'ar' ? 'تفاصيل المزاد' : 'Auction Details'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{language === 'ar' ? 'العنوان' : 'Title'}</p>
                    <p className="font-medium">{auction.title}</p>
                    {auction.title_ar && <p className="text-sm text-muted-foreground">{auction.title_ar}</p>}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{language === 'ar' ? 'المورد' : 'Supplier'}</p>
                    <p className="font-medium">{auction.supplier_name}</p>
                  </div>
                  {auction.description && (
                    <div>
                      <p className="text-sm text-muted-foreground">{language === 'ar' ? 'الوصف' : 'Description'}</p>
                      <p>{auction.description}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">{language === 'ar' ? 'سعر البداية' : 'Starting Price'}</p>
                      <p className="font-medium">{auction.starting_price} {auction.currency}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{language === 'ar' ? 'الكمية' : 'Quantity'}</p>
                      <p className="font-medium">{auction.quantity_kg} {language === 'ar' ? 'كجم' : 'kg'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">{language === 'ar' ? 'البداية' : 'Start'}</p>
                      <p className="text-sm">{format(new Date(auction.start_time), 'PPp', { locale: language === 'ar' ? ar : undefined })}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{language === 'ar' ? 'النهاية' : 'End'}</p>
                      <p className="text-sm">{format(new Date(auction.end_time), 'PPp', { locale: language === 'ar' ? ar : undefined })}</p>
                    </div>
                  </div>
                  <div className="bg-primary/10 p-4 rounded-lg space-y-3">
                    <div className="flex items-center gap-2">
                      <Percent className="h-4 w-4 text-primary" />
                      <Label className="font-medium">{language === 'ar' ? 'نسبة عمولة المنصة' : 'Platform Commission Rate'}</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={commissionRate}
                        onChange={(e) => setCommissionRate(e.target.value)}
                        className="w-24"
                        min="0"
                        max="100"
                        step="0.5"
                      />
                      <span className="text-muted-foreground">%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {language === 'ar' ? 'أدخل النسبة المئوية التي ستحصل عليها المنصة من المبيعات' : 'Enter the percentage the platform will receive from sales'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">{language === 'ar' ? 'ملاحظات (اختياري)' : 'Notes (Optional)'}</p>
                    <Textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder={language === 'ar' ? 'أضف ملاحظات للمورد...' : 'Add notes for supplier...'}
                    />
                  </div>
                </div>
                <DialogFooter className="gap-2">
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setShowRejectDialog(true);
                    }}
                    disabled={processingId === auction.id}
                  >
                    <X className="h-4 w-4 ml-1" />
                    {language === 'ar' ? 'رفض' : 'Reject'}
                  </Button>
                  <Button
                    onClick={() => handleApprove(auction)}
                    disabled={processingId === auction.id}
                  >
                    {processingId === auction.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="h-4 w-4 ml-1" />
                        {language === 'ar' ? 'موافقة' : 'Approve'}
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gavel className="h-5 w-5 text-primary" />
            {language === 'ar' ? 'إدارة طلبات المزادات' : 'Auction Requests Management'}
          </CardTitle>
          <CardDescription>
            {language === 'ar' ? 'مراجعة والموافقة على طلبات المزادات من الموردين' : 'Review and approve supplier auction requests'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending">
            <TabsList className="mb-4">
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {language === 'ar' ? 'قيد المراجعة' : 'Pending'} ({pendingAuctions.length})
              </TabsTrigger>
              <TabsTrigger value="approved" className="flex items-center gap-2">
                <Check className="h-4 w-4" />
                {language === 'ar' ? 'موافق عليها' : 'Approved'} ({approvedAuctions.length})
              </TabsTrigger>
              <TabsTrigger value="rejected" className="flex items-center gap-2">
                <X className="h-4 w-4" />
                {language === 'ar' ? 'مرفوضة' : 'Rejected'} ({rejectedAuctions.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              {pendingAuctions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Gavel className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{language === 'ar' ? 'لا توجد طلبات معلقة' : 'No pending requests'}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingAuctions.map(auction => (
                    <AuctionCard key={auction.id} auction={auction} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="approved">
              {approvedAuctions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>{language === 'ar' ? 'لا توجد مزادات موافق عليها' : 'No approved auctions'}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {approvedAuctions.map(auction => (
                    <AuctionCard key={auction.id} auction={auction} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="rejected">
              {rejectedAuctions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>{language === 'ar' ? 'لا توجد مزادات مرفوضة' : 'No rejected auctions'}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {rejectedAuctions.map(auction => (
                    <div key={auction.id} className="p-4 rounded-lg border">
                      <AuctionCard auction={auction} />
                      {auction.admin_notes && (
                        <div className="mt-2 p-2 bg-destructive/10 rounded text-sm text-destructive">
                          <strong>{language === 'ar' ? 'سبب الرفض:' : 'Rejection reason:'}</strong> {auction.admin_notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{language === 'ar' ? 'رفض المزاد' : 'Reject Auction'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              {language === 'ar' ? 'يرجى إدخال سبب الرفض ليتم إبلاغ المورد:' : 'Please enter the rejection reason to notify the supplier:'}
            </p>
            <Textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder={language === 'ar' ? 'سبب الرفض...' : 'Rejection reason...'}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedAuction && handleReject(selectedAuction)}
              disabled={!adminNotes.trim() || processingId !== null}
            >
              {processingId ? <Loader2 className="h-4 w-4 animate-spin" /> : (language === 'ar' ? 'تأكيد الرفض' : 'Confirm Reject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AuctionApprovalManager;
