import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, Gavel, Loader2, Send, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Supplier {
  id: string;
  name: string;
}

interface Coffee {
  id: string;
  name: string;
  origin: string | null;
}

const CreateAuction = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [coffees, setCoffees] = useState<Coffee[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    title_ar: '',
    description: '',
    description_ar: '',
    starting_price: '',
    min_increment: '10',
    quantity_kg: '',
    coffee_id: '',
    start_time: '',
    end_time: '',
    currency: 'SAR'
  });

  useEffect(() => {
    if (user) {
      fetchSuppliers();
    }
  }, [user]);

  useEffect(() => {
    if (selectedSupplier) {
      fetchCoffees(selectedSupplier);
    }
  }, [selectedSupplier]);

  const fetchSuppliers = async () => {
    const { data, error } = await supabase
      .from('suppliers')
      .select('id, name')
      .eq('user_id', user?.id);
    
    if (!error && data) {
      setSuppliers(data);
      if (data.length === 1) {
        setSelectedSupplier(data[0].id);
      }
    }
  };

  const fetchCoffees = async (supplierId: string) => {
    const { data, error } = await supabase
      .from('coffee_offerings')
      .select('id, name, origin')
      .eq('supplier_id', supplierId)
      .eq('available', true);
    
    if (!error && data) {
      setCoffees(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSupplier || !formData.title || !formData.starting_price || !formData.quantity_kg || !formData.start_time || !formData.end_time) {
      toast.error(language === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('coffee_auctions')
        .insert({
          supplier_id: selectedSupplier,
          title: formData.title,
          title_ar: formData.title_ar || null,
          description: formData.description || null,
          description_ar: formData.description_ar || null,
          starting_price: parseFloat(formData.starting_price),
          current_price: parseFloat(formData.starting_price),
          min_increment: parseFloat(formData.min_increment) || 10,
          quantity_kg: parseFloat(formData.quantity_kg),
          coffee_id: formData.coffee_id || null,
          start_time: formData.start_time,
          end_time: formData.end_time,
          currency: formData.currency,
          status: 'upcoming',
          approval_status: 'pending'
        });

      if (error) throw error;

      toast.success(language === 'ar' ? 'تم إرسال طلب المزاد للموافقة' : 'Auction request submitted for approval');
      navigate('/supplier-dashboard');
    } catch (error) {
      console.error('Error creating auction:', error);
      toast.error(language === 'ar' ? 'فشل في إنشاء المزاد' : 'Failed to create auction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowRight className={`h-5 w-5 ${language === 'ar' ? '' : 'rotate-180'}`} />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Gavel className="h-8 w-8 text-primary" />
              {language === 'ar' ? 'إنشاء طلب مزاد جديد' : 'Create New Auction Request'}
            </h1>
            <p className="text-muted-foreground">
              {language === 'ar' ? 'سيتم مراجعة طلبك من قبل الإدارة' : 'Your request will be reviewed by admin'}
            </p>
          </div>
        </div>

        <Alert className="mb-6 bg-info/10 border-info/30">
          <Info className="h-4 w-4 text-info" />
          <AlertDescription className="text-info">
            {language === 'ar' 
              ? 'سيتم مراجعة طلب المزاد من قبل الإدارة قبل نشره. ستحصل المنصة على عمولة 5% من المبيعات.'
              : 'Your auction request will be reviewed by admin before publishing. Platform takes 5% commission on sales.'}
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>{language === 'ar' ? 'تفاصيل المزاد' : 'Auction Details'}</CardTitle>
            <CardDescription>
              {language === 'ar' ? 'أدخل معلومات المزاد المطلوبة' : 'Enter the required auction information'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Supplier Selection */}
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الشركة *' : 'Company *'}</Label>
                <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'ar' ? 'اختر الشركة' : 'Select company'} />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Title */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'العنوان (إنجليزي) *' : 'Title (English) *'}</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ethiopian Yirgacheffe Lot"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'العنوان (عربي)' : 'Title (Arabic)'}</Label>
                  <Input
                    value={formData.title_ar}
                    onChange={(e) => setFormData({ ...formData, title_ar: e.target.value })}
                    placeholder="قهوة إثيوبية يرغاتشيف"
                    dir="rtl"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'الوصف (إنجليزي)' : 'Description (English)'}</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Premium specialty coffee..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'الوصف (عربي)' : 'Description (Arabic)'}</Label>
                  <Textarea
                    value={formData.description_ar}
                    onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
                    placeholder="قهوة مختصة فاخرة..."
                    rows={3}
                    dir="rtl"
                  />
                </div>
              </div>

              {/* Coffee Selection */}
              {coffees.length > 0 && (
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'ربط بمنتج (اختياري)' : 'Link to Product (Optional)'}</Label>
                  <Select value={formData.coffee_id} onValueChange={(v) => setFormData({ ...formData, coffee_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'ar' ? 'اختر منتج' : 'Select product'} />
                    </SelectTrigger>
                    <SelectContent>
                      {coffees.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} {c.origin && `- ${c.origin}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Pricing */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'سعر البداية *' : 'Starting Price *'}</Label>
                  <Input
                    type="number"
                    value={formData.starting_price}
                    onChange={(e) => setFormData({ ...formData, starting_price: e.target.value })}
                    placeholder="1000"
                    required
                    min="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'أقل زيادة' : 'Min Increment'}</Label>
                  <Input
                    type="number"
                    value={formData.min_increment}
                    onChange={(e) => setFormData({ ...formData, min_increment: e.target.value })}
                    placeholder="10"
                    min="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'العملة' : 'Currency'}</Label>
                  <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SAR">SAR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Quantity */}
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الكمية (كجم) *' : 'Quantity (kg) *'}</Label>
                <Input
                  type="number"
                  value={formData.quantity_kg}
                  onChange={(e) => setFormData({ ...formData, quantity_kg: e.target.value })}
                  placeholder="100"
                  required
                  min="1"
                />
              </div>

              {/* Timing */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'وقت البدء *' : 'Start Time *'}</Label>
                  <Input
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'وقت الانتهاء *' : 'End Time *'}</Label>
                  <Input
                    type="datetime-local"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4 ml-2" />
                    {language === 'ar' ? 'إرسال طلب المزاد' : 'Submit Auction Request'}
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateAuction;
