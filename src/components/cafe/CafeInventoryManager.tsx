import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Package, AlertTriangle, CheckCircle, TrendingDown, 
  Edit2, Save, X, RefreshCw, Search
} from "lucide-react";

interface CafeInventoryItem {
  id: string;
  product_name: string;
  quantity_kg: number;
  total_quantity_kg: number | null;
  sold_quantity_kg: number | null;
  min_quantity_kg: number | null;
  min_alert_quantity_kg: number | null;
  warning_quantity_kg: number | null;
  auto_reorder: boolean | null;
  auto_reorder_quantity_kg: number | null;
  last_restocked_at: string | null;
}

type StockStatus = 'healthy' | 'warning' | 'critical';

const CafeInventoryManager = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [inventory, setInventory] = useState<CafeInventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({
    quantity_kg: 0,
    min_alert_quantity_kg: 5,
    warning_quantity_kg: 10,
    auto_reorder: false,
    auto_reorder_quantity_kg: 5
  });
  const [customAddAmount, setCustomAddAmount] = useState<{ [key: string]: string }>({});
  const [searchName, setSearchName] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const isArabic = language === 'ar';

  useEffect(() => {
    if (user) {
      fetchInventory();
      
      // Subscribe to real-time updates
      const channel = supabase
        .channel('cafe-inventory')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'cafe_inventory' },
          () => fetchInventory()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchInventory = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('cafe_inventory')
      .select('*')
      .eq('cafe_id', user.id)
      .order('updated_at', { ascending: false });

    if (!error && data) {
      setInventory(data);
    }
    setIsLoading(false);
  };

  const getStockStatus = (item: CafeInventoryItem): StockStatus => {
    const remaining = item.quantity_kg || 0;
    const minAlert = item.min_alert_quantity_kg || item.min_quantity_kg || 5;
    const warning = item.warning_quantity_kg || 10;

    if (remaining <= minAlert) return 'critical';
    if (remaining <= warning) return 'warning';
    return 'healthy';
  };

  const getStatusColor = (status: StockStatus): string => {
    switch (status) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'warning': return 'bg-yellow-500 text-white';
      case 'healthy': return 'bg-green-500 text-white';
    }
  };

  const getStatusLabel = (status: StockStatus): string => {
    if (isArabic) {
      switch (status) {
        case 'critical': return 'حرج';
        case 'warning': return 'تحذير';
        case 'healthy': return 'جيد';
      }
    }
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const updateItem = async (id: string) => {
    const { error } = await supabase
      .from('cafe_inventory')
      .update({
        quantity_kg: editValues.quantity_kg,
        min_alert_quantity_kg: editValues.min_alert_quantity_kg,
        warning_quantity_kg: editValues.warning_quantity_kg,
        auto_reorder: editValues.auto_reorder,
        auto_reorder_quantity_kg: editValues.auto_reorder_quantity_kg,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      toast({ title: isArabic ? 'خطأ' : 'Error', variant: 'destructive' });
    } else {
      toast({ title: isArabic ? 'تم التحديث' : 'Updated successfully' });
      setEditingId(null);
      fetchInventory();
    }
  };

  const addToStock = async (itemId: string, amount: number) => {
    const item = inventory.find(i => i.id === itemId);
    if (!item) return;
    
    const newQty = (item.quantity_kg || 0) + amount;
    const newTotal = (item.total_quantity_kg || item.quantity_kg || 0) + amount;
    
    const { error } = await supabase
      .from('cafe_inventory')
      .update({ 
        quantity_kg: newQty,
        total_quantity_kg: newTotal,
        updated_at: new Date().toISOString() 
      })
      .eq('id', itemId);

    if (error) {
      toast({ title: isArabic ? 'خطأ' : 'Error', variant: 'destructive' });
    } else {
      toast({ 
        title: isArabic ? 'تمت الإضافة' : 'Stock Added',
        description: isArabic ? `تمت إضافة ${amount} كجم` : `Added ${amount}kg`
      });
      fetchInventory();
    }
  };

  const totalStock = inventory.reduce((sum, i) => sum + (i.total_quantity_kg || i.quantity_kg || 0), 0);
  const totalSold = inventory.reduce((sum, i) => sum + (i.sold_quantity_kg || 0), 0);
  const totalRemaining = inventory.reduce((sum, i) => sum + (i.quantity_kg || 0), 0);

  const criticalCount = inventory.filter(i => getStockStatus(i) === 'critical').length;
  const warningCount = inventory.filter(i => getStockStatus(i) === 'warning').length;
  const healthyCount = inventory.filter(i => getStockStatus(i) === 'healthy').length;
  const autoReorderCount = inventory.filter(i => i.auto_reorder).length;

  const clearFilters = () => {
    setSearchName("");
    setFilterStatus("all");
  };

  const hasActiveFilters = searchName || filterStatus !== "all";

  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      if (searchName && !item.product_name.toLowerCase().includes(searchName.toLowerCase())) {
        return false;
      }
      if (filterStatus !== "all") {
        const status = getStockStatus(item);
        if (filterStatus !== status) return false;
      }
      return true;
    });
  }, [inventory, searchName, filterStatus]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overall Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-muted/50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-primary">{totalStock.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">{isArabic ? 'المخزون الكلي (كجم)' : 'Total Stock (kg)'}</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">{totalSold.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">{isArabic ? 'تم الاستهلاك (كجم)' : 'Used (kg)'}</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/50">
          <CardContent className="p-3 text-center">
            <p className={`text-2xl font-bold ${totalRemaining <= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {totalRemaining.toFixed(1)}
            </p>
            <p className="text-xs text-muted-foreground">{isArabic ? 'المتبقي (كجم)' : 'Remaining (kg)'}</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{inventory.length}</p>
            <p className="text-xs text-muted-foreground">{isArabic ? 'عدد المنتجات' : 'Total Items'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Status Summary */}
      <div className="flex gap-2 flex-wrap">
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
        {autoReorderCount > 0 && (
          <Badge variant="outline" className="gap-1 border-primary text-primary">
            <RefreshCw className="h-3 w-3" />
            {autoReorderCount} {isArabic ? 'إعادة طلب تلقائي' : 'Auto-reorder'}
          </Badge>
        )}
      </div>

      {/* Critical Stock Alert */}
      {criticalCount > 0 && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-red-700 dark:text-red-400">
              {isArabic ? `🚨 تحذير: ${criticalCount} منتج وصل للحد الحرج!` : `🚨 Critical: ${criticalCount} items need restocking!`}
            </h4>
            <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-1">
              {isArabic 
                ? "يجب إعادة التوفير فوراً لتجنب انقطاع المخزون"
                : "Immediate restocking required to avoid stockouts"}
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
              {isArabic ? `⚠️ تنبيه: ${warningCount} منتج على وشك النفاد` : `⚠️ Warning: ${warningCount} items running low`}
            </h4>
            <p className="text-sm text-amber-600/80 dark:text-amber-400/80 mt-1">
              {isArabic 
                ? "يُنصح بالتخطيط لإعادة التوفير قريباً"
                : "Plan to restock soon"}
            </p>
          </div>
        </div>
      )}

      {/* Inventory List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5" />
            {isArabic ? 'مخزون المقهى' : 'Café Inventory'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filter Section */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

            {/* Status Filter */}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder={isArabic ? "الحالة" : "Status"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isArabic ? "كل الحالات" : "All Status"}</SelectItem>
                <SelectItem value="healthy">{isArabic ? "🟢 جيد" : "🟢 Healthy"}</SelectItem>
                <SelectItem value="warning">{isArabic ? "🟡 تحذير" : "🟡 Warning"}</SelectItem>
                <SelectItem value="critical">{isArabic ? "🔴 حرج" : "🔴 Critical"}</SelectItem>
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
                ? `عرض ${filteredInventory.length} من ${inventory.length} منتج`
                : `Showing ${filteredInventory.length} of ${inventory.length} items`}
            </p>
          )}

          {inventory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>{isArabic ? 'لا يوجد مخزون' : 'No inventory yet'}</p>
              <p className="text-xs mt-1">
                {isArabic ? 'سيتم إضافة المخزون تلقائياً عند استلام الطلبات' : 'Inventory is added automatically when orders are delivered'}
              </p>
            </div>
          ) : filteredInventory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>{isArabic ? 'لا توجد نتائج مطابقة' : 'No matching results'}</p>
              <Button variant="link" onClick={clearFilters} className="mt-2">
                {isArabic ? 'مسح الفلاتر' : 'Clear filters'}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredInventory.map((item) => {
                const status = getStockStatus(item);
                
                return (
                  <div 
                    key={item.id} 
                    className={`p-3 rounded-lg border ${
                      status === 'critical' ? 'border-destructive/50 bg-destructive/5' :
                      status === 'warning' ? 'border-yellow-500/50 bg-yellow-500/5' :
                      'border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{item.product_name}</h4>
                          <Badge className={getStatusColor(status)}>
                            {getStatusLabel(status)}
                          </Badge>
                          {item.auto_reorder && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <RefreshCw className="h-3 w-3" />
                              {isArabic ? 'تلقائي' : 'Auto'}
                            </Badge>
                          )}
                        </div>
                        {item.last_restocked_at && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {isArabic ? 'آخر تخزين:' : 'Last restock:'} {new Date(item.last_restocked_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>

                      {editingId === item.id ? (
                        <div className="flex items-center gap-2">
                          <Button size="sm" onClick={() => updateItem(item.id)}>
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingId(item.id);
                            setEditValues({
                              quantity_kg: item.quantity_kg || 0,
                              min_alert_quantity_kg: item.min_alert_quantity_kg || item.min_quantity_kg || 5,
                              warning_quantity_kg: item.warning_quantity_kg || 10,
                              auto_reorder: item.auto_reorder || false,
                              auto_reorder_quantity_kg: item.auto_reorder_quantity_kg || 5
                            });
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {/* Stock Info */}
                    <div className="grid grid-cols-4 gap-2 mt-2 text-center text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">{isArabic ? 'الإجمالي' : 'Total'}</p>
                        <p className="font-medium">{item.total_quantity_kg || item.quantity_kg || 0} {isArabic ? 'كجم' : 'kg'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">{isArabic ? 'المستهلك' : 'Used'}</p>
                        <p className="font-medium">{item.sold_quantity_kg || 0} {isArabic ? 'كجم' : 'kg'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">{isArabic ? 'المتبقي' : 'Left'}</p>
                        <p className={`font-medium ${
                          status === 'critical' ? 'text-destructive' :
                          status === 'warning' ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {item.quantity_kg || 0} {isArabic ? 'كجم' : 'kg'}
                        </p>
                      </div>
                      <div className="col-span-1">
                        <p className="text-muted-foreground text-xs mb-1">{isArabic ? 'إضافة مخزون' : 'Add Stock'}</p>
                        <div className="flex gap-1 justify-center flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-xs"
                            onClick={() => addToStock(item.id, 1)}
                          >
                            +1
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-xs"
                            onClick={() => addToStock(item.id, 5)}
                          >
                            +5
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-xs"
                            onClick={() => addToStock(item.id, 10)}
                          >
                            +10
                          </Button>
                        </div>
                        {/* Custom amount input */}
                        <div className="flex gap-1 mt-2 justify-center">
                          <Input
                            type="number"
                            placeholder={isArabic ? 'كمية' : 'Qty'}
                            value={customAddAmount[item.id] || ''}
                            onChange={(e) => setCustomAddAmount(prev => ({ ...prev, [item.id]: e.target.value }))}
                            className="h-6 w-16 text-xs text-center"
                            min="0.1"
                            step="0.1"
                          />
                          <Button
                            size="sm"
                            variant="default"
                            className="h-6 px-2 text-xs"
                            onClick={() => {
                              const amount = parseFloat(customAddAmount[item.id] || '0');
                              if (amount > 0) {
                                addToStock(item.id, amount);
                                setCustomAddAmount(prev => ({ ...prev, [item.id]: '' }));
                              }
                            }}
                            disabled={!customAddAmount[item.id] || parseFloat(customAddAmount[item.id]) <= 0}
                          >
                            {isArabic ? 'إضافة' : 'Add'}
                          </Button>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">{isArabic ? 'كجم' : 'kg'}</p>
                      </div>
                    </div>

                    {/* Edit Form */}
                    {editingId === item.id && (
                      <div className="space-y-3 mt-3 pt-3 border-t">
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <Label className="text-xs">{isArabic ? 'الكمية' : 'Quantity'}</Label>
                            <Input
                              type="number"
                              value={editValues.quantity_kg}
                              onChange={(e) => setEditValues(v => ({ ...v, quantity_kg: Number(e.target.value) }))}
                              className="h-8"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">{isArabic ? 'حد التحذير' : 'Warning'}</Label>
                            <Input
                              type="number"
                              value={editValues.warning_quantity_kg}
                              onChange={(e) => setEditValues(v => ({ ...v, warning_quantity_kg: Number(e.target.value) }))}
                              className="h-8"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">{isArabic ? 'حد الخطر' : 'Critical'}</Label>
                            <Input
                              type="number"
                              value={editValues.min_alert_quantity_kg}
                              onChange={(e) => setEditValues(v => ({ ...v, min_alert_quantity_kg: Number(e.target.value) }))}
                              className="h-8"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={editValues.auto_reorder}
                            onCheckedChange={(checked) => setEditValues(v => ({ ...v, auto_reorder: checked }))}
                          />
                          <Label className="text-sm">{isArabic ? 'إعادة طلب تلقائي' : 'Auto-reorder'}</Label>
                          {editValues.auto_reorder && (
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={editValues.auto_reorder_quantity_kg}
                                onChange={(e) => setEditValues(v => ({ ...v, auto_reorder_quantity_kg: Number(e.target.value) }))}
                                className="w-16 h-8"
                              />
                              <span className="text-xs text-muted-foreground">kg</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CafeInventoryManager;
