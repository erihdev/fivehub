import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Package, ArrowLeft, ArrowRight, RefreshCw, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface LowStockItem {
  id: string;
  coffee_id: string;
  quantity_kg: number;
  min_quantity_kg: number;
  coffee_offerings: {
    name: string;
    supplier_id: string;
    price: number | null;
    suppliers?: {
      name: string;
    };
  } | null;
}

const InventoryAlertCard = () => {
  const { user } = useAuth();
  const { language, dir } = useLanguage();
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reorderItem, setReorderItem] = useState<LowStockItem | null>(null);
  const [reorderQuantity, setReorderQuantity] = useState('');
  const [isReordering, setIsReordering] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const isRtl = dir === 'rtl';
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;

  useEffect(() => {
    if (!user) return;

    const fetchLowStock = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("inventory")
        .select(`
          id,
          coffee_id,
          quantity_kg,
          min_quantity_kg,
          coffee_offerings (
            name,
            supplier_id,
            price,
            suppliers (name)
          )
        `)
        .eq("user_id", user.id);

      if (!error && data) {
        const lowStock = (data as unknown as LowStockItem[]).filter(
          item => item.quantity_kg <= item.min_quantity_kg
        );
        setLowStockItems(lowStock);
      }
      setIsLoading(false);
    };

    fetchLowStock();

    const channel = supabase
      .channel('inventory-dashboard-alert')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchLowStock();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleReorder = async () => {
    if (!user || !reorderItem || !reorderQuantity) return;

    setIsReordering(true);
    
    const quantity = Number(reorderQuantity);
    const pricePerKg = reorderItem.coffee_offerings?.price || null;
    const totalPrice = pricePerKg ? quantity * pricePerKg : null;

    const { error } = await supabase.from("orders").insert({
      user_id: user.id,
      supplier_id: reorderItem.coffee_offerings?.supplier_id,
      coffee_id: reorderItem.coffee_id,
      quantity_kg: quantity,
      price_per_kg: pricePerKg,
      total_price: totalPrice,
      order_date: format(new Date(), "yyyy-MM-dd"),
      notes: language === 'ar' 
        ? `إعادة طلب تلقائي - المخزون المتبقي: ${reorderItem.quantity_kg} كجم`
        : `Auto reorder - Remaining stock: ${reorderItem.quantity_kg} kg`,
    });

    if (error) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل في إنشاء الطلب' : 'Failed to create order',
        variant: 'destructive',
      });
    } else {
      toast({
        title: language === 'ar' ? 'تم' : 'Success',
        description: language === 'ar' 
          ? `تم إنشاء طلب ${quantity} كجم من ${reorderItem.coffee_offerings?.name}`
          : `Created order for ${quantity} kg of ${reorderItem.coffee_offerings?.name}`,
      });
      setDialogOpen(false);
      setReorderItem(null);
      setReorderQuantity('');
    }
    
    setIsReordering(false);
  };

  const openReorderDialog = (item: LowStockItem) => {
    setReorderItem(item);
    // Suggest reorder quantity to reach minimum + buffer
    const suggestedQty = Math.max(item.min_quantity_kg * 2 - item.quantity_kg, item.min_quantity_kg);
    setReorderQuantity(String(Math.ceil(suggestedQty)));
    setDialogOpen(true);
  };

  if (isLoading || lowStockItems.length === 0) {
    return null;
  }

  const outOfStock = lowStockItems.filter(item => item.quantity_kg === 0);
  const lowStock = lowStockItems.filter(item => item.quantity_kg > 0);

  return (
    <>
      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {language === 'ar' ? 'تنبيهات المخزون' : 'Inventory Alerts'}
            </div>
            <Link to="/inventory">
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive/80">
                {language === 'ar' ? 'إدارة المخزون' : 'Manage Inventory'}
                <ArrowIcon className={`h-4 w-4 ${isRtl ? 'mr-1' : 'ml-1'}`} />
              </Button>
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {outOfStock.length > 0 && (
            <div>
              <p className="text-sm font-medium text-destructive mb-2 flex items-center gap-1">
                🚨 {language === 'ar' ? 'نفاد المخزون' : 'Out of Stock'} ({outOfStock.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {outOfStock.map(item => (
                  <Badge 
                    key={item.id} 
                    variant="destructive" 
                    className="gap-1 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => openReorderDialog(item)}
                  >
                    <RefreshCw className="h-3 w-3" />
                    {item.coffee_offerings?.name || 'قهوة'}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {lowStock.length > 0 && (
            <div>
              <p className="text-sm font-medium text-amber-600 mb-2 flex items-center gap-1">
                ⚠️ {language === 'ar' ? 'مخزون منخفض' : 'Low Stock'} ({lowStock.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {lowStock.map(item => (
                  <Badge 
                    key={item.id} 
                    variant="outline" 
                    className="border-amber-500 text-amber-600 gap-1 cursor-pointer hover:bg-amber-50 transition-colors"
                    onClick={() => openReorderDialog(item)}
                  >
                    <RefreshCw className="h-3 w-3" />
                    {item.coffee_offerings?.name || 'قهوة'} - {item.quantity_kg} {language === 'ar' ? 'كجم' : 'kg'}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            {language === 'ar' ? 'اضغط على المحصول لإعادة الطلب' : 'Click on item to reorder'}
          </p>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm" dir={dir}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              {language === 'ar' ? 'إعادة الطلب' : 'Reorder'}
            </DialogTitle>
          </DialogHeader>
          {reorderItem && (
            <div className="space-y-4 py-2">
              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <p className="font-medium">{reorderItem.coffee_offerings?.name}</p>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'المورد' : 'Supplier'}: {reorderItem.coffee_offerings?.suppliers?.name || '-'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'المخزون الحالي' : 'Current stock'}: {reorderItem.quantity_kg} {language === 'ar' ? 'كجم' : 'kg'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'الحد الأدنى' : 'Minimum'}: {reorderItem.min_quantity_kg} {language === 'ar' ? 'كجم' : 'kg'}
                </p>
              </div>

              <div>
                <Label>{language === 'ar' ? 'الكمية المطلوبة (كجم)' : 'Order Quantity (kg)'}</Label>
                <Input
                  type="number"
                  value={reorderQuantity}
                  onChange={(e) => setReorderQuantity(e.target.value)}
                  min="1"
                  className="mt-1"
                />
              </div>

              {reorderItem.coffee_offerings?.price && reorderQuantity && (
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'التكلفة التقديرية' : 'Estimated cost'}: {(Number(reorderQuantity) * reorderItem.coffee_offerings.price).toFixed(2)} SAR
                </p>
              )}

              <Button 
                onClick={handleReorder} 
                className="w-full" 
                disabled={!reorderQuantity || Number(reorderQuantity) <= 0 || isReordering}
              >
                {isReordering ? (
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 ml-2" />
                )}
                {language === 'ar' ? 'إنشاء الطلب' : 'Create Order'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default InventoryAlertCard;
