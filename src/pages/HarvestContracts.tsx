import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowRight, FileText, Calendar, Package, CheckCircle, Clock, Loader2, X, PenTool, ThumbsUp, ThumbsDown } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import SignaturePad from '@/components/SignaturePad';

interface Contract {
  id: string;
  origin: string;
  variety: string | null;
  expected_harvest_date: string;
  quantity_kg: number;
  price_per_kg: number;
  currency: string;
  deposit_percentage: number;
  deposit_paid: boolean;
  status: string;
  terms: string | null;
  supplier_id: string;
  supplier_name?: string;
  created_at: string;
  buyer_signature?: string | null;
  buyer_signed_at?: string | null;
  supplier_signature?: string | null;
  supplier_signed_at?: string | null;
  roaster_response: string;
  roaster_response_at: string | null;
  roaster_notes: string | null;
  creator_role: string;
}

const HarvestContracts = () => {
  const { language } = useLanguage();
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [signingContract, setSigningContract] = useState<Contract | null>(null);
  const [respondingContract, setRespondingContract] = useState<Contract | null>(null);
  const [responseNotes, setResponseNotes] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchContracts();
    }
  }, [user]);

  const fetchContracts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('harvest_contracts')
        .select(`
          *,
          suppliers(name)
        `)
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setContracts((data || []).map((c: any) => ({
        ...c,
        supplier_name: c.suppliers?.name
      })));
    } catch (error) {
      console.error('Error fetching contracts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (contractId: string, response: 'accepted' | 'rejected') => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('harvest_contracts')
        .update({
          roaster_response: response,
          roaster_response_at: new Date().toISOString(),
          roaster_notes: responseNotes || null,
          status: response === 'accepted' ? 'confirmed' : 'cancelled'
        })
        .eq('id', contractId);

      if (error) throw error;

      toast.success(
        response === 'accepted'
          ? (language === 'ar' ? 'تم قبول العرض بنجاح!' : 'Offer accepted successfully!')
          : (language === 'ar' ? 'تم رفض العرض' : 'Offer rejected')
      );
      setRespondingContract(null);
      setResponseNotes('');
      fetchContracts();
    } catch (error) {
      console.error('Error responding to offer:', error);
      toast.error(language === 'ar' ? 'حدث خطأ' : 'An error occurred');
    }
  };

  const getResponseBadge = (response: string) => {
    const config: Record<string, { color: string; label: string; labelAr: string }> = {
      pending: { color: 'bg-yellow-500/10 text-yellow-500', label: 'Pending Response', labelAr: 'في انتظار ردك' },
      accepted: { color: 'bg-green-500/10 text-green-500', label: 'Accepted', labelAr: 'مقبول' },
      rejected: { color: 'bg-destructive/10 text-destructive', label: 'Rejected', labelAr: 'مرفوض' }
    };

    const c = config[response] || config.pending;
    return (
      <Badge className={c.color}>
        {language === 'ar' ? c.labelAr : c.label}
      </Badge>
    );
  };

  const calculateDeposit = (contract: Contract) => {
    return (contract.quantity_kg * contract.price_per_kg * contract.deposit_percentage) / 100;
  };

  const handleSignContract = async (signature: string) => {
    if (!signingContract || !user) return;

    try {
      const { error } = await supabase
        .from('harvest_contracts')
        .update({
          buyer_signature: signature,
          buyer_signed_at: new Date().toISOString()
        })
        .eq('id', signingContract.id);

      if (error) throw error;

      toast.success(language === 'ar' ? 'تم توقيع العقد بنجاح!' : 'Contract signed successfully!');
      setSigningContract(null);
      fetchContracts();
    } catch (error) {
      console.error('Error signing contract:', error);
      toast.error(language === 'ar' ? 'فشل في توقيع العقد' : 'Failed to sign contract');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowRight className={`h-5 w-5 ${language === 'ar' ? '' : 'rotate-180'}`} />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <FileText className="h-8 w-8 text-primary" />
                {language === 'ar' ? 'عروض ما قبل الحصاد الواردة' : 'Incoming Pre-Harvest Offers'}
              </h1>
              <p className="text-muted-foreground">
                {language === 'ar' ? 'راجع عروض الموردين واقبلها أو ارفضها' : 'Review supplier offers and accept or reject them'}
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{contracts.length}</p>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'إجمالي العروض' : 'Total Offers'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">{contracts.filter(c => c.roaster_response === 'pending').length}</p>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'تحتاج ردك' : 'Need Response'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{contracts.filter(c => c.roaster_response === 'accepted').length}</p>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'مقبولة' : 'Accepted'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Package className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {contracts.filter(c => c.roaster_response === 'accepted').reduce((sum, c) => sum + c.quantity_kg, 0).toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'كجم محجوز' : 'kg Reserved'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contracts List */}
        <div className="grid gap-4 md:grid-cols-2">
          {contracts.map(contract => (
            <Card key={contract.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{contract.origin}</CardTitle>
                    {contract.variety && (
                      <p className="text-sm text-muted-foreground">{contract.variety}</p>
                    )}
                  </div>
                  {getResponseBadge(contract.roaster_response)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'المورد:' : 'Supplier:'} {contract.supplier_name}
                </p>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">{language === 'ar' ? 'تاريخ الحصاد' : 'Harvest Date'}</p>
                      <p className="font-medium">
                        {format(new Date(contract.expected_harvest_date), 'PP', { locale: language === 'ar' ? ar : undefined })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">{language === 'ar' ? 'الكمية' : 'Quantity'}</p>
                      <p className="font-medium">{contract.quantity_kg} {language === 'ar' ? 'كجم' : 'kg'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">{language === 'ar' ? 'السعر/كجم' : 'Price/kg'}</span>
                    <span className="font-medium">{contract.price_per_kg} {contract.currency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">{language === 'ar' ? 'الإجمالي' : 'Total'}</span>
                    <span className="font-bold text-primary">
                      {(contract.quantity_kg * contract.price_per_kg).toLocaleString()} {contract.currency}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-sm text-muted-foreground">
                      {language === 'ar' ? `العربون (${contract.deposit_percentage}%)` : `Deposit (${contract.deposit_percentage}%)`}
                    </span>
                    <span className="font-medium">{calculateDeposit(contract).toLocaleString()} {contract.currency}</span>
                  </div>
                </div>

                {contract.terms && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    <strong>{language === 'ar' ? 'الشروط:' : 'Terms:'}</strong> {contract.terms}
                  </p>
                )}

                {/* Response Actions */}
                {contract.roaster_response === 'pending' && (
                  <div className="flex gap-2 pt-2">
                    <Button 
                      className="flex-1" 
                      variant="default"
                      onClick={() => setRespondingContract(contract)}
                    >
                      <ThumbsUp className="h-4 w-4 ml-2" />
                      {language === 'ar' ? 'قبول' : 'Accept'}
                    </Button>
                    <Button 
                      className="flex-1" 
                      variant="destructive"
                      onClick={() => {
                        setRespondingContract(contract);
                      }}
                    >
                      <ThumbsDown className="h-4 w-4 ml-2" />
                      {language === 'ar' ? 'رفض' : 'Reject'}
                    </Button>
                  </div>
                )}

                {/* Signature Section - Only for accepted contracts */}
                {contract.roaster_response === 'accepted' && (
                  <div className="border-t pt-4 mt-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium">
                        {language === 'ar' ? 'التوقيع الإلكتروني' : 'Electronic Signature'}
                      </span>
                      {contract.buyer_signature ? (
                        <Badge className="bg-green-500/10 text-green-500">
                          <CheckCircle className="h-3 w-3 ml-1" />
                          {language === 'ar' ? 'موقّع' : 'Signed'}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                          {language === 'ar' ? 'غير موقّع' : 'Not Signed'}
                        </Badge>
                      )}
                    </div>
                    
                    {contract.buyer_signature ? (
                      <div className="space-y-2">
                        <div className="bg-white rounded border p-2">
                          <img 
                            src={contract.buyer_signature} 
                            alt="Signature" 
                            className="h-16 mx-auto object-contain"
                          />
                        </div>
                        {contract.buyer_signed_at && (
                          <p className="text-xs text-muted-foreground text-center">
                            {language === 'ar' ? 'تم التوقيع في' : 'Signed on'}{' '}
                            {format(new Date(contract.buyer_signed_at), 'PPp', { locale: language === 'ar' ? ar : undefined })}
                          </p>
                        )}
                      </div>
                    ) : (
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => setSigningContract(contract)}
                      >
                        <PenTool className="h-4 w-4 ml-2" />
                        {language === 'ar' ? 'توقيع العقد' : 'Sign Contract'}
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {contracts.length === 0 && (
          <Card className="p-12 text-center">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {language === 'ar' ? 'لا توجد عروض واردة' : 'No Incoming Offers'}
            </h3>
            <p className="text-muted-foreground">
              {language === 'ar' ? 'ستظهر هنا عروض الموردين عندما يرسلونها إليك' : 'Supplier offers will appear here when they send them to you'}
            </p>
          </Card>
        )}

        {/* Response Dialog */}
        <Dialog open={!!respondingContract} onOpenChange={(open) => !open && setRespondingContract(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {language === 'ar' ? 'الرد على العرض' : 'Respond to Offer'}
              </DialogTitle>
            </DialogHeader>
            {respondingContract && (
              <div className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-3 text-sm">
                  <p><strong>{language === 'ar' ? 'المنشأ:' : 'Origin:'}</strong> {respondingContract.origin}</p>
                  <p><strong>{language === 'ar' ? 'الكمية:' : 'Quantity:'}</strong> {respondingContract.quantity_kg} {language === 'ar' ? 'كجم' : 'kg'}</p>
                  <p><strong>{language === 'ar' ? 'الإجمالي:' : 'Total:'}</strong> {(respondingContract.quantity_kg * respondingContract.price_per_kg).toLocaleString()} {respondingContract.currency}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium">{language === 'ar' ? 'ملاحظات (اختياري)' : 'Notes (optional)'}</label>
                  <Textarea
                    value={responseNotes}
                    onChange={(e) => setResponseNotes(e.target.value)}
                    placeholder={language === 'ar' ? 'أضف ملاحظاتك...' : 'Add your notes...'}
                    className="mt-1"
                  />
                </div>

                <div className="flex gap-2">
                  <Button 
                    className="flex-1" 
                    onClick={() => handleResponse(respondingContract.id, 'accepted')}
                  >
                    <ThumbsUp className="h-4 w-4 ml-2" />
                    {language === 'ar' ? 'قبول العرض' : 'Accept Offer'}
                  </Button>
                  <Button 
                    className="flex-1" 
                    variant="destructive"
                    onClick={() => handleResponse(respondingContract.id, 'rejected')}
                  >
                    <ThumbsDown className="h-4 w-4 ml-2" />
                    {language === 'ar' ? 'رفض العرض' : 'Reject Offer'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Signature Dialog */}
        <Dialog open={!!signingContract} onOpenChange={(open) => !open && setSigningContract(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PenTool className="h-5 w-5 text-primary" />
                {language === 'ar' ? 'توقيع العقد' : 'Sign Contract'}
              </DialogTitle>
            </DialogHeader>
            {signingContract && (
              <div className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-3 text-sm">
                  <p><strong>{language === 'ar' ? 'المنشأ:' : 'Origin:'}</strong> {signingContract.origin}</p>
                  <p><strong>{language === 'ar' ? 'الكمية:' : 'Quantity:'}</strong> {signingContract.quantity_kg} {language === 'ar' ? 'كجم' : 'kg'}</p>
                  <p><strong>{language === 'ar' ? 'الإجمالي:' : 'Total:'}</strong> {(signingContract.quantity_kg * signingContract.price_per_kg).toLocaleString()} {signingContract.currency}</p>
                </div>
                <SignaturePad
                  onSave={handleSignContract}
                  onCancel={() => setSigningContract(null)}
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default HarvestContracts;
