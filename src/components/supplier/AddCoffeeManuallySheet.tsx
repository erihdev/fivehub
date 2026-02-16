import { useState, useEffect } from "react";
import { Loader2, Plus, Coffee, Package, Scale } from "lucide-react";
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
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/use-toast";

interface Supplier {
  id: string;
  name: string;
}

interface AddCoffeeManuallySheetProps {
  onSuccess?: () => void;
}

const AddCoffeeManuallySheet = ({ onSuccess }: AddCoffeeManuallySheetProps) => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    supplier_id: "",
    name: "",
    origin: "",
    region: "",
    process: "",
    altitude: "",
    variety: "",
    flavor: "",
    price: "",
    currency: "SAR",
    score: "",
    available: true,
    unit_type: "kg" as "kg" | "bag",
    kg_per_bag: "",
    total_quantity_kg: "",
    min_alert_quantity_kg: "10",
    warning_quantity_kg: "20",
  });

  const isArabic = language === "ar";

  useEffect(() => {
    const fetchSupplier = async () => {
      if (!user) return;
      setLoadingSuppliers(true);
      try {
        const { data } = await supabase
          .from("suppliers")
          .select("id, name")
          .eq("user_id", user.id)
          .single();
        if (data) {
          setSuppliers([data]);
          setFormData(prev => ({ ...prev, supplier_id: data.id }));
        }
      } catch (error) {
        console.error("Error fetching supplier:", error);
      } finally {
        setLoadingSuppliers(false);
      }
    };

    if (isOpen) {
      fetchSupplier();
    }
  }, [user, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log("Form submitted, formData:", formData);
    console.log("Suppliers:", suppliers);
    
    if (!formData.supplier_id) {
      console.log("No supplier_id found");
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "يرجى اختيار المورد" : "Please select a supplier",
        variant: "destructive",
      });
      return;
    }

    if (!formData.name.trim()) {
      console.log("No name found");
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "يرجى إدخال اسم المحصول" : "Please enter crop name",
        variant: "destructive",
      });
      return;
    }

    console.log("Starting insert...");
    setIsLoading(true);
    try {
      const { error } = await supabase.from("coffee_offerings").insert({
        supplier_id: formData.supplier_id,
        name: formData.name.trim(),
        origin: formData.origin.trim() || null,
        region: formData.region.trim() || null,
        process: formData.process.trim() || null,
        altitude: formData.altitude.trim() || null,
        variety: formData.variety.trim() || null,
        flavor: formData.flavor.trim() || null,
        price: formData.price ? parseFloat(formData.price) : null,
        currency: formData.currency,
        score: formData.score ? parseInt(formData.score) : null,
        available: formData.available,
        unit_type: formData.unit_type,
        kg_per_bag: formData.unit_type === 'bag' && formData.kg_per_bag ? parseFloat(formData.kg_per_bag) : null,
        total_quantity_kg: formData.total_quantity_kg ? parseFloat(formData.total_quantity_kg) : 0,
        sold_quantity_kg: 0,
        min_alert_quantity_kg: formData.min_alert_quantity_kg ? parseFloat(formData.min_alert_quantity_kg) : 10,
        warning_quantity_kg: formData.warning_quantity_kg ? parseFloat(formData.warning_quantity_kg) : 20,
      });

      if (error) throw error;

      toast({
        title: isArabic ? "تمت الإضافة" : "Added Successfully",
        description: isArabic ? "تم إضافة المحصول بنجاح" : "Crop added successfully",
      });

      // Reset form
      setFormData({
        supplier_id: suppliers.length === 1 ? suppliers[0].id : "",
        name: "",
        origin: "",
        region: "",
        process: "",
        altitude: "",
        variety: "",
        flavor: "",
        price: "",
        currency: "SAR",
        score: "",
        available: true,
        unit_type: "kg",
        kg_per_bag: "",
        total_quantity_kg: "",
        min_alert_quantity_kg: "10",
        warning_quantity_kg: "20",
      });

      setIsOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error adding coffee:", error);
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "فشل إضافة المحصول" : "Failed to add crop",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="coffee">
          <Plus className="w-4 h-4 ml-2" />
          {isArabic ? "إضافة محصول يدوياً" : "Add Crop Manually"}
        </Button>
      </SheetTrigger>
      <SheetContent side={isArabic ? "right" : "left"} className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Coffee className="w-5 h-5" />
            {isArabic ? "إضافة محصول جديد" : "Add New Crop"}
          </SheetTitle>
          <SheetDescription>
            {isArabic
              ? "أدخل بيانات المحصول يدوياً"
              : "Enter crop details manually"}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          {/* Name */}
          <div className="space-y-2">
            <Label>{isArabic ? "اسم المحصول *" : "Crop Name *"}</Label>
            <Input
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder={isArabic ? "مثال: إثيوبيا يرغاتشيفي" : "e.g., Ethiopia Yirgacheffe"}
              required
            />
          </div>

          {/* Origin & Region */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{isArabic ? "بلد المنشأ" : "Origin Country"}</Label>
              <Input
                value={formData.origin}
                onChange={(e) => handleChange("origin", e.target.value)}
                placeholder={isArabic ? "إثيوبيا" : "Ethiopia"}
              />
            </div>
            <div className="space-y-2">
              <Label>{isArabic ? "المنطقة" : "Region"}</Label>
              <Input
                value={formData.region}
                onChange={(e) => handleChange("region", e.target.value)}
                placeholder={isArabic ? "يرغاتشيفي" : "Yirgacheffe"}
              />
            </div>
          </div>

          {/* Process & Variety */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{isArabic ? "طريقة المعالجة" : "Process"}</Label>
              <Input
                value={formData.process}
                onChange={(e) => handleChange("process", e.target.value)}
                placeholder={isArabic ? "مغسول / طبيعي" : "Washed / Natural"}
              />
            </div>
            <div className="space-y-2">
              <Label>{isArabic ? "الصنف" : "Variety"}</Label>
              <Input
                value={formData.variety}
                onChange={(e) => handleChange("variety", e.target.value)}
                placeholder={isArabic ? "هيرلوم" : "Heirloom"}
              />
            </div>
          </div>

          {/* Altitude */}
          <div className="space-y-2">
            <Label>{isArabic ? "الارتفاع" : "Altitude"}</Label>
            <Input
              value={formData.altitude}
              onChange={(e) => handleChange("altitude", e.target.value)}
              placeholder={isArabic ? "1900-2200 متر" : "1900-2200 masl"}
            />
          </div>

          {/* Flavor */}
          <div className="space-y-2">
            <Label>{isArabic ? "ملاحظات النكهة" : "Flavor Notes"}</Label>
            <Textarea
              value={formData.flavor}
              onChange={(e) => handleChange("flavor", e.target.value)}
              placeholder={isArabic ? "توت، ياسمين، حمضيات" : "Berry, Jasmine, Citrus"}
              rows={2}
            />
          </div>

          {/* Unit Type Selection */}
          <div className="space-y-2">
            <Label>{isArabic ? "وحدة البيع" : "Selling Unit"}</Label>
            <Select
              value={formData.unit_type}
              onValueChange={(value) => handleChange("unit_type", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kg">
                  <div className="flex items-center gap-2">
                    <Scale className="h-4 w-4" />
                    {isArabic ? "كيلوجرام" : "Kilogram"}
                  </div>
                </SelectItem>
                <SelectItem value="bag">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    {isArabic ? "خيشة (كيس)" : "Bag (Sack)"}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Kg per Bag - only show when bag is selected */}
          {formData.unit_type === 'bag' && (
            <div className="space-y-2">
              <Label>{isArabic ? "عدد الكيلوات في الخيشة" : "Kilograms per Bag"}</Label>
              <Input
                type="number"
                step="0.1"
                min="1"
                value={formData.kg_per_bag}
                onChange={(e) => handleChange("kg_per_bag", e.target.value)}
                placeholder={isArabic ? "مثال: 60" : "e.g., 60"}
              />
            </div>
          )}

          {/* Price & Currency */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                {formData.unit_type === 'bag' 
                  ? (isArabic ? "السعر (للخيشة)" : "Price (per bag)")
                  : (isArabic ? "السعر (للكيلو)" : "Price (per kg)")}
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => handleChange("price", e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>{isArabic ? "العملة" : "Currency"}</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => handleChange("currency", value)}
              >
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

          {/* Score */}
          <div className="space-y-2">
            <Label>{isArabic ? "التقييم (SCA)" : "Score (SCA)"}</Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={formData.score}
              onChange={(e) => handleChange("score", e.target.value)}
              placeholder="85"
            />
          </div>

          {/* Total Quantity */}
          <div className="space-y-2">
            <Label>{isArabic ? "الكمية الإجمالية (كجم)" : "Total Quantity (kg)"}</Label>
            <Input
              type="number"
              min="0"
              step="0.1"
              value={formData.total_quantity_kg}
              onChange={(e) => handleChange("total_quantity_kg", e.target.value)}
              placeholder={isArabic ? "مثال: 500" : "e.g., 500"}
            />
          </div>

          {/* Alert Thresholds */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-amber-600">{isArabic ? "حد التحذير (كجم)" : "Warning Threshold (kg)"}</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={formData.warning_quantity_kg}
                onChange={(e) => handleChange("warning_quantity_kg", e.target.value)}
                placeholder="20"
                className="border-amber-300 focus:border-amber-500"
              />
              <p className="text-xs text-muted-foreground">
                {isArabic ? "تنبيه أصفر عند هذه الكمية" : "Yellow alert at this level"}
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-red-600">{isArabic ? "حد الخطر (كجم)" : "Critical Threshold (kg)"}</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={formData.min_alert_quantity_kg}
                onChange={(e) => handleChange("min_alert_quantity_kg", e.target.value)}
                placeholder="10"
                className="border-red-300 focus:border-red-500"
              />
              <p className="text-xs text-muted-foreground">
                {isArabic ? "تنبيه أحمر عند هذه الكمية" : "Red alert at this level"}
              </p>
            </div>
          </div>

          {/* Availability */}
          <div className="flex items-center justify-between">
            <Label>{isArabic ? "متوفر للبيع" : "Available for sale"}</Label>
            <Switch
              checked={formData.available}
              onCheckedChange={(checked) => handleChange("available", checked)}
            />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || suppliers.length === 0}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                {isArabic ? "جاري الإضافة..." : "Adding..."}
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 ml-2" />
                {isArabic ? "إضافة المحصول" : "Add Crop"}
              </>
            )}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export default AddCoffeeManuallySheet;
