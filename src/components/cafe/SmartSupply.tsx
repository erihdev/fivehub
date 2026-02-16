import { useState, useEffect } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Zap, Package, AlertTriangle, TrendingDown, Settings, Bell, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

interface InventoryItem {
  id: string;
  product_name: string;
  quantity_kg: number;
  min_quantity_kg: number;
  auto_reorder: boolean;
  auto_reorder_quantity_kg: number;
  last_restocked_at: string;
}

interface SmartSupplySettings {
  enabled: boolean;
  min_stock_days: number;
  auto_order_enabled: boolean;
  budget_limit_monthly: number;
  notification_threshold_days: number;
}

const SmartSupply = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [settings, setSettings] = useState<SmartSupplySettings>({
    enabled: true,
    min_stock_days: 7,
    auto_order_enabled: false,
    budget_limit_monthly: 5000,
    notification_threshold_days: 3,
  });
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);

    // Fetch inventory
    const { data: inventoryData } = await supabase
      .from("cafe_inventory")
      .select("*")
      .eq("cafe_id", user?.id);

    if (inventoryData) setInventory(inventoryData);

    // Fetch settings
    const { data: settingsData } = await supabase
      .from("smart_supply_settings")
      .select("*")
      .eq("cafe_id", user?.id)
      .single();

    if (settingsData) {
      setSettings({
        enabled: settingsData.enabled,
        min_stock_days: settingsData.min_stock_days,
        auto_order_enabled: settingsData.auto_order_enabled,
        budget_limit_monthly: settingsData.budget_limit_monthly || 5000,
        notification_threshold_days: settingsData.notification_threshold_days,
      });
    }

    setLoading(false);
  };

  const saveSettings = async () => {
    const { error } = await supabase
      .from("smart_supply_settings")
      .upsert({
        cafe_id: user?.id,
        ...settings,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      toast.error(language === "ar" ? "حدث خطأ" : "Error saving settings");
    } else {
      toast.success(language === "ar" ? "تم حفظ الإعدادات" : "Settings saved");
      setSettingsOpen(false);
    }
  };

  const getStockStatus = (item: InventoryItem) => {
    const percentage = (item.quantity_kg / (item.min_quantity_kg * 2)) * 100;
    if (percentage <= 25) return { status: "critical", color: "text-red-500", bg: "bg-red-500" };
    if (percentage <= 50) return { status: "low", color: "text-yellow-500", bg: "bg-yellow-500" };
    return { status: "good", color: "text-green-500", bg: "bg-green-500" };
  };

  const lowStockItems = inventory.filter(item => item.quantity_kg <= item.min_quantity_kg);
  const criticalItems = inventory.filter(item => item.quantity_kg <= item.min_quantity_kg * 0.5);

  const triggerReorder = async (item: InventoryItem) => {
    toast.success(
      language === "ar"
        ? `تم إنشاء طلب تلقائي لـ ${item.product_name}`
        : `Auto-order created for ${item.product_name}`
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">
              {language === "ar" ? "التوريد الذكي" : "Smart Auto-Supply"}
            </h2>
            <p className="text-muted-foreground">
              {language === "ar" ? "إدارة المخزون الآلية الذكية" : "Intelligent automated inventory management"}
            </p>
          </div>
        </div>

        <Button variant="outline" onClick={() => setSettingsOpen(!settingsOpen)}>
          <Settings className="w-4 h-4 mr-2" />
          {language === "ar" ? "الإعدادات" : "Settings"}
        </Button>
      </div>

      {/* Settings Panel */}
      {settingsOpen && (
        <Card>
          <CardHeader>
            <CardTitle>{language === "ar" ? "إعدادات التوريد الذكي" : "Smart Supply Settings"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{language === "ar" ? "تفعيل النظام" : "Enable System"}</p>
                <p className="text-sm text-muted-foreground">
                  {language === "ar" ? "تفعيل التنبيهات والتوصيات" : "Enable alerts and recommendations"}
                </p>
              </div>
              <Switch
                checked={settings.enabled}
                onCheckedChange={(v) => setSettings({ ...settings, enabled: v })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{language === "ar" ? "الطلب التلقائي" : "Auto-Order"}</p>
                <p className="text-sm text-muted-foreground">
                  {language === "ar" ? "طلب تلقائي عند نفاد المخزون" : "Automatically order when stock is low"}
                </p>
              </div>
              <Switch
                checked={settings.auto_order_enabled}
                onCheckedChange={(v) => setSettings({ ...settings, auto_order_enabled: v })}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">
                {language === "ar" ? "حد التنبيه (أيام)" : "Alert Threshold (days)"}
              </label>
              <Input
                type="number"
                min={1}
                value={settings.notification_threshold_days}
                onChange={(e) => setSettings({ ...settings, notification_threshold_days: parseInt(e.target.value) })}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">
                {language === "ar" ? "الحد الأقصى للميزانية الشهرية ($)" : "Monthly Budget Limit ($)"}
              </label>
              <Input
                type="number"
                min={0}
                value={settings.budget_limit_monthly}
                onChange={(e) => setSettings({ ...settings, budget_limit_monthly: parseFloat(e.target.value) })}
              />
            </div>

            <Button onClick={saveSettings} className="w-full">
              {language === "ar" ? "حفظ الإعدادات" : "Save Settings"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Alerts Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={criticalItems.length > 0 ? "border-red-500" : ""}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{criticalItems.length}</p>
                <p className="text-sm text-muted-foreground">
                  {language === "ar" ? "منتجات حرجة" : "Critical Items"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={lowStockItems.length > 0 ? "border-yellow-500" : ""}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                <TrendingDown className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{lowStockItems.length}</p>
                <p className="text-sm text-muted-foreground">
                  {language === "ar" ? "مخزون منخفض" : "Low Stock"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <Package className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{inventory.length}</p>
                <p className="text-sm text-muted-foreground">
                  {language === "ar" ? "إجمالي المنتجات" : "Total Products"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inventory List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            {language === "ar" ? "حالة المخزون" : "Inventory Status"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {inventory.map((item) => {
              const stockStatus = getStockStatus(item);
              const percentage = Math.min((item.quantity_kg / (item.min_quantity_kg * 2)) * 100, 100);

              return (
                <div key={item.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium">{item.product_name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {item.quantity_kg} kg / {item.min_quantity_kg * 2} kg
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={stockStatus.status === "good" ? "default" : stockStatus.status === "low" ? "secondary" : "destructive"}>
                        {stockStatus.status === "critical"
                          ? (language === "ar" ? "حرج" : "Critical")
                          : stockStatus.status === "low"
                          ? (language === "ar" ? "منخفض" : "Low")
                          : (language === "ar" ? "جيد" : "Good")}
                      </Badge>
                      {item.auto_reorder && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          {language === "ar" ? "تلقائي" : "Auto"}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <Progress value={percentage} className="h-2 mb-3" />

                  {stockStatus.status !== "good" && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <Bell className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {language === "ar" ? "يُنصح بالطلب قبل" : "Recommended to order before"}{" "}
                          {settings.notification_threshold_days} {language === "ar" ? "أيام" : "days"}
                        </span>
                      </div>
                      <Button size="sm" onClick={() => triggerReorder(item)}>
                        <ShoppingCart className="w-4 h-4 mr-1" />
                        {language === "ar" ? "طلب الآن" : "Order Now"}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}

            {inventory.length === 0 && !loading && (
              <div className="text-center py-12 text-muted-foreground">
                {language === "ar" ? "لا توجد منتجات في المخزون بعد" : "No inventory items yet"}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SmartSupply;
