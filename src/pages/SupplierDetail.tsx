import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Building2,
  Package,
  ArrowLeft,
  MapPin,
  DollarSign,
  Coffee,
  Calendar,
  Loader2,
  Trash2,
  ChevronRight,
  Download,
  ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { translateOrigin } from "@/lib/countryTranslations";
import { supabase } from "@/integrations/supabase/client";

import { WhatsAppButton } from "@/components/WhatsAppButton";
import { PriceAlertButton } from "@/components/PriceAlertButton";
import { SupplierPerformanceBadge } from "@/components/SupplierPerformanceBadge";
import { SupplierBadgesDisplay } from "@/components/SupplierBadgesDisplay";
import SupplierReviews from "@/components/SupplierReviews";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { useCart } from "@/hooks/useCart";

interface Supplier {
  id: string;
  name: string;
  contact_info: string | null;
  created_at: string;
}

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
  unit_type?: string | null;
}

// Helper function to format numbers in English
const formatNumber = (num: number): string => {
  return num.toLocaleString('en-US');
};

// Helper function to get stock status and color based on unit_type
const getStockStatus = (coffee: CoffeeOffering) => {
  const total = coffee.total_quantity_kg || 0;
  const sold = coffee.sold_quantity_kg || 0;
  const remaining = total - sold;
  const minAlert = coffee.min_alert_quantity_kg || 10;
  const warningQty = coffee.warning_quantity_kg || 20;
  const kgPerBag = coffee.kg_per_bag || 60;
  const unitType = coffee.unit_type || 'bag'; // default to bag
  
  // Calculate display quantity based on unit type
  const isBag = unitType === 'bag';
  const displayQuantity = isBag ? Math.floor(remaining / kgPerBag) : remaining;
  const unitLabel = isBag ? 'خيشة' : 'كجم';
  const formattedQty = formatNumber(displayQuantity);
  
  if (remaining <= 0) {
    return { status: 'unavailable', label: 'غير متوفر', color: 'bg-gray-500', displayQuantity: 0, unitLabel };
  } else if (remaining <= minAlert) {
    return { status: 'critical', label: `متوفر (${formattedQty} ${unitLabel})`, color: 'bg-red-500', displayQuantity, unitLabel };
  } else if (remaining <= warningQty) {
    return { status: 'warning', label: `متوفر (${formattedQty} ${unitLabel})`, color: 'bg-yellow-500', displayQuantity, unitLabel };
  } else {
    return { status: 'healthy', label: `متوفر (${formattedQty} ${unitLabel})`, color: 'bg-green-500', displayQuantity, unitLabel };
  }
};

const SupplierDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { itemCount } = useCart();
  const { toast } = useToast();
  
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [coffees, setCoffees] = useState<CoffeeOffering[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"price" | "score" | "available" | "name">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [filterAvailable, setFilterAvailable] = useState<"all" | "available" | "unavailable">("all");
  const [filterOrigin, setFilterOrigin] = useState<string>("all");
  const [filterProcess, setFilterProcess] = useState<string>("all");
  const [isDeletingSupplier, setIsDeletingSupplier] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  
  const isArabic = language === 'ar';

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!id || !user) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch supplier - try by id first, then by user_id
        let { data: supplierData, error: supplierError } = await supabase
          .from("suppliers")
          .select("*")
          .eq("id", id)
          .maybeSingle();

        // If not found by id, try by user_id
        if (!supplierData && !supplierError) {
          const { data: supplierByUserId, error: userIdError } = await supabase
            .from("suppliers")
            .select("*")
            .eq("user_id", id)
            .maybeSingle();
          
          if (userIdError) {
            console.error("Error fetching supplier by user_id:", userIdError);
          } else {
            supplierData = supplierByUserId;
          }
        }

        if (supplierError) {
          console.error("Error fetching supplier:", supplierError);
          return;
        }

        setSupplier(supplierData);
        const supplierId = supplierData?.id;

        // Fetch coffee offerings using the actual supplier id
        const { data: coffeesData, error: coffeesError } = await supabase
          .from("coffee_offerings")
          .select("*")
          .eq("supplier_id", supplierId)
          .order("created_at", { ascending: false });

        if (coffeesError) {
          console.error("Error fetching coffees:", coffeesError);
          return;
        }

        setCoffees(coffeesData || []);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id, user]);

  const handleDeleteCoffee = async (coffeeId: string) => {
    try {
      const { error } = await supabase
        .from("coffee_offerings")
        .delete()
        .eq("id", coffeeId);

      if (error) {
        toast({
          title: "خطأ",
          description: "فشل في حذف المحصول",
          variant: "destructive",
        });
        return;
      }

      setCoffees(coffees.filter((c) => c.id !== coffeeId));
      toast({
        title: "تم الحذف",
        description: "تم حذف المحصول بنجاح",
      });
    } catch (error) {
      console.error("Error deleting coffee:", error);
    }
  };

  const handleDeleteSupplier = async () => {
    if (!supplier) return;
    
    setIsDeletingSupplier(true);
    try {
      // Delete all coffee offerings first
      const { error: coffeesError } = await supabase
        .from("coffee_offerings")
        .delete()
        .eq("supplier_id", supplier.id);

      if (coffeesError) {
        console.error("Error deleting coffees:", coffeesError);
        toast({
          title: "خطأ",
          description: "فشل في حذف المحاصيل",
          variant: "destructive",
        });
        setIsDeletingSupplier(false);
        return;
      }

      // Then delete the supplier
      const { error: supplierError } = await supabase
        .from("suppliers")
        .delete()
        .eq("id", supplier.id);

      if (supplierError) {
        console.error("Error deleting supplier:", supplierError);
        toast({
          title: "خطأ",
          description: "فشل في حذف المورد",
          variant: "destructive",
        });
        setIsDeletingSupplier(false);
        return;
      }

      toast({
        title: "تم الحذف",
        description: "تم حذف المورد وجميع محاصيله بنجاح",
      });
      navigate("/suppliers");
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      setIsDeletingSupplier(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const exportToCSV = () => {
    if (coffees.length === 0) return;

    const headers = [
      "الاسم",
      "البلد",
      "المنطقة",
      "المعالجة",
      "الصنف",
      "السعر",
      "العملة",
      "الدرجة",
      "الارتفاع",
      "النكهات",
      "متوفر",
    ];

    const rows = coffees.map((coffee) => [
      coffee.name,
      coffee.origin || "",
      coffee.region || "",
      coffee.process || "",
      coffee.variety || "",
      coffee.price?.toString() || "",
      coffee.currency || "SAR",
      coffee.score?.toString() || "",
      coffee.altitude || "",
      coffee.flavor || "",
      coffee.available ? "نعم" : "لا",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    // Add BOM for Arabic support in Excel
    const bom = "\uFEFF";
    const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${supplier?.name || "محاصيل"}_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "تم التصدير",
      description: `تم تصدير ${coffees.length} محصول إلى ملف CSV`,
    });
  };

  // Get unique origins and processes for filters
  const uniqueOrigins = [...new Set(coffees.map(c => c.origin).filter(Boolean))] as string[];
  const uniqueProcesses = [...new Set(coffees.map(c => c.process).filter(Boolean))] as string[];

  // Filter and sort coffees
  const filteredAndSortedCoffees = coffees
    .filter((coffee) => {
      // Filter by availability
      if (filterAvailable === "available" && coffee.available !== true) return false;
      if (filterAvailable === "unavailable" && coffee.available !== false) return false;
      
      // Filter by origin
      if (filterOrigin !== "all" && coffee.origin !== filterOrigin) return false;
      
      // Filter by process
      if (filterProcess !== "all" && coffee.process !== filterProcess) return false;
      
      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "price":
          comparison = (a.price || 0) - (b.price || 0);
          break;
        case "score":
          comparison = (a.score || 0) - (b.score || 0);
          break;
        case "available":
          comparison = (a.available ? 1 : 0) - (b.available ? 1 : 0);
          break;
        case "name":
        default:
          comparison = a.name.localeCompare(b.name, "ar");
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

  // Calculate stats
  const avgPrice =
    coffees.filter((c) => c.price).reduce((sum, c) => sum + (c.price || 0), 0) /
      (coffees.filter((c) => c.price).length || 1) || 0;
  const avgScore =
    coffees.filter((c) => c.score).reduce((sum, c) => sum + (c.score || 0), 0) /
      (coffees.filter((c) => c.score).length || 1) || 0;
  const availableCount = coffees.filter((c) => c.available).length;

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background font-arabic flex items-center justify-center" dir="rtl">
        <Loader2 className="w-10 h-10 text-coffee-gold animate-spin" />
      </main>
    );
  }

  if (!supplier) {
    return (
      <main className="min-h-screen bg-background font-arabic" dir="rtl">
        <div className="container mx-auto px-6 py-20 text-center">
          <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">المورد غير موجود</h1>
          <p className="text-muted-foreground mb-4">لم يتم العثور على المورد المطلوب</p>
          <Link to="/suppliers">
            <Button variant="coffee">العودة للموردين</Button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background font-arabic pb-20" dir="rtl">
      <div className="container mx-auto px-6 py-6">
        {/* Back Button & Breadcrumb */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/suppliers" className="hover:text-foreground">
              {isArabic ? 'الموردين' : 'Suppliers'}
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-foreground">{supplier.name}</span>
          </div>
        </div>

        {/* Supplier Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-coffee-gold/10 flex items-center justify-center">
              <Building2 className="w-8 h-8 text-coffee-gold" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
                  {supplier.name}
                </h1>
                <SupplierPerformanceBadge supplierId={supplier.id} />
              </div>
              <div className="mb-2">
                <SupplierBadgesDisplay supplierId={supplier.id} size="sm" />
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>أُضيف في {formatDate(supplier.created_at)}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* WhatsApp Button */}
            <WhatsAppButton 
              phoneNumber={supplier.contact_info || undefined}
              supplierName={supplier.name}
              variant="outline"
            />
            
            {/* Delete Supplier Button */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4 ml-2" />
                  حذف المورد
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>تأكيد حذف المورد</AlertDialogTitle>
                  <AlertDialogDescription>
                    هل أنت متأكد من حذف "{supplier.name}" وجميع محاصيله ({coffees.length} محصول)؟ 
                    لا يمكن التراجع عن هذا الإجراء.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteSupplier}
                    disabled={isDeletingSupplier}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeletingSupplier ? (
                      <>
                        <Loader2 className="w-4 h-4 ml-1 animate-spin" />
                        جاري الحذف...
                      </>
                    ) : (
                      "حذف المورد"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Coffee Offerings */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h2 className="text-2xl font-display font-bold text-foreground">
              المحاصيل ({filteredAndSortedCoffees.length} من {coffees.length})
            </h2>
            {coffees.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {/* Filter by Origin */}
                {uniqueOrigins.length > 0 && (
                  <select
                    value={filterOrigin}
                    onChange={(e) => setFilterOrigin(e.target.value)}
                    className="px-3 py-2 text-sm border border-border rounded-lg bg-background"
                  >
                    <option value="all">كل الدول</option>
                    {uniqueOrigins.map((origin) => (
                      <option key={origin} value={origin}>
                        {translateOrigin(origin, isArabic ? 'ar' : 'en')}
                      </option>
                    ))}
                  </select>
                )}
                
                {/* Filter by Process */}
                {uniqueProcesses.length > 0 && (
                  <select
                    value={filterProcess}
                    onChange={(e) => setFilterProcess(e.target.value)}
                    className="px-3 py-2 text-sm border border-border rounded-lg bg-background"
                  >
                    <option value="all">كل المعالجات</option>
                    {uniqueProcesses.map((process) => (
                      <option key={process} value={process}>
                        {process}
                      </option>
                    ))}
                  </select>
                )}
                
                {/* Filter by Availability */}
                <select
                  value={filterAvailable}
                  onChange={(e) => setFilterAvailable(e.target.value as "all" | "available" | "unavailable")}
                  className="px-3 py-2 text-sm border border-border rounded-lg bg-background"
                >
                  <option value="all">الكل</option>
                  <option value="available">متوفر فقط</option>
                  <option value="unavailable">غير متوفر</option>
                </select>
                
                {/* Sort */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "price" | "score" | "available" | "name")}
                  className="px-3 py-2 text-sm border border-border rounded-lg bg-background"
                >
                  <option value="name">ترتيب بالاسم</option>
                  <option value="price">ترتيب بالسعر</option>
                  <option value="score">ترتيب بالدرجة</option>
                  <option value="available">ترتيب بالتوفر</option>
                </select>
                
                {/* Sort Order */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                >
                  {sortOrder === "asc" ? "تصاعدي ↑" : "تنازلي ↓"}
                </Button>
                
                {/* Export */}
                <Button variant="outline" size="sm" onClick={exportToCSV}>
                  <Download className="w-4 h-4 ml-2" />
                  تصدير CSV
                </Button>
              </div>
            )}
          </div>

          {coffees.length === 0 ? (
            <Card variant="glass" className="text-center py-12">
              <CardContent>
                <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-foreground font-medium mb-2">لا توجد محاصيل مسجلة</p>
                <p className="text-muted-foreground">
                  ارفع ملف PDF جديد لإضافة محاصيل لهذا المورد
                </p>
              </CardContent>
            </Card>
          ) : filteredAndSortedCoffees.length === 0 ? (
            <Card variant="glass" className="text-center py-12">
              <CardContent>
                <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-foreground font-medium mb-2">لا توجد نتائج</p>
                <p className="text-muted-foreground">
                  جرب تغيير معايير الفلترة
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAndSortedCoffees.map((coffee) => {
                const stockStatus = getStockStatus(coffee);
                return (
                  <Card key={coffee.id} variant="glass" className="overflow-hidden hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">{coffee.name}</CardTitle>
                        <Badge className={`${stockStatus.color} text-white`}>
                          {stockStatus.label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {coffee.origin && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <span>{translateOrigin(coffee.origin, isArabic ? 'ar' : 'en')}</span>
                          {coffee.region && <span className="text-muted-foreground">- {coffee.region}</span>}
                        </div>
                      )}
                      
                      {coffee.process && (
                        <div className="flex items-center gap-2 text-sm">
                          <Coffee className="w-4 h-4 text-muted-foreground" />
                          <span>{coffee.process}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between pt-2">
                        {coffee.price && (
                          <div className="flex items-center gap-1 text-lg font-bold text-coffee-gold">
                            <DollarSign className="w-4 h-4" />
                            {formatNumber(coffee.price)} {coffee.currency || 'SAR'}
                          </div>
                        )}
                        {coffee.score && (
                          <Badge variant="outline" className="text-coffee-medium border-coffee-medium">
                            SCA: {formatNumber(coffee.score)}
                          </Badge>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-2 border-t border-border">
                        <AddToCartButton 
                          coffeeId={coffee.id} 
                          supplierId={supplier.id}
                          size="sm"
                        />
                        <PriceAlertButton coffeeId={coffee.id} coffeeName={coffee.name} currentPrice={coffee.price} />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="icon" className="text-destructive hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                              <AlertDialogDescription>
                                هل أنت متأكد من حذف "{coffee.name}"؟ لا يمكن التراجع عن هذا الإجراء.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteCoffee(coffee.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                حذف
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Fixed Bottom Cart Button */}
      {itemCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 shadow-lg z-40">
          <div className="container mx-auto max-w-2xl">
            <Button 
              onClick={() => setCartOpen(true)}
              className="w-full gap-2"
              size="lg"
            >
              <ShoppingCart className="w-5 h-5" />
              {isArabic ? `عرض السلة (${itemCount})` : `View Cart (${itemCount})`}
            </Button>
          </div>
        </div>
      )}

      {/* Cart Drawer */}
      <CartDrawer 
        open={cartOpen} 
        onOpenChange={setCartOpen} 
        onNavigateToCheckout={() => navigate('/checkout')}
      />
    </main>
  );
};

export default SupplierDetail;
