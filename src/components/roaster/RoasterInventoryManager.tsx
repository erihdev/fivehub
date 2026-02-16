import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Package, AlertTriangle, CheckCircle, TrendingDown, 
  X, Search, Loader2, Edit, Check, Plus
} from "lucide-react";

interface RoastedProduct {
  id: string;
  name: string;
  roast_level: string | null;
  available: boolean | null;
  total_quantity_kg: number | null;
  sold_quantity_kg: number | null;
  min_alert_quantity_kg: number | null;
  warning_quantity_kg: number | null;
}

type StockStatus = 'healthy' | 'warning' | 'critical';

const getStockStatus = (product: RoastedProduct): StockStatus => {
  const total = product.total_quantity_kg || 0;
  const sold = product.sold_quantity_kg || 0;
  const remaining = total - sold;
  const minAlert = product.min_alert_quantity_kg || 10;
  const warning = product.warning_quantity_kg || 20;

  if (remaining <= minAlert) return 'critical';
  if (remaining <= warning) return 'warning';
  return 'healthy';
};

const getStockColor = (status: StockStatus): string => {
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

const RoasterInventoryManager = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [products, setProducts] = useState<RoastedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingStock, setEditingStock] = useState<string | null>(null);
  const [editStockValue, setEditStockValue] = useState<number>(0);
  const [customAddAmount, setCustomAddAmount] = useState<{ [key: string]: string }>({});
  const [searchName, setSearchName] = useState("");
  const [filterRoast, setFilterRoast] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const isArabic = language === 'ar';

  useEffect(() => {
    if (user) {
      fetchProducts();
      
      const channel = supabase
        .channel('roaster-inventory')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'roasted_coffee_products' },
          () => fetchProducts()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchProducts = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('roasted_coffee_products')
      .select('*')
      .eq('roaster_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setProducts(data);
    }
    setIsLoading(false);
  };

  const uniqueRoastLevels = useMemo(() => {
    const levels = products.map(p => p.roast_level).filter(Boolean) as string[];
    return [...new Set(levels)].sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      if (searchName && !product.name.toLowerCase().includes(searchName.toLowerCase())) {
        return false;
      }
      if (filterRoast !== "all" && product.roast_level !== filterRoast) {
        return false;
      }
      if (filterStatus !== "all") {
        const status = getStockStatus(product);
        if (filterStatus !== status) return false;
      }
      return true;
    });
  }, [products, searchName, filterRoast, filterStatus]);

  const clearFilters = () => {
    setSearchName("");
    setFilterRoast("all");
    setFilterStatus("all");
  };

  const hasActiveFilters = searchName || filterRoast !== "all" || filterStatus !== "all";

  const startEditStock = (product: RoastedProduct) => {
    setEditingStock(product.id);
    setEditStockValue(product.total_quantity_kg || 0);
  };

  const saveStockEdit = async (productId: string) => {
    setUpdatingId(productId);
    try {
      const { error } = await supabase
        .from('roasted_coffee_products')
        .update({ total_quantity_kg: editStockValue, updated_at: new Date().toISOString() })
        .eq('id', productId);

      if (error) throw error;

      setProducts(prev => prev.map(p => 
        p.id === productId ? { ...p, total_quantity_kg: editStockValue } : p
      ));

      toast({ title: isArabic ? 'تم التحديث' : 'Updated successfully' });
    } catch (error) {
      toast({ title: isArabic ? 'خطأ' : 'Error', variant: 'destructive' });
    } finally {
      setUpdatingId(null);
      setEditingStock(null);
    }
  };

  const addToStock = async (productId: string, amount: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const newTotal = (product.total_quantity_kg || 0) + amount;
    
    setUpdatingId(productId);
    try {
      const { error } = await supabase
        .from('roasted_coffee_products')
        .update({ total_quantity_kg: newTotal, updated_at: new Date().toISOString() })
        .eq('id', productId);

      if (error) throw error;

      setProducts(prev => prev.map(p => 
        p.id === productId ? { ...p, total_quantity_kg: newTotal } : p
      ));

      toast({ 
        title: isArabic ? 'تمت الإضافة' : 'Stock Added',
        description: isArabic ? `تمت إضافة ${amount} كجم` : `Added ${amount}kg`
      });
    } catch (error) {
      toast({ title: isArabic ? 'خطأ' : 'Error', variant: 'destructive' });
    } finally {
      setUpdatingId(null);
    }
  };

  const addCustomAmount = (productId: string) => {
    const amount = parseInt(customAddAmount[productId] || "0");
    if (amount > 0) {
      addToStock(productId, amount);
      setCustomAddAmount(prev => ({ ...prev, [productId]: "" }));
    }
  };

  const getRemainingQuantity = (product: RoastedProduct) => {
    return (product.total_quantity_kg || 0) - (product.sold_quantity_kg || 0);
  };

  const totalStock = products.reduce((sum, p) => sum + (p.total_quantity_kg || 0), 0);
  const totalSold = products.reduce((sum, p) => sum + (p.sold_quantity_kg || 0), 0);
  const totalRemaining = totalStock - totalSold;

  const criticalCount = products.filter(p => getStockStatus(p) === 'critical').length;
  const warningCount = products.filter(p => getStockStatus(p) === 'warning').length;
  const healthyCount = products.filter(p => getStockStatus(p) === 'healthy').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-700" />
              {isArabic ? "منتجات البن المحمص" : "Roasted Coffee Products"}
            </CardTitle>
            <CardDescription>
              {isArabic ? "إدارة منتجات التحميص (بالكيلو)" : "Manage your roasted products (in kg)"}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-amber-100 text-amber-800">
              {products.length} {isArabic ? "منتج" : "Products"}
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
            <p className="text-2xl font-bold">{products.length}</p>
            <p className="text-xs text-muted-foreground">{isArabic ? 'عدد المنتجات' : 'Total Products'}</p>
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
                {isArabic ? `🚨 تحذير: ${criticalCount} منتج وصل للحد الحرج!` : `🚨 Critical: ${criticalCount} products need restocking!`}
              </h4>
              <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-1">
                {isArabic 
                  ? "يجب إعادة التحميص فوراً لتجنب فقدان المبيعات"
                  : "Immediate roasting required to avoid lost sales"}
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
                {isArabic ? `⚠️ تنبيه: ${warningCount} منتج على وشك النفاد` : `⚠️ Warning: ${warningCount} products running low`}
              </h4>
              <p className="text-sm text-amber-600/80 dark:text-amber-400/80 mt-1">
                {isArabic 
                  ? "يُنصح بالتخطيط لإعادة التحميص قريباً"
                  : "Plan to roast more soon"}
              </p>
            </div>
          </div>
        )}

        {/* Search and Filter Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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

          {/* Roast Level Filter */}
          <Select value={filterRoast} onValueChange={setFilterRoast}>
            <SelectTrigger>
              <SelectValue placeholder={isArabic ? "درجة التحميص" : "Roast Level"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isArabic ? "كل الدرجات" : "All Levels"}</SelectItem>
              {uniqueRoastLevels.map((level) => (
                <SelectItem key={level} value={level}>{level}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger>
              <SelectValue placeholder={isArabic ? "الحالة" : "Status"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isArabic ? "كل الحالات" : "All Status"}</SelectItem>
              <SelectItem value="healthy">{isArabic ? "🟢 متوفر" : "🟢 Healthy"}</SelectItem>
              <SelectItem value="warning">{isArabic ? "🟡 منخفض" : "🟡 Low"}</SelectItem>
              <SelectItem value="critical">{isArabic ? "🔴 نفد" : "🔴 Critical"}</SelectItem>
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
              ? `عرض ${filteredProducts.length} من ${products.length} منتج`
              : `Showing ${filteredProducts.length} of ${products.length} products`}
          </p>
        )}

        {/* Table */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>{isArabic ? 'لا توجد منتجات' : 'No products yet'}</p>
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isArabic ? "المنتج" : "Product"}</TableHead>
                  <TableHead>{isArabic ? "درجة التحميص" : "Roast Level"}</TableHead>
                  <TableHead className="text-center">{isArabic ? "المخزون (كجم)" : "Stock (kg)"}</TableHead>
                  <TableHead className="text-center">{isArabic ? "المباع" : "Sold"}</TableHead>
                  <TableHead className="text-center">{isArabic ? "المتبقي" : "Remaining"}</TableHead>
                  <TableHead>{isArabic ? "الحالة" : "Status"}</TableHead>
                  <TableHead>{isArabic ? "إضافة مخزون" : "Add Stock"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => {
                  const stockStatus = getStockStatus(product);
                  const remaining = getRemainingQuantity(product);
                  const soldPercentage = product.total_quantity_kg 
                    ? (((product.sold_quantity_kg || 0) / product.total_quantity_kg) * 100).toFixed(0)
                    : 0;
                  
                  return (
                    <TableRow key={product.id} className={`${getStockBorderColor(stockStatus)} border-b`}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${
                            stockStatus === 'critical' ? 'bg-red-500 animate-pulse' :
                            stockStatus === 'warning' ? 'bg-amber-500' : 'bg-green-500'
                          }`}></div>
                          <span className="font-semibold">{product.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {product.roast_level || (isArabic ? 'عادي' : 'Regular')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {editingStock === product.id ? (
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
                              onClick={() => saveStockEdit(product.id)}
                              disabled={updatingId === product.id}
                            >
                              {updatingId === product.id ? (
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
                            <span className="text-lg font-bold">{product.total_quantity_kg || 0}</span>
                            <span className="text-xs text-muted-foreground">{isArabic ? 'كجم' : 'kg'}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2"
                              onClick={() => startEditStock(product)}
                            >
                              <Edit className="w-3 h-3 mr-1" />
                              <span className="text-xs">{isArabic ? 'تعديل' : 'Edit'}</span>
                            </Button>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-lg font-bold text-blue-600">{product.sold_quantity_kg || 0}</span>
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
                          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all ${
                                stockStatus === 'critical' ? 'bg-red-500' :
                                stockStatus === 'warning' ? 'bg-amber-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(100, (remaining / (product.total_quantity_kg || 1)) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStockColor(stockStatus)}>
                          {stockStatus === 'critical' 
                            ? (isArabic ? '🔴 نفد' : '🔴 Out')
                            : stockStatus === 'warning'
                            ? (isArabic ? '🟡 منخفض' : '🟡 Low')
                            : (isArabic ? '🟢 متوفر' : '🟢 Good')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-2">
                          {/* Quick add buttons */}
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => addToStock(product.id, 5)}
                              disabled={updatingId === product.id}
                              className="gap-1 text-xs"
                            >
                              +5
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => addToStock(product.id, 10)}
                              disabled={updatingId === product.id}
                              className="gap-1 text-xs"
                            >
                              +10
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => addToStock(product.id, 25)}
                              disabled={updatingId === product.id}
                              className="gap-1 text-xs"
                            >
                              +25
                            </Button>
                          </div>
                          {/* Custom amount input */}
                          <div className="flex gap-1">
                            <Input
                              type="number"
                              placeholder={isArabic ? "كجم" : "kg"}
                              value={customAddAmount[product.id] || ""}
                              onChange={(e) => setCustomAddAmount(prev => ({ 
                                ...prev, 
                                [product.id]: e.target.value 
                              }))}
                              className="w-16 h-8 text-center text-sm"
                              min="1"
                            />
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => addCustomAmount(product.id)}
                              disabled={!customAddAmount[product.id] || parseInt(customAddAmount[product.id]) <= 0 || updatingId === product.id}
                              className="h-8"
                            >
                              {updatingId === product.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Plus className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RoasterInventoryManager;
