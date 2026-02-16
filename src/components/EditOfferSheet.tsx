import { useState, useEffect } from "react";
import { Loader2, Tag, Percent, DollarSign, Calendar, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Offer {
  id: string;
  title: string;
  description: string | null;
  discount_percentage: number | null;
  discount_amount: number | null;
  min_quantity_kg: number | null;
  valid_until: string | null;
  terms_conditions: string | null;
  is_active: boolean;
  supplier_id: string;
}

interface EditOfferSheetProps {
  offer: Offer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const EditOfferSheet = ({ offer, open, onOpenChange, onSuccess }: EditOfferSheetProps) => {
  const { language, dir } = useLanguage();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "amount">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [minQuantity, setMinQuantity] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [termsConditions, setTermsConditions] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Populate form when offer changes
  useEffect(() => {
    if (offer) {
      setTitle(offer.title);
      setDescription(offer.description || "");
      setDiscountType(offer.discount_percentage ? "percentage" : "amount");
      setDiscountValue(
        offer.discount_percentage?.toString() || offer.discount_amount?.toString() || ""
      );
      setMinQuantity(offer.min_quantity_kg?.toString() || "");
      setValidUntil(offer.valid_until ? offer.valid_until.split('T')[0] : "");
      setTermsConditions(offer.terms_conditions || "");
      setIsActive(offer.is_active);
    }
  }, [offer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!offer || !title) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'يرجى ملء الحقول المطلوبة' : 'Please fill required fields',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('supplier_offers')
        .update({
          title,
          description: description || null,
          discount_percentage: discountType === 'percentage' ? Number(discountValue) : null,
          discount_amount: discountType === 'amount' ? Number(discountValue) : null,
          min_quantity_kg: minQuantity ? Number(minQuantity) : null,
          valid_until: validUntil || null,
          terms_conditions: termsConditions || null,
          is_active: isActive,
        })
        .eq('id', offer.id);

      if (error) throw error;

      toast({
        title: language === 'ar' ? 'تم التحديث' : 'Updated',
        description: language === 'ar' ? 'تم تحديث العرض بنجاح' : 'Offer updated successfully',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating offer:', error);
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل تحديث العرض' : 'Failed to update offer',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={dir === 'rtl' ? 'right' : 'left'} className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-coffee-gold" />
            {language === 'ar' ? 'تعديل العرض' : 'Edit Offer'}
          </SheetTitle>
          <SheetDescription>
            {language === 'ar' ? 'عدّل تفاصيل العرض' : 'Edit offer details'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          {/* Title */}
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'عنوان العرض *' : 'Offer Title *'}</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={language === 'ar' ? 'مثال: خصم نهاية العام' : 'e.g., End of Year Discount'}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'وصف العرض' : 'Offer Description'}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={language === 'ar' ? 'تفاصيل العرض...' : 'Offer details...'}
              rows={3}
            />
          </div>

          {/* Discount */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'نوع الخصم' : 'Discount Type'}</Label>
              <Select
                value={discountType}
                onValueChange={(v) => setDiscountType(v as "percentage" | "amount")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">
                    <span className="flex items-center gap-2">
                      <Percent className="w-4 h-4" />
                      {language === 'ar' ? 'نسبة مئوية' : 'Percentage'}
                    </span>
                  </SelectItem>
                  <SelectItem value="amount">
                    <span className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      {language === 'ar' ? 'مبلغ ثابت' : 'Fixed Amount'}
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>
                {discountType === 'percentage'
                  ? (language === 'ar' ? 'نسبة الخصم %' : 'Discount %')
                  : (language === 'ar' ? 'مبلغ الخصم (ر.س)' : 'Discount Amount (SAR)')}
              </Label>
              <Input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder={discountType === 'percentage' ? '10' : '50'}
              />
            </div>
          </div>

          {/* Min Quantity */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              {language === 'ar' ? 'الحد الأدنى للطلب (كغ)' : 'Minimum Order (kg)'}
            </Label>
            <Input
              type="number"
              value={minQuantity}
              onChange={(e) => setMinQuantity(e.target.value)}
              placeholder="50"
            />
          </div>

          {/* Valid Until */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {language === 'ar' ? 'صالح حتى' : 'Valid Until'}
            </Label>
            <Input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
          </div>

          {/* Terms */}
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'الشروط والأحكام' : 'Terms & Conditions'}</Label>
            <Textarea
              value={termsConditions}
              onChange={(e) => setTermsConditions(e.target.value)}
              placeholder={language === 'ar' ? 'شروط إضافية للعرض...' : 'Additional terms for the offer...'}
              rows={3}
            />
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div>
              <Label>{language === 'ar' ? 'تفعيل العرض' : 'Activate Offer'}</Label>
              <p className="text-sm text-muted-foreground">
                {language === 'ar'
                  ? 'العرض سيكون مرئياً للمحامص'
                  : 'Offer will be visible to roasters'}
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          {/* Submit */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              variant="coffee"
              className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                  {language === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
                </>
              ) : (
                language === 'ar' ? 'حفظ التغييرات' : 'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export default EditOfferSheet;
