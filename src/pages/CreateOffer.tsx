import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Coffee, Tag, ArrowRight, ArrowLeft, Loader2, Calendar, Percent, DollarSign, Package, Scale, Search, X, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Supplier {
  id: string;
  name: string;
}

interface CoffeeItem {
  id: string;
  name: string;
  supplier_id: string;
  origin: string | null;
  score: number | null;
}

const CreateOffer = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { language, dir } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [coffees, setCoffees] = useState<CoffeeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [selectedCoffee, setSelectedCoffee] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "amount">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [minQuantity, setMinQuantity] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [termsConditions, setTermsConditions] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [unitType, setUnitType] = useState<"kg" | "bag">("kg");
  const [kgPerBag, setKgPerBag] = useState("");
  
  // Coffee filter states
  const [coffeeSearchName, setCoffeeSearchName] = useState("");
  const [coffeeFilterOrigin, setCoffeeFilterOrigin] = useState<string>("all");
  const [coffeeFilterScore, setCoffeeFilterScore] = useState<string>("all");
  const [coffeeSortBy, setCoffeeSortBy] = useState<string>("name");

  const isRtl = dir === 'rtl';

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setIsLoading(true);
      setSuppliers([]);
      setCoffees([]);
      setSelectedSupplier("");
      
      try {
        // Fetch user's supplier (single company per supplier)
        const { data: suppliersData, error: supplierError } = await supabase
          .from('suppliers')
          .select('id, name')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();

        if (supplierError) {
          console.error('Error fetching supplier:', supplierError);
          setIsLoading(false);
          return;
        }

        if (suppliersData) {
          setSuppliers([suppliersData]);
          setSelectedSupplier(suppliersData.id); // Auto-select the supplier

          // Fetch coffees for this supplier with origin and score
          const { data: coffeesData } = await supabase
            .from('coffee_offerings')
            .select('id, name, supplier_id, origin, score')
            .eq('supplier_id', suppliersData.id);

          setCoffees(coffeesData || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  // Extract unique origins for filter
  const uniqueOrigins = useMemo(() => {
    const origins = coffees.map(c => c.origin).filter(Boolean) as string[];
    return [...new Set(origins)].sort();
  }, [coffees]);

  // Filter and sort coffees
  const filteredCoffees = useMemo(() => {
    let result = coffees.filter(coffee => {
      // Name search
      if (coffeeSearchName && !coffee.name.toLowerCase().includes(coffeeSearchName.toLowerCase())) {
        return false;
      }
      // Origin filter
      if (coffeeFilterOrigin !== "all" && coffee.origin !== coffeeFilterOrigin) {
        return false;
      }
      // Score filter
      if (coffeeFilterScore !== "all") {
        const score = coffee.score || 0;
        if (coffeeFilterScore === "90+" && score < 90) return false;
        if (coffeeFilterScore === "85-89" && (score < 85 || score >= 90)) return false;
        if (coffeeFilterScore === "80-84" && (score < 80 || score >= 85)) return false;
        if (coffeeFilterScore === "below80" && score >= 80) return false;
      }
      return true;
    });

    // Sorting
    switch (coffeeSortBy) {
      case "name":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "highest_score":
        result.sort((a, b) => (b.score || 0) - (a.score || 0));
        break;
      case "lowest_score":
        result.sort((a, b) => (a.score || 0) - (b.score || 0));
        break;
      case "origin":
        result.sort((a, b) => (a.origin || "").localeCompare(b.origin || ""));
        break;
    }

    return result;
  }, [coffees, coffeeSearchName, coffeeFilterOrigin, coffeeFilterScore, coffeeSortBy]);

  const clearCoffeeFilters = () => {
    setCoffeeSearchName("");
    setCoffeeFilterOrigin("all");
    setCoffeeFilterScore("all");
    setCoffeeSortBy("name");
  };

  const hasActiveCoffeeFilters = coffeeSearchName || coffeeFilterOrigin !== "all" || coffeeFilterScore !== "all" || coffeeSortBy !== "name";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSupplier || !title) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'يرجى ملء الحقول المطلوبة' : 'Please fill required fields',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('supplier_offers').insert({
        supplier_id: selectedSupplier,
        coffee_id: selectedCoffee || null,
        title,
        description: description || null,
        discount_percentage: discountType === 'percentage' ? Number(discountValue) : null,
        discount_amount: discountType === 'amount' ? Number(discountValue) : null,
        min_quantity_kg: minQuantity ? Number(minQuantity) : null,
        valid_until: validUntil || null,
        terms_conditions: termsConditions || null,
        is_active: isActive,
        unit_type: unitType,
        kg_per_bag: unitType === 'bag' && kgPerBag ? Number(kgPerBag) : null,
      });

      if (error) throw error;

      toast({
        title: language === 'ar' ? 'تم إنشاء العرض' : 'Offer Created',
        description: language === 'ar' ? 'تم إنشاء العرض بنجاح' : 'Offer created successfully',
      });

      navigate('/supplier-dashboard');
    } catch (error) {
      console.error('Error creating offer:', error);
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل إنشاء العرض' : 'Failed to create offer',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <main className="min-h-screen bg-background font-arabic flex items-center justify-center" dir={dir}>
        <Loader2 className="w-10 h-10 text-coffee-gold animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background font-arabic" dir={dir}>
      <div className="container mx-auto px-6 py-12 max-w-2xl">
        <div className="mb-6">
          <Button variant="ghost" className="gap-2" onClick={() => navigate(-1)}>
            {isRtl ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            {language === 'ar' ? 'رجوع' : 'Back'}
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="w-6 h-6 text-coffee-gold" />
              {language === 'ar' ? 'إنشاء عرض جديد' : 'Create New Offer'}
            </CardTitle>
            <CardDescription>
              {language === 'ar'
                ? 'أنشئ عرضاً أو خصماً لمنتجاتك'
                : 'Create an offer or discount for your products'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Company Display (auto-selected) */}
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الشركة' : 'Company'}</Label>
                <div className="p-3 rounded-lg border bg-muted/50">
                  <span className="font-medium">
                    {suppliers.length > 0 ? suppliers[0].name : (language === 'ar' ? 'لم يتم العثور على شركة' : 'No company found')}
                  </span>
                </div>
              </div>

              {/* Coffee Selection with Filters */}
              <div className="space-y-3">
                <Label>{language === 'ar' ? 'المنتج (اختياري)' : 'Product (optional)'}</Label>
                
                {/* Coffee Filters */}
                {coffees.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-muted/30 rounded-lg border">
                    {/* Name Search */}
                    <div className="relative sm:col-span-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder={language === 'ar' ? "بحث باسم المحصول..." : "Search by coffee name..."}
                        value={coffeeSearchName}
                        onChange={(e) => setCoffeeSearchName(e.target.value)}
                        className="pl-9"
                      />
                    </div>

                    {/* Origin Filter */}
                    <Select value={coffeeFilterOrigin} onValueChange={setCoffeeFilterOrigin}>
                      <SelectTrigger>
                        <SelectValue placeholder={language === 'ar' ? "الدولة" : "Country"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{language === 'ar' ? "كل الدول" : "All Countries"}</SelectItem>
                        {uniqueOrigins.map((origin) => (
                          <SelectItem key={origin} value={origin}>{origin}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Score Filter */}
                    <Select value={coffeeFilterScore} onValueChange={setCoffeeFilterScore}>
                      <SelectTrigger>
                        <SelectValue placeholder={language === 'ar' ? "التقييم" : "Score"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{language === 'ar' ? "كل التقييمات" : "All Scores"}</SelectItem>
                        <SelectItem value="90+">{language === 'ar' ? "90 فأعلى" : "90+"}</SelectItem>
                        <SelectItem value="85-89">85-89</SelectItem>
                        <SelectItem value="80-84">80-84</SelectItem>
                        <SelectItem value="below80">{language === 'ar' ? "أقل من 80" : "Below 80"}</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Sort Options */}
                    <Select value={coffeeSortBy} onValueChange={setCoffeeSortBy}>
                      <SelectTrigger>
                        <ArrowUpDown className="w-4 h-4 mr-2" />
                        <SelectValue placeholder={language === 'ar' ? "الترتيب" : "Sort by"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name">{language === 'ar' ? "الاسم" : "Name"}</SelectItem>
                        <SelectItem value="highest_score">{language === 'ar' ? "الأعلى تقييماً" : "Highest Score"}</SelectItem>
                        <SelectItem value="lowest_score">{language === 'ar' ? "الأقل تقييماً" : "Lowest Score"}</SelectItem>
                        <SelectItem value="origin">{language === 'ar' ? "الدولة" : "Origin"}</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Clear Filters */}
                    {hasActiveCoffeeFilters && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={clearCoffeeFilters} 
                        className="gap-1 sm:col-span-2"
                      >
                        <X className="w-4 h-4" />
                        {language === 'ar' ? "مسح الفلاتر" : "Clear Filters"}
                      </Button>
                    )}
                  </div>
                )}

                {/* Coffee Selection Dropdown */}
                <Select
                  value={selectedCoffee}
                  onValueChange={setSelectedCoffee}
                  disabled={suppliers.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        language === 'ar'
                          ? 'اختر منتج أو اتركه فارغاً للعرض العام'
                          : 'Select product or leave empty for general offer'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCoffees.map((coffee) => (
                      <SelectItem key={coffee.id} value={coffee.id}>
                        {coffee.name} {coffee.origin && `(${coffee.origin})`} {coffee.score && `- ${coffee.score}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {coffees.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {language === 'ar' 
                      ? `عرض ${filteredCoffees.length} من ${coffees.length} منتج`
                      : `Showing ${filteredCoffees.length} of ${coffees.length} products`}
                  </p>
                )}
              </div>

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

              {/* Unit Type */}
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'وحدة البيع' : 'Sales Unit'}</Label>
                <Select
                  value={unitType}
                  onValueChange={(v) => setUnitType(v as "kg" | "bag")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">
                      <span className="flex items-center gap-2">
                        <Scale className="w-4 h-4" />
                        {language === 'ar' ? 'كيلو' : 'Kilogram'}
                      </span>
                    </SelectItem>
                    <SelectItem value="bag">
                      <span className="flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        {language === 'ar' ? 'خيشة' : 'Bag'}
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Kg per Bag - only shown when bag is selected */}
              {unitType === 'bag' && (
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'عدد الكيلوات بالخيشة' : 'Kilograms per Bag'}</Label>
                  <Input
                    type="number"
                    value={kgPerBag}
                    onChange={(e) => setKgPerBag(e.target.value)}
                    placeholder={language === 'ar' ? 'مثال: 60' : 'e.g., 60'}
                  />
                </div>
              )}

              {/* Min Quantity */}
              <div className="space-y-2">
                <Label>
                  {unitType === 'bag' 
                    ? (language === 'ar' ? 'الحد الأدنى للطلب (خيشة)' : 'Minimum Order (bags)')
                    : (language === 'ar' ? 'الحد الأدنى للطلب (كغ)' : 'Minimum Order (kg)')}
                </Label>
                <Input
                  type="number"
                  value={minQuantity}
                  onChange={(e) => setMinQuantity(e.target.value)}
                  placeholder={unitType === 'bag' ? '1' : '50'}
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
                      ? 'العرض سيكون مرئياً للمحامص فور الإنشاء'
                      : 'Offer will be visible to roasters immediately'}
                  </p>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>

              {/* Submit */}
              <Button
                type="submit"
                variant="coffee"
                size="lg"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin ml-2" />
                    {language === 'ar' ? 'جاري الإنشاء...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <Tag className={`w-5 h-5 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                    {language === 'ar' ? 'إنشاء العرض' : 'Create Offer'}
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default CreateOffer;
