import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { usePerformanceRealtimeAlerts } from "@/hooks/usePerformanceRealtimeAlerts";
import { translateOrigin } from "@/lib/countryTranslations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { ArrowRight, ArrowLeft, Package, AlertTriangle, Plus, Minus, Save, RefreshCw } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";

interface InventoryItem {
  id: string;
  coffee_id: string;
  quantity_kg: number;
  min_quantity_kg: number;
  auto_reorder_enabled: boolean;
  auto_reorder_quantity: number;
  notes: string | null;
  coffee_offerings: {
    name: string;
    origin: string | null;
    supplier_id: string;
    unit_type: string | null;
    kg_per_bag: number | null;
    suppliers: {
      name: string;
    };
  };
}

const Inventory = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { language, dir } = useLanguage();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ 
    quantity: number; 
    minQuantity: number;
    autoReorderEnabled: boolean;
    autoReorderQuantity: number;
  }>({ quantity: 0, minQuantity: 5, autoReorderEnabled: false, autoReorderQuantity: 10 });

  // Enable realtime performance alerts
  usePerformanceRealtimeAlerts();

  const isArabic = language === 'ar';
  const BackArrow = isArabic ? ArrowRight : ArrowLeft;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchInventory();
    }
  }, [user]);

  const fetchInventory = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("inventory")
      .select(`
        *,
        coffee_offerings (
          name,
          origin,
          supplier_id,
          unit_type,
          kg_per_bag,
          suppliers (name)
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "خطأ", description: "فشل في تحميل المخزون", variant: "destructive" });
    } else {
      setInventory(data as unknown as InventoryItem[] || []);
    }
    setIsLoading(false);
  };

  const updateInventory = async (id: string) => {
    const { error } = await supabase
      .from("inventory")
      .update({ 
        quantity_kg: editValues.quantity,
        min_quantity_kg: editValues.minQuantity,
        auto_reorder_enabled: editValues.autoReorderEnabled,
        auto_reorder_quantity: editValues.autoReorderQuantity
      })
      .eq("id", id);

    if (error) {
      toast({ title: "خطأ", description: "فشل في تحديث المخزون", variant: "destructive" });
    } else {
      toast({ title: "تم", description: "تم تحديث المخزون بنجاح" });
      setEditingId(null);
      fetchInventory();
    }
  };

  const toggleAutoReorder = async (item: InventoryItem) => {
    const { error } = await supabase
      .from("inventory")
      .update({ auto_reorder_enabled: !item.auto_reorder_enabled })
      .eq("id", item.id);

    if (!error) {
      toast({ 
        title: "تم", 
        description: item.auto_reorder_enabled 
          ? (isArabic ? 'تم إيقاف إعادة الطلب التلقائي' : 'Auto-reorder disabled')
          : (isArabic ? 'تم تفعيل إعادة الطلب التلقائي' : 'Auto-reorder enabled')
      });
      fetchInventory();
    }
  };

  const lowStockItems = inventory.filter(item => item.quantity_kg <= item.min_quantity_kg);
  const autoReorderCount = inventory.filter(item => item.auto_reorder_enabled).length;

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background font-arabic p-6" dir={dir}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {isArabic ? 'إدارة المخزون' : 'Inventory Management'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isArabic ? 'تتبع كميات القهوة الخضراء المتوفرة' : 'Track available green coffee quantities'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              <BackArrow className={`${isArabic ? 'ml-2' : 'mr-2'} h-4 w-4`} />
              {isArabic ? 'العودة للوحة التحكم' : 'Back to Dashboard'}
            </Button>
          </div>
        </div>

        {autoReorderCount > 0 && (
          <Card className="mb-6 border-primary/50 bg-primary/5">
            <CardContent className="py-4 flex items-center gap-3">
              <RefreshCw className="h-5 w-5 text-primary" />
              <span className="text-sm">
                {isArabic 
                  ? `إعادة الطلب التلقائي مفعّل لـ ${autoReorderCount} عنصر`
                  : `Auto-reorder enabled for ${autoReorderCount} items`}
              </span>
            </CardContent>
          </Card>
        )}

        {lowStockItems.length > 0 && (
          <Card className="mb-6 border-destructive/50 bg-destructive/10">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                {isArabic ? `تنبيه: مخزون منخفض (${lowStockItems.length} عنصر)` : `Alert: Low Stock (${lowStockItems.length} items)`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {lowStockItems.map(item => (
                  <Badge key={item.id} variant="destructive" className="gap-1">
                    {item.auto_reorder_enabled && <RefreshCw className="h-3 w-3" />}
                    {item.coffee_offerings.name} - {item.quantity_kg} {isArabic ? 'كجم' : 'kg'}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4">
          {inventory.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{isArabic ? 'لا يوجد عناصر في المخزون' : 'No inventory items'}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {isArabic ? 'يمكنك إضافة عناصر للمخزون من صفحة تفاصيل المورد' : 'Add items from supplier details page'}
                </p>
              </CardContent>
            </Card>
          ) : (
            inventory.map((item) => (
              <Card key={item.id} className={item.quantity_kg <= item.min_quantity_kg ? "border-destructive/50" : ""}>
                <CardContent className="py-4">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{item.coffee_offerings.name}</h3>
                          {item.auto_reorder_enabled && (
                            <Badge variant="outline" className="text-primary border-primary gap-1">
                              <RefreshCw className="h-3 w-3" />
                              {isArabic ? 'تلقائي' : 'Auto'}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {item.coffee_offerings.suppliers?.name} • {translateOrigin(item.coffee_offerings.origin, language)}
                        </p>
                        {item.coffee_offerings.unit_type && (
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {item.coffee_offerings.unit_type === 'bag' 
                                ? (isArabic ? 'خيشة' : 'Bag')
                                : (isArabic ? 'كيلو' : 'Kg')}
                              {item.coffee_offerings.unit_type === 'bag' && item.coffee_offerings.kg_per_bag && (
                                <span className="mr-1">
                                  ({item.coffee_offerings.kg_per_bag} {isArabic ? 'كجم' : 'kg'})
                                </span>
                              )}
                            </Badge>
                          </div>
                        )}
                      </div>

                      {editingId === item.id ? (
                        <div className="flex items-center gap-2">
                          <Button onClick={() => updateInventory(item.id)} size="sm">
                            <Save className={`h-4 w-4 ${isArabic ? 'ml-1' : 'mr-1'}`} />
                            {isArabic ? 'حفظ' : 'Save'}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                            {isArabic ? 'إلغاء' : 'Cancel'}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <p className={`text-2xl font-bold ${item.quantity_kg <= item.min_quantity_kg ? "text-destructive" : "text-primary"}`}>
                              {item.quantity_kg}
                            </p>
                            <p className="text-xs text-muted-foreground">{isArabic ? 'كجم متوفر' : 'kg available'}</p>
                          </div>
                          <div className={`text-center ${isArabic ? 'border-r pr-4' : 'border-l pl-4'}`}>
                            <p className="text-lg text-muted-foreground">{item.min_quantity_kg}</p>
                            <p className="text-xs text-muted-foreground">{isArabic ? 'الحد الأدنى' : 'Minimum'}</p>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setEditingId(item.id);
                              setEditValues({ 
                                quantity: item.quantity_kg, 
                                minQuantity: item.min_quantity_kg,
                                autoReorderEnabled: item.auto_reorder_enabled,
                                autoReorderQuantity: item.auto_reorder_quantity
                              });
                            }}
                          >
                            {isArabic ? 'تعديل' : 'Edit'}
                          </Button>
                        </div>
                      )}
                    </div>

                    {editingId === item.id && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm whitespace-nowrap">{isArabic ? 'الكمية:' : 'Quantity:'}</Label>
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setEditValues(v => ({ ...v, quantity: Math.max(0, v.quantity - 1) }))}>
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              type="number"
                              value={editValues.quantity}
                              onChange={(e) => setEditValues(v => ({ ...v, quantity: Number(e.target.value) }))}
                              className="w-16 text-center h-8"
                            />
                            <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setEditValues(v => ({ ...v, quantity: v.quantity + 1 }))}>
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-sm whitespace-nowrap">{isArabic ? 'الحد الأدنى:' : 'Minimum:'}</Label>
                          <Input
                            type="number"
                            value={editValues.minQuantity}
                            onChange={(e) => setEditValues(v => ({ ...v, minQuantity: Number(e.target.value) }))}
                            className="w-16 text-center h-8"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={editValues.autoReorderEnabled}
                            onCheckedChange={(checked) => setEditValues(v => ({ ...v, autoReorderEnabled: checked }))}
                          />
                          <Label className="text-sm">{isArabic ? 'إعادة طلب تلقائي' : 'Auto-reorder'}</Label>
                        </div>
                        {editValues.autoReorderEnabled && (
                          <div className="flex items-center gap-2">
                            <Label className="text-sm whitespace-nowrap">{isArabic ? 'كمية الطلب:' : 'Order qty:'}</Label>
                            <Input
                              type="number"
                              value={editValues.autoReorderQuantity}
                              onChange={(e) => setEditValues(v => ({ ...v, autoReorderQuantity: Number(e.target.value) }))}
                              className="w-16 text-center h-8"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {!editingId && (
                      <div className="flex items-center gap-2 pt-2 border-t">
                        <Switch
                          checked={item.auto_reorder_enabled}
                          onCheckedChange={() => toggleAutoReorder(item)}
                        />
                        <Label className="text-sm text-muted-foreground">
                          {isArabic ? 'إعادة طلب تلقائي' : 'Auto-reorder'}
                          {item.auto_reorder_enabled && (
                            <span className="text-primary mr-1">
                              ({item.auto_reorder_quantity} {isArabic ? 'كجم' : 'kg'})
                            </span>
                          )}
                        </Label>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </main>
  );
};

export default Inventory;
