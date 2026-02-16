import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowRight, FileText, Calendar, Package, Coins, CheckCircle, Clock, Plus, Loader2, X, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface HarvestOffer {
  id: string;
  origin: string;
  variety: string | null;
  expected_harvest_date: string;
  quantity_kg: number;
  price_per_kg: number;
  currency: string;
  deposit_percentage: number;
  status: string;
  terms: string | null;
  buyer_id: string;
  roaster_response: string;
  roaster_response_at: string | null;
  roaster_notes: string | null;
  created_at: string;
}

const CreateHarvestOffer = () => {
  const { language } = useLanguage();
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [offers, setOffers] = useState<HarvestOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [roasters, setRoasters] = useState<{ id: string; company_name: string }[]>([]);
  const [formData, setFormData] = useState({
    buyer_id: '',
    origin: '',
    variety: '',
    expected_harvest_date: '',
    quantity_kg: '',
    price_per_kg: '',
    deposit_percentage: '20',
    terms: ''
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchSupplier();
      fetchRoasters();
    }
  }, [user]);

  useEffect(() => {
    if (supplierId) {
      fetchOffers();
    }
  }, [supplierId]);

  const fetchSupplier = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('suppliers')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setSupplierId(data.id);
    }
  };

  const fetchRoasters = async () => {
    const { data } = await supabase
      .from('user_roles')
      .select('user_id, company_name')
      .eq('role', 'roaster')
      .eq('status', 'approved');

    setRoasters((data || []).map(r => ({
      id: r.user_id,
      company_name: r.company_name || 'Roaster'
    })));
  };

  const fetchOffers = async () => {
    if (!supplierId) return;

    try {
      const { data, error } = await supabase
        .from('harvest_contracts')
        .select('*')
        .eq('supplier_id', supplierId)
        .eq('creator_role', 'supplier')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setOffers(data || []);
    } catch (error) {
      console.error('Error fetching offers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user || !supplierId) return;

    if (!formData.buyer_id || !formData.origin || !formData.expected_harvest_date || !formData.quantity_kg || !formData.price_per_kg) {
      toast.error(language === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('harvest_contracts')
        .insert({
          buyer_id: formData.buyer_id,
          supplier_id: supplierId,
          creator_id: user.id,
          creator_role: 'supplier',
          origin: formData.origin,
          variety: formData.variety || null,
          expected_harvest_date: formData.expected_harvest_date,
          quantity_kg: parseFloat(formData.quantity_kg),
          price_per_kg: parseFloat(formData.price_per_kg),
          deposit_percentage: parseFloat(formData.deposit_percentage),
          terms: formData.terms || null,
          roaster_response: 'pending'
        });

      if (error) throw error;

      toast.success(language === 'ar' ? 'تم إنشاء العرض بنجاح!' : 'Offer created successfully!');
      setShowDialog(false);
      setFormData({
        buyer_id: '',
        origin: '',
        variety: '',
        expected_harvest_date: '',
        quantity_kg: '',
        price_per_kg: '',
        deposit_percentage: '20',
        terms: ''
      });
      fetchOffers();
    } catch (error) {
      console.error('Error creating offer:', error);
      toast.error(language === 'ar' ? 'فشل في إنشاء العرض' : 'Failed to create offer');
    }
  };

  const getResponseBadge = (response: string) => {
    const config: Record<string, { color: string; label: string; labelAr: string }> = {
      pending: { color: 'bg-yellow-500/10 text-yellow-500', label: 'Pending', labelAr: 'في انتظار الرد' },
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
                {language === 'ar' ? 'عروض ما قبل الحصاد' : 'Pre-Harvest Offers'}
              </h1>
              <p className="text-muted-foreground">
                {language === 'ar' ? 'أنشئ عروضاً للمحامص لحجز محصولك' : 'Create offers for roasters to reserve your harvest'}
              </p>
            </div>
          </div>

          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 ml-2" />
                {language === 'ar' ? 'عرض جديد' : 'New Offer'}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{language === 'ar' ? 'إنشاء عرض جديد' : 'Create New Offer'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>{language === 'ar' ? 'المحمصة' : 'Roaster'} *</Label>
                  <Select value={formData.buyer_id} onValueChange={(v) => setFormData(prev => ({ ...prev, buyer_id: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'ar' ? 'اختر المحمصة' : 'Select roaster'} />
                    </SelectTrigger>
                    <SelectContent>
                      {roasters.map(r => (
                        <SelectItem key={r.id} value={r.id}>{r.company_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{language === 'ar' ? 'المنشأ' : 'Origin'} *</Label>
                    <Input
                      value={formData.origin}
                      onChange={(e) => setFormData(prev => ({ ...prev, origin: e.target.value }))}
                      placeholder={language === 'ar' ? 'مثال: إثيوبيا' : 'e.g., Ethiopia'}
                    />
                  </div>
                  <div>
                    <Label>{language === 'ar' ? 'الصنف' : 'Variety'}</Label>
                    <Input
                      value={formData.variety}
                      onChange={(e) => setFormData(prev => ({ ...prev, variety: e.target.value }))}
                      placeholder={language === 'ar' ? 'مثال: Heirloom' : 'e.g., Heirloom'}
                    />
                  </div>
                </div>

                <div>
                  <Label>{language === 'ar' ? 'تاريخ الحصاد المتوقع' : 'Expected Harvest Date'} *</Label>
                  <Input
                    type="date"
                    value={formData.expected_harvest_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, expected_harvest_date: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{language === 'ar' ? 'الكمية (كجم)' : 'Quantity (kg)'} *</Label>
                    <Input
                      type="number"
                      value={formData.quantity_kg}
                      onChange={(e) => setFormData(prev => ({ ...prev, quantity_kg: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>{language === 'ar' ? 'السعر/كجم' : 'Price/kg'} *</Label>
                    <Input
                      type="number"
                      value={formData.price_per_kg}
                      onChange={(e) => setFormData(prev => ({ ...prev, price_per_kg: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <Label>{language === 'ar' ? 'نسبة العربون (%)' : 'Deposit Percentage (%)'}</Label>
                  <Input
                    type="number"
                    value={formData.deposit_percentage}
                    onChange={(e) => setFormData(prev => ({ ...prev, deposit_percentage: e.target.value }))}
                  />
                </div>

                <div>
                  <Label>{language === 'ar' ? 'الشروط والأحكام' : 'Terms & Conditions'}</Label>
                  <Textarea
                    value={formData.terms}
                    onChange={(e) => setFormData(prev => ({ ...prev, terms: e.target.value }))}
                    placeholder={language === 'ar' ? 'أدخل الشروط والأحكام...' : 'Enter terms and conditions...'}
                  />
                </div>

                <Button onClick={handleSubmit} className="w-full">
                  {language === 'ar' ? 'إرسال العرض' : 'Send Offer'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{offers.length}</p>
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
                  <p className="text-2xl font-bold">{offers.filter(o => o.roaster_response === 'pending').length}</p>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'في الانتظار' : 'Pending'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{offers.filter(o => o.roaster_response === 'accepted').length}</p>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'مقبولة' : 'Accepted'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <X className="h-8 w-8 text-destructive" />
                <div>
                  <p className="text-2xl font-bold">{offers.filter(o => o.roaster_response === 'rejected').length}</p>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'مرفوضة' : 'Rejected'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Offers List */}
        <div className="grid gap-4 md:grid-cols-2">
          {offers.map(offer => (
            <Card key={offer.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{offer.origin}</CardTitle>
                    {offer.variety && (
                      <p className="text-sm text-muted-foreground">{offer.variety}</p>
                    )}
                  </div>
                  {getResponseBadge(offer.roaster_response)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">{language === 'ar' ? 'تاريخ الحصاد' : 'Harvest Date'}</p>
                      <p className="font-medium">
                        {format(new Date(offer.expected_harvest_date), 'PP', { locale: language === 'ar' ? ar : undefined })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">{language === 'ar' ? 'الكمية' : 'Quantity'}</p>
                      <p className="font-medium">{offer.quantity_kg} {language === 'ar' ? 'كجم' : 'kg'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">{language === 'ar' ? 'السعر/كجم' : 'Price/kg'}</span>
                    <span className="font-medium">{offer.price_per_kg} {offer.currency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">{language === 'ar' ? 'الإجمالي' : 'Total'}</span>
                    <span className="font-bold text-primary">
                      {(offer.quantity_kg * offer.price_per_kg).toLocaleString()} {offer.currency}
                    </span>
                  </div>
                </div>

                {offer.roaster_notes && (
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-sm font-medium mb-1">{language === 'ar' ? 'ملاحظات المحمصة:' : 'Roaster Notes:'}</p>
                    <p className="text-sm text-muted-foreground">{offer.roaster_notes}</p>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'تم الإنشاء:' : 'Created:'}{' '}
                  {format(new Date(offer.created_at), 'PPp', { locale: language === 'ar' ? ar : undefined })}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {offers.length === 0 && (
          <Card className="p-12 text-center">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {language === 'ar' ? 'لا توجد عروض' : 'No Offers Yet'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {language === 'ar' ? 'ابدأ بإنشاء عرض للمحامص' : 'Start by creating an offer for roasters'}
            </p>
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="h-4 w-4 ml-2" />
              {language === 'ar' ? 'إنشاء عرض' : 'Create Offer'}
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CreateHarvestOffer;
