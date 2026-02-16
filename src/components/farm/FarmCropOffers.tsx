import { useState, useEffect } from "react";
import {
  Leaf, Plus, Package, Calendar, DollarSign, Edit, Trash2, Eye,
  Loader2, MapPin, Beaker
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CropOffer {
  id: string;
  crop_name: string;
  crop_name_ar: string | null;
  variety: string | null;
  quantity_kg: number;
  price_per_kg: number | null;
  currency: string;
  harvest_date: string | null;
  description: string | null;
  altitude: string | null;
  processing_method: string | null;
  status: string;
  created_at: string;
}

const FarmCropOffers = () => {
  const { user } = useAuth();
  const { language, dir } = useLanguage();
  const isRtl = dir === 'rtl';

  const [offers, setOffers] = useState<CropOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newOffer, setNewOffer] = useState({
    crop_name: '',
    crop_name_ar: '',
    variety: '',
    quantity_kg: '',
    price_per_kg: '',
    harvest_date: '',
    description: '',
    altitude: '',
    processing_method: 'washed'
  });

  useEffect(() => {
    if (user) fetchOffers();
  }, [user]);

  const fetchOffers = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('farm_crop_offers')
        .select('*')
        .eq('farm_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOffers(data || []);
    } catch (error) {
      console.error('Error fetching offers:', error);
    } finally {
      setLoading(false);
    }
  };

  const createOffer = async () => {
    if (!user || !newOffer.crop_name || !newOffer.quantity_kg) {
      toast.error(language === 'ar' ? 'يرجى ملء الحقول المطلوبة' : 'Please fill required fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('farm_crop_offers')
        .insert({
          farm_id: user.id,
          crop_name: newOffer.crop_name,
          crop_name_ar: newOffer.crop_name_ar || null,
          variety: newOffer.variety || null,
          quantity_kg: parseFloat(newOffer.quantity_kg),
          price_per_kg: newOffer.price_per_kg ? parseFloat(newOffer.price_per_kg) : null,
          harvest_date: newOffer.harvest_date || null,
          description: newOffer.description || null,
          altitude: newOffer.altitude || null,
          processing_method: newOffer.processing_method || null,
        });

      if (error) throw error;

      toast.success(language === 'ar' ? 'تم إضافة العرض بنجاح' : 'Offer created successfully');
      setDialogOpen(false);
      setNewOffer({
        crop_name: '', crop_name_ar: '', variety: '', quantity_kg: '',
        price_per_kg: '', harvest_date: '', description: '', altitude: '', processing_method: 'washed'
      });
      fetchOffers();
    } catch (error) {
      console.error('Error creating offer:', error);
      toast.error(language === 'ar' ? 'فشل إنشاء العرض' : 'Failed to create offer');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; labelAr: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      available: { label: 'Available', labelAr: 'متاح', variant: 'default' },
      reserved: { label: 'Reserved', labelAr: 'محجوز', variant: 'secondary' },
      sold: { label: 'Sold', labelAr: 'مباع', variant: 'outline' },
      expired: { label: 'Expired', labelAr: 'منتهي', variant: 'destructive' },
    };
    const s = statusMap[status] || statusMap.available;
    return <Badge variant={s.variant}>{language === 'ar' ? s.labelAr : s.label}</Badge>;
  };

  const getProcessLabel = (process: string | null) => {
    if (!process) return '';
    const processMap: Record<string, { en: string; ar: string }> = {
      washed: { en: 'Washed', ar: 'مغسول' },
      natural: { en: 'Natural', ar: 'طبيعي' },
      honey: { en: 'Honey', ar: 'عسلي' },
      anaerobic: { en: 'Anaerobic', ar: 'لاهوائي' },
    };
    const p = processMap[process];
    return p ? (language === 'ar' ? p.ar : p.en) : process;
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
            <Leaf className="w-6 h-6 text-primary" />
            {language === 'ar' ? 'عروض المحاصيل' : 'Crop Offers'}
          </h2>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'عرض محاصيلك للموردين والمحامص' : 'Offer your crops to suppliers and roasters'}
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className={`w-4 h-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
              {language === 'ar' ? 'إضافة عرض' : 'Add Offer'}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {language === 'ar' ? 'عرض محصول جديد' : 'New Crop Offer'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'اسم المحصول (إنجليزي)' : 'Crop Name (EN)'} *</Label>
                  <Input
                    value={newOffer.crop_name}
                    onChange={(e) => setNewOffer({ ...newOffer, crop_name: e.target.value })}
                    placeholder="Arabica"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'اسم المحصول (عربي)' : 'Crop Name (AR)'}</Label>
                  <Input
                    value={newOffer.crop_name_ar}
                    onChange={(e) => setNewOffer({ ...newOffer, crop_name_ar: e.target.value })}
                    placeholder="أرابيكا"
                    dir="rtl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'الصنف' : 'Variety'}</Label>
                  <Input
                    value={newOffer.variety}
                    onChange={(e) => setNewOffer({ ...newOffer, variety: e.target.value })}
                    placeholder="Bourbon, Typica..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'طريقة المعالجة' : 'Processing'}</Label>
                  <Select
                    value={newOffer.processing_method}
                    onValueChange={(v) => setNewOffer({ ...newOffer, processing_method: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="washed">{language === 'ar' ? 'مغسول' : 'Washed'}</SelectItem>
                      <SelectItem value="natural">{language === 'ar' ? 'طبيعي' : 'Natural'}</SelectItem>
                      <SelectItem value="honey">{language === 'ar' ? 'عسلي' : 'Honey'}</SelectItem>
                      <SelectItem value="anaerobic">{language === 'ar' ? 'لاهوائي' : 'Anaerobic'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'الكمية (كجم)' : 'Quantity (kg)'} *</Label>
                  <Input
                    type="number"
                    value={newOffer.quantity_kg}
                    onChange={(e) => setNewOffer({ ...newOffer, quantity_kg: e.target.value })}
                    placeholder="1000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'السعر/كجم' : 'Price/kg'}</Label>
                  <Input
                    type="number"
                    value={newOffer.price_per_kg}
                    onChange={(e) => setNewOffer({ ...newOffer, price_per_kg: e.target.value })}
                    placeholder="50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'تاريخ الحصاد' : 'Harvest Date'}</Label>
                  <Input
                    type="date"
                    value={newOffer.harvest_date}
                    onChange={(e) => setNewOffer({ ...newOffer, harvest_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'الارتفاع' : 'Altitude'}</Label>
                  <Input
                    value={newOffer.altitude}
                    onChange={(e) => setNewOffer({ ...newOffer, altitude: e.target.value })}
                    placeholder="1800m"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الوصف' : 'Description'}</Label>
                <Textarea
                  value={newOffer.description}
                  onChange={(e) => setNewOffer({ ...newOffer, description: e.target.value })}
                  placeholder={language === 'ar' ? 'وصف المحصول...' : 'Describe your crop...'}
                  rows={3}
                />
              </div>

              <Button onClick={createOffer} className="w-full">
                {language === 'ar' ? 'نشر العرض' : 'Publish Offer'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Offers Grid */}
      {offers.length === 0 ? (
        <Card className="py-12 text-center">
          <CardContent>
            <Leaf className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {language === 'ar' ? 'لا توجد عروض محاصيل' : 'No Crop Offers'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {language === 'ar' ? 'ابدأ بإضافة محاصيلك للبيع' : 'Start by adding your crops for sale'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {offers.map((offer) => (
            <Card key={offer.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {language === 'ar' && offer.crop_name_ar ? offer.crop_name_ar : offer.crop_name}
                    </CardTitle>
                    {offer.variety && (
                      <CardDescription>{offer.variety}</CardDescription>
                    )}
                  </div>
                  {getStatusBadge(offer.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Package className="w-4 h-4" />
                    {language === 'ar' ? 'الكمية' : 'Quantity'}
                  </span>
                  <span className="font-semibold">{offer.quantity_kg} kg</span>
                </div>

                {offer.price_per_kg && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <DollarSign className="w-4 h-4" />
                      {language === 'ar' ? 'السعر' : 'Price'}
                    </span>
                    <span className="font-semibold text-primary">
                      {offer.price_per_kg} {offer.currency}/kg
                    </span>
                  </div>
                )}

                {offer.harvest_date && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {language === 'ar' ? 'الحصاد' : 'Harvest'}
                    </span>
                    <span>{new Date(offer.harvest_date).toLocaleDateString()}</span>
                  </div>
                )}

                {offer.processing_method && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Beaker className="w-4 h-4" />
                      {language === 'ar' ? 'المعالجة' : 'Process'}
                    </span>
                    <Badge variant="outline">{getProcessLabel(offer.processing_method)}</Badge>
                  </div>
                )}

                {offer.altitude && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      {language === 'ar' ? 'الارتفاع' : 'Altitude'}
                    </span>
                    <span>{offer.altitude}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default FarmCropOffers;
