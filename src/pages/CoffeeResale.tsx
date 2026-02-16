import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowRight, RefreshCw, Package, DollarSign, Plus, ShoppingCart, Calendar, Loader2, MessageCircle, FileText, Percent, AlertTriangle, PenTool, FileCheck, ImagePlus, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { SignaturePad } from '@/components/SignaturePad';

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
  approval_status?: string;
  created_at: string;
  seller_name?: string;
  platform_commission_rate?: number;
  contract_accepted?: boolean;
  images?: string[];
}

interface ResaleContract {
  id: string;
  contract_number: string;
  product_title: string;
  quantity_kg: number;
  total_amount: number;
  seller_signature: string | null;
  buyer_signature: string | null;
  status: string;
  created_at: string;
}

const CoffeeResale = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [listings, setListings] = useState<ResaleListing[]>([]);
  const [myListings, setMyListings] = useState<ResaleListing[]>([]);
  const [myContracts, setMyContracts] = useState<ResaleContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showContractDialog, setShowContractDialog] = useState(false);
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [selectedListing, setSelectedListing] = useState<ResaleListing | null>(null);
  const [selectedContract, setSelectedContract] = useState<ResaleContract | null>(null);
  const [contractAccepted, setContractAccepted] = useState(false);
  const [buyerSignature, setBuyerSignature] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [commissionRate, setCommissionRate] = useState('5');
  const [uploadingImages, setUploadingImages] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [imagePreviewIndex, setImagePreviewIndex] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    origin: '',
    process: '',
    quantity_kg: '',
    price_per_kg: '',
    roast_date: '',
    reason: ''
  });

  useEffect(() => {
    fetchListings();
    checkAdminStatus();
    fetchPlatformCommissionRate();
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    try {
      const { data } = await supabase
        .from('user_roles')
        .select('role, status')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .eq('status', 'approved')
        .single();
      
      setIsAdmin(!!data);
    } catch {
      setIsAdmin(false);
    }
  };

  const fetchPlatformCommissionRate = async () => {
    try {
      const { data } = await supabase
        .from('commission_settings')
        .select('roaster_rate')
        .limit(1)
        .single();
      
      if (data) {
        setCommissionRate(data.roaster_rate.toString());
      }
    } catch {
      // Use default 5%
      setCommissionRate('5');
    }
  };

  const fetchListings = async () => {
    try {
      // For marketplace, only show approved listings
      const { data: allListings, error: listingsError } = await supabase
        .from('coffee_resale')
        .select('*')
        .eq('status', 'available')
        .eq('approval_status', 'approved')
        .order('created_at', { ascending: false });

      if (listingsError) throw listingsError;

      const sellerIds = [...new Set((allListings || []).map(l => l.seller_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', sellerIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p.full_name]));

      const listingsWithSellers = (allListings || []).map(listing => ({
        ...listing,
        seller_name: profileMap.get(listing.seller_id) || (language === 'ar' ? 'محمصة' : 'Roaster')
      }));

      if (user) {
        // Fetch user's own listings (all statuses)
        const { data: myOwnListings } = await supabase
          .from('coffee_resale')
          .select('*')
          .eq('seller_id', user.id)
          .order('created_at', { ascending: false });

        const myListingsWithProfile = (myOwnListings || []).map(listing => ({
          ...listing,
          seller_name: profileMap.get(listing.seller_id) || (language === 'ar' ? 'محمصة' : 'Roaster')
        }));

        setMyListings(myListingsWithProfile);
        setListings(listingsWithSellers.filter(l => l.seller_id !== user.id));
        
        // Fetch user's contracts
        const { data: contracts } = await supabase
          .from('resale_contracts')
          .select('*')
          .or(`seller_id.eq.${user.id},buyer_id.eq.${user.id}`)
          .order('created_at', { ascending: false });
        
        setMyContracts(contracts || []);
      } else {
        setListings(listingsWithSellers);
      }
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files || e.target.files.length === 0) return;

    setUploadingImages(true);
    const newImages: string[] = [];

    try {
      for (const file of Array.from(e.target.files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('resale-images')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Use signed URL instead of public URL for security
        const { data: signedData, error: signedError } = await supabase.storage
          .from('resale-images')
          .createSignedUrl(fileName, 86400); // 24 hour expiry

        if (signedError || !signedData) {
          console.error('Error creating signed URL:', signedError);
          throw new Error('Failed to create signed URL');
        }

        newImages.push(signedData.signedUrl);
      }

      setSelectedImages(prev => [...prev, ...newImages]);
      toast.success(language === 'ar' ? 'تم رفع الصور بنجاح' : 'Images uploaded successfully');
    } catch (error) {
      console.error('Error uploading images:', error);
      toast.error(language === 'ar' ? 'فشل في رفع الصور' : 'Failed to upload images');
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!user) return;

    if (!formData.title || !formData.quantity_kg || !formData.price_per_kg) {
      toast.error(language === 'ar' ? 'يرجى ملء الحقول المطلوبة' : 'Please fill required fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('coffee_resale')
        .insert({
          seller_id: user.id,
          title: formData.title,
          description: formData.description || null,
          origin: formData.origin || null,
          process: formData.process || null,
          quantity_kg: parseFloat(formData.quantity_kg),
          price_per_kg: parseFloat(formData.price_per_kg),
          roast_date: formData.roast_date || null,
          reason: formData.reason || null,
          platform_commission_rate: parseFloat(commissionRate) || 5,
          images: selectedImages
        });

      if (error) throw error;

      toast.success(language === 'ar' ? 'تم نشر العرض بنجاح!' : 'Listing published successfully!');
      setShowDialog(false);
      setFormData({
        title: '',
        description: '',
        origin: '',
        process: '',
        quantity_kg: '',
        price_per_kg: '',
        roast_date: '',
        reason: ''
      });
      setSelectedImages([]);
      fetchListings();
    } catch (error) {
      console.error('Error creating listing:', error);
      toast.error(language === 'ar' ? 'فشل في نشر العرض' : 'Failed to publish listing');
    }
  };

  const openContractDialog = (listing: ResaleListing) => {
    setSelectedListing(listing);
    setContractAccepted(false);
    setShowContractDialog(true);
  };

  const calculateCommission = (listing: ResaleListing) => {
    const totalAmount = listing.quantity_kg * listing.price_per_kg;
    const rate = listing.platform_commission_rate || parseFloat(commissionRate) || 5;
    const commissionAmount = totalAmount * (rate / 100);
    const sellerReceives = totalAmount - commissionAmount;
    return { totalAmount, commissionRate: rate, commissionAmount, sellerReceives };
  };

  const handlePurchaseWithContract = async () => {
    if (!user || !selectedListing || !contractAccepted || !buyerSignature) return;

    setPurchasing(true);
    try {
      const { totalAmount, commissionRate: rate, commissionAmount, sellerReceives } = calculateCommission(selectedListing);

      // Create contract first
      const { data: contract, error: contractError } = await supabase
        .from('resale_contracts')
        .insert({
          resale_id: selectedListing.id,
          seller_id: selectedListing.seller_id,
          buyer_id: user.id,
          product_title: selectedListing.title,
          product_description: selectedListing.description,
          quantity_kg: selectedListing.quantity_kg,
          price_per_kg: selectedListing.price_per_kg,
          total_amount: totalAmount,
          commission_rate: rate,
          commission_amount: commissionAmount,
          seller_receives: sellerReceives,
          currency: selectedListing.currency,
          buyer_signature: buyerSignature,
          buyer_signed_at: new Date().toISOString(),
          status: 'pending_seller_signature'
        })
        .select()
        .single();

      if (contractError) throw contractError;

      // Update listing status
      const { error: updateError } = await supabase
        .from('coffee_resale')
        .update({ 
          status: 'pending_signature', 
          buyer_id: user.id,
          contract_accepted: true,
          contract_accepted_at: new Date().toISOString(),
          platform_commission_amount: commissionAmount
        })
        .eq('id', selectedListing.id);

      if (updateError) throw updateError;

      // Create commission record
      const { error: commissionError } = await supabase
        .from('resale_commissions')
        .insert({
          resale_id: selectedListing.id,
          seller_id: selectedListing.seller_id,
          buyer_id: user.id,
          total_amount: totalAmount,
          commission_rate: rate,
          commission_amount: commissionAmount,
          seller_receives: sellerReceives,
          status: 'pending'
        });

      if (commissionError) throw commissionError;

      toast.success(language === 'ar' ? 'تم توقيع العقد! في انتظار توقيع البائع.' : 'Contract signed! Waiting for seller signature.');
      setShowContractDialog(false);
      setSelectedListing(null);
      setBuyerSignature(null);
      setContractAccepted(false);
      fetchListings();
    } catch (error) {
      console.error('Error completing purchase:', error);
      toast.error(language === 'ar' ? 'فشل في إتمام الشراء' : 'Failed to complete purchase');
    } finally {
      setPurchasing(false);
    }
  };

  const handleSellerSign = async (signature: string) => {
    if (!selectedContract || !user) return;

    try {
      const { error } = await supabase
        .from('resale_contracts')
        .update({
          seller_signature: signature,
          seller_signed_at: new Date().toISOString(),
          status: 'completed'
        })
        .eq('id', selectedContract.id);

      if (error) throw error;

      // Update resale listing status
      const { error: resaleError } = await supabase
        .from('coffee_resale')
        .update({ status: 'sold' })
        .eq('id', (selectedContract as any).resale_id);

      if (resaleError) throw resaleError;

      toast.success(language === 'ar' ? 'تم توقيع العقد بنجاح! الصفقة مكتملة.' : 'Contract signed successfully! Deal completed.');
      setShowSignatureDialog(false);
      setSelectedContract(null);
      fetchListings();
    } catch (error) {
      console.error('Error signing contract:', error);
      toast.error(language === 'ar' ? 'فشل في توقيع العقد' : 'Failed to sign contract');
    }
  };

  const cancelListing = async (id: string) => {
    try {
      const { error } = await supabase
        .from('coffee_resale')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;

      toast.success(language === 'ar' ? 'تم إلغاء العرض' : 'Listing cancelled');
      fetchListings();
    } catch (error) {
      console.error('Error cancelling:', error);
    }
  };

  const renderListing = (listing: ResaleListing, isOwner: boolean = false) => {
    const { totalAmount, commissionRate, commissionAmount, sellerReceives } = calculateCommission(listing);
    const images = listing.images || [];
    
    return (
      <Card key={listing.id} className="overflow-hidden hover:shadow-lg transition-shadow">
        {/* Image Gallery */}
        {images.length > 0 && (
          <div className="relative h-48 bg-muted">
            <img
              src={images[imagePreviewIndex % images.length] || images[0]}
              alt={listing.title}
              className="w-full h-full object-cover"
            />
            {images.length > 1 && (
              <>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {images.map((_, idx) => (
                    <div
                      key={idx}
                      className={`w-2 h-2 rounded-full ${idx === (imagePreviewIndex % images.length) ? 'bg-primary' : 'bg-white/50'}`}
                    />
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    setImagePreviewIndex(prev => (prev - 1 + images.length) % images.length);
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    setImagePreviewIndex(prev => (prev + 1) % images.length);
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
            <Badge className="absolute top-2 right-2" variant="secondary">
              {images.length} {language === 'ar' ? 'صورة' : 'photos'}
            </Badge>
          </div>
        )}
        
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg">{listing.title}</CardTitle>
            <div className="flex flex-col gap-1 items-end">
              <Badge variant={listing.status === 'available' ? 'default' : 'secondary'}>
                {listing.status === 'available' 
                  ? (language === 'ar' ? 'متاح' : 'Available')
                  : (language === 'ar' ? 'محجوز' : 'Reserved')}
              </Badge>
              {isOwner && listing.approval_status && (
                <Badge variant={
                  listing.approval_status === 'approved' ? 'default' :
                  listing.approval_status === 'rejected' ? 'destructive' : 'outline'
                } className={listing.approval_status === 'approved' ? 'bg-green-600' : ''}>
                  {listing.approval_status === 'approved' 
                    ? (language === 'ar' ? 'موافق عليه' : 'Approved')
                    : listing.approval_status === 'rejected'
                    ? (language === 'ar' ? 'مرفوض' : 'Rejected')
                    : (language === 'ar' ? 'قيد المراجعة' : 'Pending Review')}
                </Badge>
              )}
            </div>
          </div>
          {!isOwner && (
            <p className="text-sm text-muted-foreground">
              {language === 'ar' ? 'البائع:' : 'Seller:'} {listing.seller_name}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {listing.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{listing.description}</p>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            {listing.origin && (
              <div>
                <span className="text-muted-foreground">{language === 'ar' ? 'المنشأ' : 'Origin'}</span>
                <p className="font-medium">{listing.origin}</p>
              </div>
            )}
            {listing.process && (
              <div>
                <span className="text-muted-foreground">{language === 'ar' ? 'المعالجة' : 'Process'}</span>
                <p className="font-medium">{listing.process}</p>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <div>
                <span className="text-muted-foreground">{language === 'ar' ? 'الكمية' : 'Quantity'}</span>
                <p className="font-medium">{listing.quantity_kg} {language === 'ar' ? 'كجم' : 'kg'}</p>
              </div>
            </div>
            {listing.roast_date && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="text-muted-foreground">{language === 'ar' ? 'تاريخ التحميص' : 'Roast Date'}</span>
                  <p className="font-medium">
                    {format(new Date(listing.roast_date), 'PP', { locale: language === 'ar' ? ar : undefined })}
                  </p>
                </div>
              </div>
            )}
          </div>

          {listing.reason && (
            <div className="bg-muted/50 rounded-lg p-2 text-sm">
              <span className="text-muted-foreground">{language === 'ar' ? 'سبب البيع:' : 'Reason:'}</span>
              <p>{listing.reason}</p>
            </div>
          )}

          {/* Commission Info */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Percent className="h-4 w-4" />
              {language === 'ar' ? 'عمولة المنصة:' : 'Platform Commission:'} {commissionRate}%
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>
                <span>{language === 'ar' ? 'الإجمالي:' : 'Total:'}</span>
                <p className="font-medium text-foreground">{totalAmount.toFixed(2)} {listing.currency}</p>
              </div>
              <div>
                <span>{language === 'ar' ? 'العمولة:' : 'Commission:'}</span>
                <p className="font-medium text-primary">{commissionAmount.toFixed(2)} {listing.currency}</p>
              </div>
            </div>
            {isOwner && (
              <div className="text-xs border-t pt-2">
                <span className="text-muted-foreground">{language === 'ar' ? 'ستحصل على:' : 'You will receive:'}</span>
                <p className="font-bold text-green-600">{sellerReceives.toFixed(2)} {listing.currency}</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-1 text-xl font-bold text-primary">
              <DollarSign className="h-5 w-5" />
              {listing.price_per_kg} {listing.currency}/{language === 'ar' ? 'كجم' : 'kg'}
            </div>
            
            {isOwner ? (
              <Button variant="destructive" size="sm" onClick={() => cancelListing(listing.id)}>
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <MessageCircle className="h-4 w-4 ml-1" />
                  {language === 'ar' ? 'تواصل' : 'Contact'}
                </Button>
                <Button size="sm" onClick={() => openContractDialog(listing)}>
                  <FileText className="h-4 w-4 ml-1" />
                  {language === 'ar' ? 'شراء' : 'Buy'}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
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
            <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
              <ArrowRight className={`h-5 w-5 ${language === 'ar' ? '' : 'rotate-180'}`} />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <RefreshCw className="h-8 w-8 text-primary" />
                {language === 'ar' ? 'سوق إعادة البيع' : 'Coffee Resale Market'}
              </h1>
              <p className="text-muted-foreground">
                {language === 'ar' ? 'بيع وشراء القهوة بين المحامص' : 'Buy and sell coffee between roasters'}
              </p>
            </div>
          </div>

          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 ml-2" />
                {language === 'ar' ? 'عرض جديد' : 'New Listing'}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{language === 'ar' ? 'إضافة عرض للبيع' : 'Create Resale Listing'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto">
                {/* Commission Rate - Display Only (Set by Admin) */}
                <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-primary font-medium">
                      {language === 'ar' ? 'نسبة عمولة المنصة' : 'Platform Commission Rate'}
                    </Label>
                    <Badge variant="secondary" className="text-lg font-bold">
                      {commissionRate}%
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {language === 'ar' 
                      ? 'هذه النسبة محددة من إدارة المنصة وسيتم خصمها من إجمالي المبيعات'
                      : 'This rate is set by platform admin and will be deducted from total sales'}
                  </p>
                </div>

                <div>
                  <Label>{language === 'ar' ? 'العنوان' : 'Title'} *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder={language === 'ar' ? 'مثال: إثيوبيا يرجاتشيف' : 'e.g., Ethiopia Yirgacheffe'}
                  />
                </div>

                <div>
                  <Label>{language === 'ar' ? 'الوصف' : 'Description'}</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder={language === 'ar' ? 'وصف القهوة...' : 'Describe the coffee...'}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{language === 'ar' ? 'المنشأ' : 'Origin'}</Label>
                    <Input
                      value={formData.origin}
                      onChange={(e) => setFormData(prev => ({ ...prev, origin: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>{language === 'ar' ? 'المعالجة' : 'Process'}</Label>
                    <Input
                      value={formData.process}
                      onChange={(e) => setFormData(prev => ({ ...prev, process: e.target.value }))}
                    />
                  </div>
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
                  <Label>{language === 'ar' ? 'تاريخ التحميص' : 'Roast Date'}</Label>
                  <Input
                    type="date"
                    value={formData.roast_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, roast_date: e.target.value }))}
                  />
                </div>

                <div>
                  <Label>{language === 'ar' ? 'سبب البيع' : 'Reason for Selling'}</Label>
                  <Input
                    value={formData.reason}
                    onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder={language === 'ar' ? 'مثال: فائض المخزون' : 'e.g., Excess inventory'}
                  />
                </div>

                {/* Image Upload Section */}
                <div className="space-y-3">
                  <Label>{language === 'ar' ? 'صور القهوة' : 'Coffee Images'}</Label>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                      disabled={uploadingImages}
                    />
                    <label
                      htmlFor="image-upload"
                      className="flex flex-col items-center justify-center cursor-pointer"
                    >
                      {uploadingImages ? (
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      ) : (
                        <ImagePlus className="h-8 w-8 text-muted-foreground" />
                      )}
                      <span className="text-sm text-muted-foreground mt-2">
                        {uploadingImages 
                          ? (language === 'ar' ? 'جاري الرفع...' : 'Uploading...')
                          : (language === 'ar' ? 'اضغط لرفع الصور' : 'Click to upload images')}
                      </span>
                    </label>
                  </div>

                  {/* Image Preview Grid */}
                  {selectedImages.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {selectedImages.map((url, idx) => (
                        <div key={idx} className="relative aspect-square rounded-lg overflow-hidden group">
                          <img src={url} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeImage(idx)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Button onClick={handleSubmit} className="w-full">
                  {language === 'ar' ? 'نشر العرض' : 'Publish Listing'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="marketplace" className="space-y-6">
          <TabsList>
            <TabsTrigger value="marketplace">
              <ShoppingCart className="h-4 w-4 ml-2" />
              {language === 'ar' ? 'السوق' : 'Marketplace'}
              {listings.length > 0 && <Badge className="mr-2" variant="secondary">{listings.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="my-listings">
              <Package className="h-4 w-4 ml-2" />
              {language === 'ar' ? 'عروضي' : 'My Listings'}
              {myListings.length > 0 && <Badge className="mr-2" variant="secondary">{myListings.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="my-contracts">
              <FileCheck className="h-4 w-4 ml-2" />
              {language === 'ar' ? 'عقودي' : 'My Contracts'}
              {myContracts.length > 0 && <Badge className="mr-2" variant="secondary">{myContracts.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="marketplace">
            {listings.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {listings.map(listing => renderListing(listing))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  {language === 'ar' ? 'لا توجد عروض متاحة' : 'No Listings Available'}
                </h3>
                <p className="text-muted-foreground">
                  {language === 'ar' ? 'كن أول من يعرض قهوة للبيع!' : 'Be the first to list coffee for sale!'}
                </p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="my-listings">
            {myListings.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {myListings.map(listing => renderListing(listing, true))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  {language === 'ar' ? 'لا توجد عروض' : 'No Listings'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {language === 'ar' ? 'أنشئ عرضاً لبيع فائض قهوتك' : 'Create a listing to sell your excess coffee'}
                </p>
                <Button onClick={() => setShowDialog(true)}>
                  <Plus className="h-4 w-4 ml-2" />
                  {language === 'ar' ? 'إنشاء عرض' : 'Create Listing'}
                </Button>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="my-contracts">
            {myContracts.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {myContracts.map(contract => (
                  <Card key={contract.id} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">{contract.product_title}</CardTitle>
                        <Badge variant={
                          contract.status === 'completed' ? 'default' :
                          contract.status === 'pending_seller_signature' ? 'secondary' : 'outline'
                        }>
                          {contract.status === 'completed' 
                            ? (language === 'ar' ? 'مكتمل' : 'Completed')
                            : contract.status === 'pending_seller_signature'
                            ? (language === 'ar' ? 'بانتظار توقيع البائع' : 'Pending Seller')
                            : (language === 'ar' ? 'قيد الانتظار' : 'Pending')}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground font-mono">{contract.contract_number}</p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">{language === 'ar' ? 'الكمية' : 'Quantity'}</span>
                          <p className="font-medium">{contract.quantity_kg} {language === 'ar' ? 'كجم' : 'kg'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{language === 'ar' ? 'الإجمالي' : 'Total'}</span>
                          <p className="font-medium">{contract.total_amount} SAR</p>
                        </div>
                      </div>

                      <div className="flex gap-2 text-xs">
                        <div className={`flex items-center gap-1 px-2 py-1 rounded ${contract.buyer_signature ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          <PenTool className="h-3 w-3" />
                          {language === 'ar' ? 'توقيع المشتري' : 'Buyer'}
                          {contract.buyer_signature && ' ✓'}
                        </div>
                        <div className={`flex items-center gap-1 px-2 py-1 rounded ${contract.seller_signature ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          <PenTool className="h-3 w-3" />
                          {language === 'ar' ? 'توقيع البائع' : 'Seller'}
                          {contract.seller_signature && ' ✓'}
                        </div>
                      </div>

                      {/* Show sign button for seller if pending */}
                      {contract.status === 'pending_seller_signature' && user?.id === (contract as any).seller_id && (
                        <Button 
                          size="sm" 
                          className="w-full"
                          onClick={() => {
                            setSelectedContract(contract);
                            setShowSignatureDialog(true);
                          }}
                        >
                          <PenTool className="h-4 w-4 ml-2" />
                          {language === 'ar' ? 'توقيع العقد' : 'Sign Contract'}
                        </Button>
                      )}

                      <p className="text-xs text-muted-foreground">
                        {format(new Date(contract.created_at), 'PPp', { locale: language === 'ar' ? ar : undefined })}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <FileCheck className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  {language === 'ar' ? 'لا توجد عقود' : 'No Contracts'}
                </h3>
                <p className="text-muted-foreground">
                  {language === 'ar' ? 'ستظهر هنا العقود عند إتمام عمليات الشراء' : 'Contracts will appear here after purchases'}
                </p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Contract Dialog */}
      <Dialog open={showContractDialog} onOpenChange={setShowContractDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {language === 'ar' ? 'عقد البيع والشراء' : 'Sale Contract'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedListing && (
            <div className="space-y-6">
              {/* Contract Terms */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-4 text-sm">
                <h3 className="font-bold text-lg border-b pb-2">
                  {language === 'ar' ? 'شروط وأحكام البيع' : 'Terms and Conditions'}
                </h3>
                
                <div className="space-y-3">
                  <p className="font-medium">
                    {language === 'ar' ? '1. تفاصيل الصفقة:' : '1. Transaction Details:'}
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground mr-4">
                    <li>{language === 'ar' ? `المنتج: ${selectedListing.title}` : `Product: ${selectedListing.title}`}</li>
                    <li>{language === 'ar' ? `الكمية: ${selectedListing.quantity_kg} كجم` : `Quantity: ${selectedListing.quantity_kg} kg`}</li>
                    <li>{language === 'ar' ? `السعر للكيلو: ${selectedListing.price_per_kg} ${selectedListing.currency}` : `Price per kg: ${selectedListing.price_per_kg} ${selectedListing.currency}`}</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <p className="font-medium">
                    {language === 'ar' ? '2. العمولة والرسوم:' : '2. Commission and Fees:'}
                  </p>
                  <div className="bg-background rounded-lg p-3 border">
                    {(() => {
                      const { totalAmount, commissionRate, commissionAmount, sellerReceives } = calculateCommission(selectedListing);
                      return (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <span className="text-muted-foreground">{language === 'ar' ? 'إجمالي المبلغ:' : 'Total Amount:'}</span>
                            <p className="font-bold text-lg">{totalAmount.toFixed(2)} {selectedListing.currency}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{language === 'ar' ? `عمولة المنصة (${commissionRate}%):` : `Platform Fee (${commissionRate}%):`}</span>
                            <p className="font-bold text-lg text-primary">{commissionAmount.toFixed(2)} {selectedListing.currency}</p>
                          </div>
                          <div className="col-span-2 border-t pt-2">
                            <span className="text-muted-foreground">{language === 'ar' ? 'المبلغ الصافي للبائع:' : 'Seller Net Amount:'}</span>
                            <p className="font-bold text-lg text-green-600">{sellerReceives.toFixed(2)} {selectedListing.currency}</p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="font-medium text-destructive">
                    {language === 'ar' ? '3. إخلاء مسؤولية المنصة (هام جداً):' : '3. Platform Disclaimer (Very Important):'}
                  </p>
                  <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground mr-4">
                      <li className="font-medium text-foreground">
                        {language === 'ar' 
                          ? 'المنصة هي منصة عرض وطلب فقط وليست طرفاً في أي صفقة'
                          : 'The platform is only a display and request platform and is not a party to any transaction'}
                      </li>
                      <li>
                        {language === 'ar' 
                          ? 'المنصة غير مسؤولة عن جودة المنتج أو مطابقته للمواصفات'
                          : 'Platform is NOT responsible for product quality or specifications'}
                      </li>
                      <li>
                        {language === 'ar' 
                          ? 'المنصة غير مسؤولة عن الشحن أو التوصيل أو أي تأخير'
                          : 'Platform is NOT responsible for shipping, delivery, or any delays'}
                      </li>
                      <li>
                        {language === 'ar' 
                          ? 'المنصة غير مسؤولة عن أي خلاف أو نزاع بين البائع والمشتري'
                          : 'Platform is NOT responsible for any dispute between seller and buyer'}
                      </li>
                      <li>
                        {language === 'ar' 
                          ? 'المنصة غير مسؤولة عن أي ضرر أو خسارة ناتجة عن الصفقة'
                          : 'Platform is NOT responsible for any damage or loss resulting from the transaction'}
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="font-medium">
                    {language === 'ar' ? '4. الالتزامات القانونية:' : '4. Legal Obligations:'}
                  </p>
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground mr-4">
                      <li className="font-medium text-foreground">
                        {language === 'ar' 
                          ? 'جميع الالتزامات القانونية تكون بين البائع والمشتري فقط'
                          : 'All legal obligations are ONLY between the seller and buyer'}
                      </li>
                      <li>
                        {language === 'ar' 
                          ? 'البائع مسؤول مسؤولية كاملة عن صحة البيانات المعروضة'
                          : 'Seller is fully responsible for the accuracy of displayed data'}
                      </li>
                      <li>
                        {language === 'ar' 
                          ? 'المشتري مسؤول عن التحقق من المنتج قبل إتمام الشراء'
                          : 'Buyer is responsible for verifying the product before completing purchase'}
                      </li>
                      <li>
                        {language === 'ar' 
                          ? 'أي نزاع قانوني يتم حله مباشرة بين البائع والمشتري'
                          : 'Any legal dispute is resolved directly between seller and buyer'}
                      </li>
                      <li>
                        {language === 'ar' 
                          ? 'المنصة تحتفظ بحق إلغاء أي عرض يخالف الشروط'
                          : 'Platform reserves the right to cancel any listing that violates terms'}
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="font-medium">
                    {language === 'ar' ? '5. العمولة:' : '5. Commission:'}
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground mr-4">
                    <li>{language === 'ar' ? 'العمولة تُخصم تلقائياً عند إتمام الصفقة' : 'Commission is automatically deducted upon transaction completion'}</li>
                    <li>{language === 'ar' ? 'العمولة غير قابلة للاسترداد بعد إتمام الصفقة' : 'Commission is non-refundable after transaction completion'}</li>
                  </ul>
                </div>
              </div>

              {/* Accept Contract Checkbox */}
              <div className="flex items-start gap-3 p-4 border-2 border-destructive/50 rounded-lg bg-destructive/5">
                <Checkbox
                  id="contract-accept"
                  checked={contractAccepted}
                  onCheckedChange={(checked) => setContractAccepted(checked as boolean)}
                />
                <label htmlFor="contract-accept" className="text-sm cursor-pointer leading-relaxed font-medium">
                  {language === 'ar' 
                    ? 'أقر بأنني قرأت وفهمت جميع الشروط والأحكام، وأوافق على أن المنصة هي منصة عرض وطلب فقط، وأن جميع الالتزامات القانونية تكون بيني وبين الطرف الآخر مباشرة، وأن المنصة غير مسؤولة عن أي جودة أو شحن أو خلاف.'
                    : 'I acknowledge that I have read and understood all terms and conditions, agree that the platform is only a display and request platform, all legal obligations are directly between me and the other party, and the platform is NOT responsible for any quality, shipping, or disputes.'}
                </label>
              </div>

              {/* Buyer Signature */}
              {contractAccepted && (
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <PenTool className="h-4 w-4" />
                    {language === 'ar' ? 'توقيعك الإلكتروني' : 'Your Electronic Signature'}
                  </Label>
                  {buyerSignature ? (
                    <div className="border rounded-lg p-3 bg-background">
                      <img src={buyerSignature} alt="Signature" className="h-20 mx-auto" />
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full mt-2"
                        onClick={() => setBuyerSignature(null)}
                      >
                        {language === 'ar' ? 'تغيير التوقيع' : 'Change Signature'}
                      </Button>
                    </div>
                  ) : (
                    <SignaturePad
                      onSave={(sig) => setBuyerSignature(sig)}
                      onCancel={() => setContractAccepted(false)}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => {
              setShowContractDialog(false);
              setBuyerSignature(null);
              setContractAccepted(false);
            }}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button 
              onClick={handlePurchaseWithContract} 
              disabled={!contractAccepted || !buyerSignature || purchasing}
            >
              {purchasing ? (
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
              ) : (
                <PenTool className="h-4 w-4 ml-2" />
              )}
              {language === 'ar' ? 'توقيع وإتمام الشراء' : 'Sign & Purchase'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Seller Signature Dialog */}
      <Dialog open={showSignatureDialog} onOpenChange={setShowSignatureDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenTool className="h-5 w-5" />
              {language === 'ar' ? 'توقيع العقد كبائع' : 'Sign Contract as Seller'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedContract && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p><strong>{language === 'ar' ? 'رقم العقد:' : 'Contract:'}</strong> {selectedContract.contract_number}</p>
                <p><strong>{language === 'ar' ? 'المنتج:' : 'Product:'}</strong> {selectedContract.product_title}</p>
                <p><strong>{language === 'ar' ? 'الإجمالي:' : 'Total:'}</strong> {selectedContract.total_amount} SAR</p>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm">
                <p className="font-medium text-amber-600">
                  {language === 'ar' 
                    ? 'بتوقيعك أدناه، أنت توافق على شروط العقد وتلتزم بتسليم المنتج للمشتري.'
                    : 'By signing below, you agree to the contract terms and commit to delivering the product to the buyer.'}
                </p>
              </div>

              <SignaturePad
                onSave={handleSellerSign}
                onCancel={() => {
                  setShowSignatureDialog(false);
                  setSelectedContract(null);
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CoffeeResale;
