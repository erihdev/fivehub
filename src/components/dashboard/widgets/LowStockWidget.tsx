import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface LowStockItem {
  id: string;
  name: string;
  quantity: number;
  minQuantity: number;
}

export const LowStockWidget = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [items, setItems] = useState<LowStockItem[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchLowStock = async () => {
      const { data } = await supabase
        .from('inventory')
        .select(`
          id,
          quantity_kg,
          min_quantity_kg,
          coffee:coffee_offerings(name)
        `)
        .eq('user_id', user.id);

      if (data) {
        const lowStock = data
          .filter(item => item.quantity_kg <= item.min_quantity_kg)
          .map(item => ({
            id: item.id,
            name: (item.coffee as any)?.name || 'Unknown',
            quantity: item.quantity_kg,
            minQuantity: item.min_quantity_kg,
          }));
        setItems(lowStock);
      }
    };

    fetchLowStock();
  }, [user]);

  const isArabic = language === 'ar';

  if (items.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        {isArabic ? 'لا توجد عناصر منخفضة المخزون' : 'No low stock items'}
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-48 overflow-auto">
      {items.map(item => (
        <div
          key={item.id}
          className="flex items-center justify-between p-2 bg-destructive/10 rounded-lg"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <span className="text-sm font-medium truncate max-w-[120px]">{item.name}</span>
          </div>
          <Badge variant="destructive" className="text-xs">
            {item.quantity} / {item.minQuantity} {isArabic ? 'كجم' : 'kg'}
          </Badge>
        </div>
      ))}
    </div>
  );
};

export default LowStockWidget;
