import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CoffeeOffering {
  id: string;
  name: string;
  origin: string | null;
  region: string | null;
  process: string | null;
  price: number | null;
  currency: string | null;
  score: number | null;
  altitude: string | null;
  variety: string | null;
  flavor: string | null;
  available: boolean | null;
  created_at: string;
  total_quantity_kg?: number | null;
  sold_quantity_kg?: number | null;
  min_alert_quantity_kg?: number | null;
  warning_quantity_kg?: number | null;
  kg_per_bag?: number | null;
}

interface EditCoffeeSheetProps {
  coffee: CoffeeOffering | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (updated: CoffeeOffering) => void;
}

const EditCoffeeSheet = ({ coffee, open, onOpenChange, onSuccess }: EditCoffeeSheetProps) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: coffee?.name || "",
    origin: coffee?.origin || "",
    region: coffee?.region || "",
    process: coffee?.process || "",
    price: coffee?.price?.toString() || "",
    currency: coffee?.currency || "SAR",
    score: coffee?.score?.toString() || "",
    altitude: coffee?.altitude || "",
    variety: coffee?.variety || "",
    flavor: coffee?.flavor || "",
    available: coffee?.available ?? true,
  });

  // Update form data when coffee changes
  useState(() => {
    if (coffee) {
      setFormData({
        name: coffee.name || "",
        origin: coffee.origin || "",
        region: coffee.region || "",
        process: coffee.process || "",
        price: coffee.price?.toString() || "",
        currency: coffee.currency || "SAR",
        score: coffee.score?.toString() || "",
        altitude: coffee.altitude || "",
        variety: coffee.variety || "",
        flavor: coffee.flavor || "",
        available: coffee.available ?? true,
      });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coffee) return;

    setIsSaving(true);

    try {
      const updateData = {
        name: formData.name,
        origin: formData.origin || null,
        region: formData.region || null,
        process: formData.process || null,
        price: formData.price ? parseFloat(formData.price) : null,
        currency: formData.currency || "SAR",
        score: formData.score ? parseInt(formData.score) : null,
        altitude: formData.altitude || null,
        variety: formData.variety || null,
        flavor: formData.flavor || null,
        available: formData.available,
      };

      const { error } = await supabase
        .from("coffee_offerings")
        .update(updateData)
        .eq("id", coffee.id);

      if (error) {
        console.error("Update error:", error);
        toast({
          title: "خطأ",
          description: "فشل في تحديث بيانات المحصول",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "تم التحديث",
        description: "تم تحديث بيانات المحصول بنجاح",
      });

      onSuccess({ ...coffee, ...updateData, created_at: coffee.created_at });
      onOpenChange(false);
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto" dir="rtl">
        <SheetHeader>
          <SheetTitle className="text-right">تعديل المحصول</SheetTitle>
          <SheetDescription className="text-right">
            قم بتعديل بيانات المحصول
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">اسم المحصول</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              disabled={isSaving}
            />
          </div>

          {/* Origin & Region */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="origin">البلد</Label>
              <Input
                id="origin"
                value={formData.origin}
                onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                placeholder="إثيوبيا"
                disabled={isSaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="region">المنطقة</Label>
              <Input
                id="region"
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                placeholder="يرغاشيفي"
                disabled={isSaving}
              />
            </div>
          </div>

          {/* Process & Variety */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="process">المعالجة</Label>
              <Input
                id="process"
                value={formData.process}
                onChange={(e) => setFormData({ ...formData, process: e.target.value })}
                placeholder="مغسول"
                disabled={isSaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="variety">الصنف</Label>
              <Input
                id="variety"
                value={formData.variety}
                onChange={(e) => setFormData({ ...formData, variety: e.target.value })}
                placeholder="هيرلوم"
                disabled={isSaving}
              />
            </div>
          </div>

          {/* Price & Currency */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">السعر</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="150"
                disabled={isSaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">العملة</Label>
              <Input
                id="currency"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                placeholder="SAR"
                disabled={isSaving}
              />
            </div>
          </div>

          {/* Score & Altitude */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="score">الدرجة</Label>
              <Input
                id="score"
                type="number"
                min="0"
                max="100"
                value={formData.score}
                onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                placeholder="85"
                disabled={isSaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="altitude">الارتفاع</Label>
              <Input
                id="altitude"
                value={formData.altitude}
                onChange={(e) => setFormData({ ...formData, altitude: e.target.value })}
                placeholder="1800-2000m"
                disabled={isSaving}
              />
            </div>
          </div>

          {/* Flavor */}
          <div className="space-y-2">
            <Label htmlFor="flavor">النكهات</Label>
            <Textarea
              id="flavor"
              value={formData.flavor}
              onChange={(e) => setFormData({ ...formData, flavor: e.target.value })}
              placeholder="توت، ياسمين، شوكولاتة"
              rows={3}
              disabled={isSaving}
            />
          </div>

          {/* Available */}
          <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
            <Label htmlFor="available" className="cursor-pointer">متوفر للبيع</Label>
            <Switch
              id="available"
              checked={formData.available}
              onCheckedChange={(checked) => setFormData({ ...formData, available: checked })}
              disabled={isSaving}
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            variant="coffee"
            size="lg"
            className="w-full"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 ml-2" />
                حفظ التغييرات
              </>
            )}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export default EditCoffeeSheet;
