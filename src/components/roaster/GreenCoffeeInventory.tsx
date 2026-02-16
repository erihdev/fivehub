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
  Leaf, AlertTriangle, Search, X, Loader2, Edit, Check, Plus
} from "lucide-react";

interface GreenCoffee {
  id: string;
  name: string;
  origin: string | null;
  variety: string | null;
  process: string | null;
  score: number | null;
  total_quantity_bags: number;
  used_quantity_bags: number;
  kg_per_bag: number;
  min_alert_quantity_bags: number;
  warning_quantity_bags: number;
  supplier_name: string | null;
}

type StockStatus = 'healthy' | 'warning' | 'critical';

const getStockStatus = (coffee: GreenCoffee): StockStatus => {
  const remaining = coffee.total_quantity_bags - coffee.used_quantity_bags;
  if (remaining <= coffee.min_alert_quantity_bags) return 'critical';
  if (remaining <= coffee.warning_quantity_bags) return 'warning';
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

const GreenCoffeeInventory = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [coffees, setCoffees] = useState<GreenCoffee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingStock, setEditingStock] = useState<string | null>(null);
  const [editStockValue, setEditStockValue] = useState<number>(0);
  const [customAddAmount, setCustomAddAmount] = useState<{ [key: string]: string }>({});
  const [searchName, setSearchName] = useState("");
  const [filterOrigin, setFilterOrigin] = useState<string>("all");
  const [filterProcess, setFilterProcess] = useState<string>("all");
  const [filterScore, setFilterScore] = useState<string>("all");

  const isArabic = language === 'ar';

  useEffect(() => {
    if (user) {
      fetchGreenCoffee();
      
      const channel = supabase
        .channel('roaster-green-inventory')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          () => fetchGreenCoffee()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchGreenCoffee = async () => {
    if (!user) return;

    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id,
        quantity_kg,
        status,
        coffee:coffee_offerings(id, name, origin, variety, process, score, kg_per_bag),
        supplier:suppliers(name)
      `)
      .eq('user_id', user.id)
      .eq('status', 'delivered');

    if (!error && orders) {
      const coffeeMap = new Map<string, GreenCoffee>();
      
      orders.forEach((order: any) => {
        const coffee = Array.isArray(order.coffee) ? order.coffee[0] : order.coffee;
        const supplier = Array.isArray(order.supplier) ? order.supplier[0] : order.supplier;
        
        if (coffee) {
          const kgPerBag = coffee.kg_per_bag || 60;
          const bagsFromOrder = Math.floor((order.quantity_kg || 0) / kgPerBag);
          
          const existing = coffeeMap.get(coffee.id);
          if (existing) {
            existing.total_quantity_bags += bagsFromOrder;
          } else {
            coffeeMap.set(coffee.id, {
              id: coffee.id,
              name: coffee.name,
              origin: coffee.origin,
              variety: coffee.variety,
              process: coffee.process,
              score: coffee.score,
              total_quantity_bags: bagsFromOrder,
              used_quantity_bags: 0,
              kg_per_bag: kgPerBag,
              min_alert_quantity_bags: 1,
              warning_quantity_bags: 3,
              supplier_name: supplier?.name || null,
            });
          }
        }
      });
      
      setCoffees(Array.from(coffeeMap.values()));
    }
    setIsLoading(false);
  };

  const uniqueOrigins = useMemo(() => {
    const origins = coffees.map(c => c.origin).filter(Boolean) as string[];
    return [...new Set(origins)].sort();
  }, [coffees]);

  const uniqueProcesses = useMemo(() => {
    const processes = coffees.map(c => c.process).filter(Boolean) as string[];
    return [...new Set(processes)].sort();
  }, [coffees]);

  const filteredCoffees = useMemo(() => {
    return coffees.filter(coffee => {
      if (searchName && !coffee.name.toLowerCase().includes(searchName.toLowerCase())) {
        return false;
      }
      if (filterOrigin !== "all" && coffee.origin !== filterOrigin) {
        return false;
      }
      if (filterProcess !== "all" && coffee.process !== filterProcess) {
        return false;
      }
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

  const startEditStock = (coffee: GreenCoffee) => {
    setEditingStock(coffee.id);
    setEditStockValue(coffee.total_quantity_bags);
  };

  const saveStockEdit = (coffeeId: string) => {
    setCoffees(prev => prev.map(c => 
      c.id === coffeeId ? { ...c, total_quantity_bags: editStockValue } : c
    ));
    setEditingStock(null);
    toast({ title: isArabic ? 'تم التحديث' : 'Updated successfully' });
  };

  const markAsUsed = async (coffeeId: string, amount: number) => {
    const coffee = coffees.find(c => c.id === coffeeId);
    if (!coffee) return;
    
    const newUsed = coffee.used_quantity_bags + amount;
    
    setCoffees(prev => prev.map(c => 
      c.id === coffeeId ? { ...c, used_quantity_bags: newUsed } : c
    ));
    
    toast({
      title: isArabic ? "تم التسجيل" : "Recorded",
      description: isArabic ? `تم استخدام ${amount} خيشة للتحميص` : `Used ${amount} bags for roasting`,
    });
  };

  const addCustomAmount = (coffeeId: string) => {
    const amount = parseInt(customAddAmount[coffeeId] || "0");
    if (amount > 0) {
      markAsUsed(coffeeId, amount);
      setCustomAddAmount(prev => ({ ...prev, [coffeeId]: "" }));
    }
  };

  const totalBags = coffees.reduce((sum, c) => sum + c.total_quantity_bags, 0);
  const totalUsedBags = coffees.reduce((sum, c) => sum + c.used_quantity_bags, 0);
  const totalRemainingBags = totalBags - totalUsedBags;

  const criticalCount = coffees.filter(c => getStockStatus(c) === 'critical').length;
  const warningCount = coffees.filter(c => getStockStatus(c) === 'warning').length;
  const healthyCount = coffees.filter(c => getStockStatus(c) === 'healthy').length;

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
              <Leaf className="w-5 h-5 text-green-600" />
              {isArabic ? "مخزون البن الأخضر" : "Green Coffee Stock"}
            </CardTitle>
            <CardDescription>
              {isArabic ? "البن المشترى من الموردين (بالخيشة)" : "Coffee purchased from suppliers (in bags)"}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-green-100 text-green-800">
              {coffees.length} {isArabic ? "صنف" : "Items"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stock Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-primary">{totalBags}</p>
            <p className="text-xs text-muted-foreground">{isArabic ? 'المخزون الكلي (خيشة)' : 'Total Stock (bags)'}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{totalUsedBags}</p>
            <p className="text-xs text-muted-foreground">{isArabic ? 'تم تحميصه (خيشة)' : 'Roasted (bags)'}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className={`text-2xl font-bold ${totalRemainingBags <= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {totalRemainingBags}
            </p>
            <p className="text-xs text-muted-foreground">{isArabic ? 'المتبقي (خيشة)' : 'Remaining (bags)'}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold">{coffees.length}</p>
            <p className="text-xs text-muted-foreground">{isArabic ? 'عدد الأصناف' : 'Total Items'}</p>
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
                {isArabic ? `🚨 تحذير: ${criticalCount} صنف وصل للحد الحرج!` : `🚨 Critical: ${criticalCount} items need restocking!`}
              </h4>
              <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-1">
                {isArabic 
                  ? "يجب طلب المزيد من الموردين فوراً"
                  : "Immediate restocking required from suppliers"}
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
                {isArabic ? `⚠️ تنبيه: ${warningCount} صنف على وشك النفاد` : `⚠️ Warning: ${warningCount} items running low`}
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
              ? `عرض ${filteredCoffees.length} من ${coffees.length} صنف`
              : `Showing ${filteredCoffees.length} of ${coffees.length} items`}
          </p>
        )}

        {/* Table */}
        {filteredCoffees.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Leaf className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>{isArabic ? "لا يوجد بن أخضر" : "No green coffee yet"}</p>
            <p className="text-sm mt-1">
              {isArabic 
                ? "اطلب من الموردين لإضافة مخزون" 
                : "Order from suppliers to add stock"}
            </p>
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isArabic ? "الاسم" : "Name"}</TableHead>
                  <TableHead>{isArabic ? "المنشأ" : "Origin"}</TableHead>
                  <TableHead className="text-center">{isArabic ? "المخزون (خيشة)" : "Stock (bags)"}</TableHead>
                  <TableHead className="text-center">{isArabic ? "تم تحميصه" : "Roasted"}</TableHead>
                  <TableHead className="text-center">{isArabic ? "المتبقي" : "Remaining"}</TableHead>
                  <TableHead>{isArabic ? "الحالة" : "Status"}</TableHead>
                  <TableHead>{isArabic ? "تسجيل التحميص" : "Log Roasting"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCoffees.map((coffee) => {
                  const stockStatus = getStockStatus(coffee);
                  const remaining = coffee.total_quantity_bags - coffee.used_quantity_bags;
                  const usedPercentage = coffee.total_quantity_bags 
                    ? ((coffee.used_quantity_bags / coffee.total_quantity_bags) * 100).toFixed(0)
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
                          {coffee.supplier_name && (
                            <span className="text-xs text-muted-foreground">
                              {isArabic ? 'المورد:' : 'Supplier:'} {coffee.supplier_name}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {coffee.kg_per_bag} {isArabic ? 'كجم/خيشة' : 'kg/bag'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{coffee.origin || "-"}</span>
                          {coffee.variety && (
                            <span className="text-xs text-muted-foreground">{coffee.variety}</span>
                          )}
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
                            >
                              <Check className="w-4 h-4 text-green-600" />
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
                            <span className="text-lg font-bold">{coffee.total_quantity_bags}</span>
                            <span className="text-xs text-muted-foreground">{isArabic ? 'خيشة' : 'bags'}</span>
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
                          <span className="text-lg font-bold text-amber-600">{coffee.used_quantity_bags}</span>
                          <span className="text-xs text-muted-foreground">{isArabic ? 'خيشة' : 'bags'}</span>
                          <Badge variant="outline" className="text-xs">
                            {usedPercentage}% {isArabic ? 'محمص' : 'roasted'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <Badge className={`${getStockColor(stockStatus)} text-lg px-3 py-1`}>
                            {remaining}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{isArabic ? 'خيشة متبقية' : 'bags left'}</span>
                          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all ${
                                stockStatus === 'critical' ? 'bg-red-500' :
                                stockStatus === 'warning' ? 'bg-amber-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(100, (remaining / coffee.total_quantity_bags) * 100)}%` }}
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
                              onClick={() => markAsUsed(coffee.id, 1)}
                              disabled={updatingId === coffee.id}
                              className="gap-1 text-xs"
                            >
                              +1
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => markAsUsed(coffee.id, 2)}
                              disabled={updatingId === coffee.id}
                              className="gap-1 text-xs"
                            >
                              +2
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => markAsUsed(coffee.id, 5)}
                              disabled={updatingId === coffee.id}
                              className="gap-1 text-xs"
                            >
                              +5
                            </Button>
                          </div>
                          {/* Custom amount input */}
                          <div className="flex gap-1">
                            <Input
                              type="number"
                              placeholder={isArabic ? "عدد" : "Qty"}
                              value={customAddAmount[coffee.id] || ""}
                              onChange={(e) => setCustomAddAmount(prev => ({ 
                                ...prev, 
                                [coffee.id]: e.target.value 
                              }))}
                              className="w-16 h-8 text-center text-sm"
                              min="1"
                            />
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => addCustomAmount(coffee.id)}
                              disabled={!customAddAmount[coffee.id] || parseInt(customAddAmount[coffee.id]) <= 0}
                              className="h-8"
                            >
                              <Plus className="w-4 h-4" />
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

export default GreenCoffeeInventory;
