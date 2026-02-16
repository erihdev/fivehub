import { useState, useEffect, useMemo } from "react";
import {
  Package,
  Loader2,
  Plus,
  Minus,
  Trash2,
  Search,
  X,
  Scale,
  AlertTriangle,
  Edit,
  Check,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/use-toast";
import AddCoffeeManuallySheet from "./AddCoffeeManuallySheet";

interface Coffee {
  id: string;
  name: string;
  origin: string | null;
  available: boolean | null;
  price: number | null;
  supplier_id: string;
  process: string | null;
  score: number | null;
  unit_type: string | null;
  kg_per_bag: number | null;
  total_quantity_kg: number | null;
  sold_quantity_kg: number | null;
  min_alert_quantity_kg: number | null;
  warning_quantity_kg: number | null;
}

type StockStatus = 'healthy' | 'warning' | 'critical';

const getStockStatus = (coffee: Coffee): StockStatus => {
  const remaining = (coffee.total_quantity_kg || 0) - (coffee.sold_quantity_kg || 0);
  const minAlert = coffee.min_alert_quantity_kg || 10;
  const warningQty = coffee.warning_quantity_kg || 20;
  
  if (remaining <= minAlert) return 'critical';
  if (remaining <= warningQty) return 'warning';
  return 'healthy';
};

const getStockColor = (status: StockStatus) => {
  switch (status) {
    case 'critical': return 'bg-red-500 text-white';
    case 'warning': return 'bg-amber-500 text-white';
    case 'healthy': return 'bg-green-500 text-white';
  }
};

const getStockBorderColor = (status: StockStatus) => {
  switch (status) {
    case 'critical': return 'border-red-500/50 bg-red-50 dark:bg-red-950/20';
    case 'warning': return 'border-amber-500/50 bg-amber-50 dark:bg-amber-950/20';
    case 'healthy': return '';
  }
};

const SupplierInventoryManager = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  
  const [coffees, setCoffees] = useState<Coffee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingCoffee, setDeletingCoffee] = useState<Coffee | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingStock, setEditingStock] = useState<string | null>(null);
  const [editStockValue, setEditStockValue] = useState<number>(0);

  // Search/Filter states
  const [searchName, setSearchName] = useState("");
  const [filterOrigin, setFilterOrigin] = useState<string>("all");
  const [filterProcess, setFilterProcess] = useState<string>("all");
  const [filterScore, setFilterScore] = useState<string>("all");

  const isArabic = language === "ar";

  const fetchCoffees = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data: suppliers } = await supabase
        .from("suppliers")
        .select("id")
        .eq("user_id", user.id);

      if (!suppliers?.length) {
        setCoffees([]);
        setIsLoading(false);
        return;
      }

      const supplierIds = suppliers.map((s) => s.id);

      const { data } = await supabase
        .from("coffee_offerings")
        .select("*")
        .in("supplier_id", supplierIds)
        .order("name");

      setCoffees(data || []);
    } catch (error) {
      console.error("Error fetching coffees:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCoffees();
  }, [user]);

  // Extract unique values for filters
  const uniqueOrigins = useMemo(() => {
    const origins = coffees.map(c => c.origin).filter(Boolean) as string[];
    return [...new Set(origins)].sort();
  }, [coffees]);

  const uniqueProcesses = useMemo(() => {
    const processes = coffees.map(c => c.process).filter(Boolean) as string[];
    return [...new Set(processes)].sort();
  }, [coffees]);

  // Filter coffees based on search criteria
  const filteredCoffees = useMemo(() => {
    return coffees.filter(coffee => {
      // Name search
      if (searchName && !coffee.name.toLowerCase().includes(searchName.toLowerCase())) {
        return false;
      }
      // Origin filter
      if (filterOrigin !== "all" && coffee.origin !== filterOrigin) {
        return false;
      }
      // Process filter
      if (filterProcess !== "all" && coffee.process !== filterProcess) {
        return false;
      }
      // Score filter
      if (filterScore !== "all") {
        const score = coffee.score || 0;
        if (filterScore === "90+" && score < 90) return false;
        if (filterScore === "85-89" && (score < 85 || score >= 90)) return false;
        if (filterScore === "80-84" && (score < 80 || score >= 85)) return false;
        if (filterScore === "below80" && score >= 80) return false;
      }
      return true;
    });
  }, [coffees, searchName, filterOrigin, filterProcess, filterScore]);

  const clearFilters = () => {
    setSearchName("");
    setFilterOrigin("all");
    setFilterProcess("all");
    setFilterScore("all");
  };

  const hasActiveFilters = searchName || filterOrigin !== "all" || filterProcess !== "all" || filterScore !== "all";

  const toggleAvailability = async (coffeeId: string, available: boolean) => {
    setUpdatingId(coffeeId);
    try {
      const { error } = await supabase
        .from("coffee_offerings")
        .update({ available })
        .eq("id", coffeeId);

      if (error) throw error;

      setCoffees((prev) =>
        prev.map((c) => (c.id === coffeeId ? { ...c, available } : c))
      );

      toast({
        title: isArabic ? "تم التحديث" : "Updated",
        description: available
          ? (isArabic ? "المنتج متوفر الآن" : "Product is now available")
          : (isArabic ? "المنتج غير متوفر" : "Product is now unavailable"),
      });
    } catch (error) {
      console.error("Error updating availability:", error);
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "فشل التحديث" : "Failed to update",
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteCoffee = async () => {
    if (!deletingCoffee) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("coffee_offerings")
        .delete()
        .eq("id", deletingCoffee.id);

      if (error) throw error;

      setCoffees((prev) => prev.filter((c) => c.id !== deletingCoffee.id));
      
      toast({
        title: isArabic ? "تم الحذف" : "Deleted",
        description: isArabic ? "تم حذف المنتج بنجاح" : "Product deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting coffee:", error);
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "فشل حذف المنتج" : "Failed to delete product",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeletingCoffee(null);
    }
  };

  const startEditStock = (coffee: Coffee) => {
    setEditingStock(coffee.id);
    setEditStockValue(coffee.total_quantity_kg || 0);
  };

  const saveStockEdit = async (coffeeId: string) => {
    setUpdatingId(coffeeId);
    try {
      const { error } = await supabase
        .from("coffee_offerings")
        .update({ total_quantity_kg: editStockValue })
        .eq("id", coffeeId);

      if (error) throw error;

      setCoffees((prev) =>
        prev.map((c) => (c.id === coffeeId ? { ...c, total_quantity_kg: editStockValue } : c))
      );

      toast({
        title: isArabic ? "تم التحديث" : "Updated",
        description: isArabic ? "تم تحديث المخزون بنجاح" : "Stock updated successfully",
      });
    } catch (error) {
      console.error("Error updating stock:", error);
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "فشل تحديث المخزون" : "Failed to update stock",
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
      setEditingStock(null);
    }
  };

  const addToStock = async (coffeeId: string, amount: number) => {
    const coffee = coffees.find(c => c.id === coffeeId);
    if (!coffee) return;
    
    const newTotal = (coffee.total_quantity_kg || 0) + amount;
    
    setUpdatingId(coffeeId);
    try {
      const { error } = await supabase
        .from("coffee_offerings")
        .update({ total_quantity_kg: newTotal })
        .eq("id", coffeeId);

      if (error) throw error;

      setCoffees((prev) =>
        prev.map((c) => (c.id === coffeeId ? { ...c, total_quantity_kg: newTotal } : c))
      );

      toast({
        title: isArabic ? "تمت الإضافة" : "Stock Added",
        description: isArabic ? `تمت إضافة ${amount} كجم للمخزون` : `Added ${amount}kg to stock`,
      });
    } catch (error) {
      console.error("Error adding stock:", error);
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "فشل إضافة المخزون" : "Failed to add stock",
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const availableCount = coffees.filter((c) => c.available).length;
  const unavailableCount = coffees.filter((c) => !c.available).length;
  
  // Stock status counts
  const criticalCount = coffees.filter((c) => getStockStatus(c) === 'critical').length;
  const warningCount = coffees.filter((c) => getStockStatus(c) === 'warning').length;
  const healthyCount = coffees.filter((c) => getStockStatus(c) === 'healthy').length;
  
  // Total stats
  const totalStock = coffees.reduce((sum, c) => sum + (c.total_quantity_kg || 0), 0);
  const totalSold = coffees.reduce((sum, c) => sum + (c.sold_quantity_kg || 0), 0);
  const totalRemaining = totalStock - totalSold;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                {isArabic ? "إدارة المخزون" : "Inventory Management"}
              </CardTitle>
              <CardDescription>
                {isArabic
                  ? "تحكم في توفر منتجاتك وأضف محاصيل جديدة"
                  : "Control your products availability and add new crops"}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <AddCoffeeManuallySheet onSuccess={fetchCoffees} />
              <Badge className="bg-green-100 text-green-800">
                {availableCount} {isArabic ? "متوفر" : "Available"}
              </Badge>
              <Badge variant="secondary">
                {unavailableCount} {isArabic ? "غير متوفر" : "Unavailable"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stock Overview Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-primary">{totalStock.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">{isArabic ? 'المخزون الكلي (كجم)' : 'Total Stock (kg)'}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{totalSold.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">{isArabic ? 'المباع (كجم)' : 'Sold (kg)'}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className={`text-2xl font-bold ${totalRemaining <= 0 ? 'text-red-600' : 'text-green-600'}`}>
                {totalRemaining.toFixed(1)}
              </p>
              <p className="text-xs text-muted-foreground">{isArabic ? 'المتبقي (كجم)' : 'Remaining (kg)'}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold">{coffees.length}</p>
              <p className="text-xs text-muted-foreground">{isArabic ? 'عدد المحاصيل' : 'Total Crops'}</p>
            </div>
          </div>

          {/* Stock Status Summary */}
          <div className="flex flex-wrap gap-2">
            {healthyCount > 0 && (
              <Badge className="bg-green-500 text-white gap-1">
                <span className="w-2 h-2 rounded-full bg-white"></span>
                {healthyCount} {isArabic ? 'مخزون جيد' : 'Healthy'}
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge className="bg-amber-500 text-white gap-1">
                <span className="w-2 h-2 rounded-full bg-white"></span>
                {warningCount} {isArabic ? 'على وشك النفاد' : 'Low Stock'}
              </Badge>
            )}
            {criticalCount > 0 && (
              <Badge className="bg-red-500 text-white gap-1">
                <span className="w-2 h-2 rounded-full bg-white"></span>
                {criticalCount} {isArabic ? 'نفد المخزون' : 'Critical'}
              </Badge>
            )}
          </div>

          {/* Critical Stock Alert */}
          {criticalCount > 0 && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-red-700 dark:text-red-400">
                  {isArabic ? `🚨 تحذير: ${criticalCount} محصول وصل للحد الحرج!` : `🚨 Critical: ${criticalCount} crops need restocking!`}
                </h4>
                <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-1">
                  {isArabic 
                    ? "يجب إعادة التوفير فوراً لتجنب فقدان المبيعات"
                    : "Immediate restocking required to avoid lost sales"}
                </p>
              </div>
            </div>
          )}
          
          {/* Warning Stock Alert */}
          {warningCount > 0 && criticalCount === 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-700 dark:text-amber-400">
                  {isArabic ? `⚠️ تنبيه: ${warningCount} محصول على وشك النفاد` : `⚠️ Warning: ${warningCount} crops running low`}
                </h4>
                <p className="text-sm text-amber-600/80 dark:text-amber-400/80 mt-1">
                  {isArabic 
                    ? "يُنصح بالتخطيط لإعادة التوفير قريباً"
                    : "Plan to restock soon"}
                </p>
              </div>
            </div>
          )}
          {/* Search and Filter Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Name Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={isArabic ? "بحث بالاسم..." : "Search by name..."}
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Origin Filter */}
            <Select value={filterOrigin} onValueChange={setFilterOrigin}>
              <SelectTrigger>
                <SelectValue placeholder={isArabic ? "الدولة" : "Country"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isArabic ? "كل الدول" : "All Countries"}</SelectItem>
                {uniqueOrigins.map((origin) => (
                  <SelectItem key={origin} value={origin}>{origin}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Process Filter */}
            <Select value={filterProcess} onValueChange={setFilterProcess}>
              <SelectTrigger>
                <SelectValue placeholder={isArabic ? "المعالجة" : "Process"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isArabic ? "كل المعالجات" : "All Processes"}</SelectItem>
                {uniqueProcesses.map((process) => (
                  <SelectItem key={process} value={process}>{process}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Score Filter */}
            <Select value={filterScore} onValueChange={setFilterScore}>
              <SelectTrigger>
                <SelectValue placeholder={isArabic ? "التقييم" : "Score"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isArabic ? "كل التقييمات" : "All Scores"}</SelectItem>
                <SelectItem value="90+">{isArabic ? "90 فأعلى" : "90+"}</SelectItem>
                <SelectItem value="85-89">85-89</SelectItem>
                <SelectItem value="80-84">80-84</SelectItem>
                <SelectItem value="below80">{isArabic ? "أقل من 80" : "Below 80"}</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters} className="gap-1">
                <X className="w-4 h-4" />
                {isArabic ? "مسح الفلاتر" : "Clear"}
              </Button>
            )}
          </div>

          {/* Results count */}
          {hasActiveFilters && (
            <p className="text-sm text-muted-foreground">
              {isArabic 
                ? `عرض ${filteredCoffees.length} من ${coffees.length} منتج`
                : `Showing ${filteredCoffees.length} of ${coffees.length} products`}
            </p>
          )}

          {coffees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>{isArabic ? "لا توجد منتجات" : "No products yet"}</p>
            </div>
          ) : filteredCoffees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>{isArabic ? "لا توجد نتائج مطابقة" : "No matching results"}</p>
              <Button variant="link" onClick={clearFilters} className="mt-2">
                {isArabic ? "مسح الفلاتر" : "Clear filters"}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isArabic ? "المحصول" : "Crop"}</TableHead>
                  <TableHead>{isArabic ? "المنشأ" : "Origin"}</TableHead>
                  <TableHead className="text-center">{isArabic ? "المخزون الكلي" : "Total Stock"}</TableHead>
                  <TableHead className="text-center">{isArabic ? "المباع" : "Sold"}</TableHead>
                  <TableHead className="text-center">{isArabic ? "المتبقي" : "Remaining"}</TableHead>
                  <TableHead>{isArabic ? "الحالة" : "Status"}</TableHead>
                  <TableHead>{isArabic ? "إجراءات المخزون" : "Stock Actions"}</TableHead>
                  <TableHead>{isArabic ? "التوفر" : "Availability"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCoffees.map((coffee) => {
                  const stockStatus = getStockStatus(coffee);
                  const remaining = (coffee.total_quantity_kg || 0) - (coffee.sold_quantity_kg || 0);
                  const soldPercentage = coffee.total_quantity_kg 
                    ? ((coffee.sold_quantity_kg || 0) / coffee.total_quantity_kg * 100).toFixed(0)
                    : 0;
                  
                  return (
                    <TableRow key={coffee.id} className={`${getStockBorderColor(stockStatus)} border-b`}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${
                              stockStatus === 'critical' ? 'bg-red-500 animate-pulse' :
                              stockStatus === 'warning' ? 'bg-amber-500' : 'bg-green-500'
                            }`}></div>
                            <span className="font-semibold">{coffee.name}</span>
                          </div>
                          {coffee.score && (
                            <span className="text-xs text-muted-foreground">
                              ⭐ {coffee.score} | {coffee.process || '-'}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{coffee.origin || "-"}</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Scale className="w-3 h-3" />
                            {coffee.unit_type === 'bag' 
                              ? `${isArabic ? 'خيشة' : 'Bag'} (${coffee.kg_per_bag || 60}${isArabic ? 'كجم' : 'kg'})`
                              : (isArabic ? 'كيلو' : 'Kg')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {editingStock === coffee.id ? (
                          <div className="flex items-center gap-1 justify-center">
                            <Input
                              type="number"
                              value={editStockValue}
                              onChange={(e) => setEditStockValue(Number(e.target.value))}
                              className="w-20 h-8 text-center"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => saveStockEdit(coffee.id)}
                              disabled={updatingId === coffee.id}
                            >
                              {updatingId === coffee.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Check className="w-4 h-4 text-green-600" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingStock(null)}
                            >
                              <X className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-lg font-bold">{coffee.total_quantity_kg || 0}</span>
                            <span className="text-xs text-muted-foreground">{isArabic ? 'كجم' : 'kg'}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2"
                              onClick={() => startEditStock(coffee)}
                            >
                              <Edit className="w-3 h-3 mr-1" />
                              <span className="text-xs">{isArabic ? 'تعديل' : 'Edit'}</span>
                            </Button>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-lg font-bold text-blue-600">{coffee.sold_quantity_kg || 0}</span>
                          <span className="text-xs text-muted-foreground">{isArabic ? 'كجم' : 'kg'}</span>
                          <Badge variant="outline" className="text-xs">
                            {soldPercentage}% {isArabic ? 'مباع' : 'sold'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <Badge className={`${getStockColor(stockStatus)} text-lg px-3 py-1`}>
                            {remaining.toFixed(0)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{isArabic ? 'كجم متبقي' : 'kg left'}</span>
                          {/* Progress bar */}
                          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all ${
                                stockStatus === 'critical' ? 'bg-red-500' :
                                stockStatus === 'warning' ? 'bg-amber-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(100, (remaining / (coffee.total_quantity_kg || 1)) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge className={getStockColor(stockStatus)}>
                            {stockStatus === 'critical' 
                              ? (isArabic ? '🔴 نفد' : '🔴 Out')
                              : stockStatus === 'warning'
                              ? (isArabic ? '🟡 منخفض' : '🟡 Low')
                              : (isArabic ? '🟢 متوفر' : '🟢 Good')}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {isArabic ? 'تنبيه عند:' : 'Alert at:'} {coffee.min_alert_quantity_kg || 10}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-2">
                          {/* Supplier uses bags (خيشة) - each bag is typically 60kg */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => addToStock(coffee.id, coffee.kg_per_bag || 60)}
                            disabled={updatingId === coffee.id}
                            className="gap-1"
                          >
                            <RefreshCw className="w-3 h-3" />
                            +1 {isArabic ? 'خيشة' : 'bag'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => addToStock(coffee.id, (coffee.kg_per_bag || 60) * 5)}
                            disabled={updatingId === coffee.id}
                            className="gap-1"
                          >
                            <RefreshCw className="w-3 h-3" />
                            +5 {isArabic ? 'خيشة' : 'bags'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => addToStock(coffee.id, (coffee.kg_per_bag || 60) * 10)}
                            disabled={updatingId === coffee.id}
                            className="gap-1"
                          >
                            <RefreshCw className="w-3 h-3" />
                            +10 {isArabic ? 'خيشة' : 'bags'}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Button
                            size="sm"
                            variant={coffee.available ? "outline" : "default"}
                            onClick={() => toggleAvailability(coffee.id, !coffee.available)}
                            disabled={updatingId === coffee.id}
                          >
                            {updatingId === coffee.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : coffee.available ? (
                              <>
                                <Minus className="w-4 h-4 mr-1" />
                                {isArabic ? "إيقاف" : "Disable"}
                              </>
                            ) : (
                              <>
                                <Plus className="w-4 h-4 mr-1" />
                                {isArabic ? "تفعيل" : "Enable"}
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeletingCoffee(coffee)}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            {isArabic ? "حذف" : "Delete"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingCoffee} onOpenChange={(open) => !open && setDeletingCoffee(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isArabic ? "حذف المنتج" : "Delete Product"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isArabic
                ? `هل أنت متأكد من حذف "${deletingCoffee?.name}"؟ هذا الإجراء لا يمكن التراجع عنه.`
                : `Are you sure you want to delete "${deletingCoffee?.name}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {isArabic ? "إلغاء" : "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCoffee}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : (isArabic ? "حذف" : "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SupplierInventoryManager;
