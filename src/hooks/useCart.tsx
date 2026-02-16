import * as React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface CartItem {
  id: string;
  coffee_id: string;
  supplier_id: string;
  quantity_kg: number;
  coffee?: {
    id: string;
    name: string;
    origin: string | null;
    price: number | null;
    currency: string | null;
    supplier: {
      id: string;
      name: string;
    };
  };
}

interface CartContextType {
  items: CartItem[];
  isLoading: boolean;
  itemCount: number;
  totalBySupplier: Record<string, { supplierName: string; items: CartItem[]; total: number }>;
  addToCart: (coffeeId: string, supplierId: string, quantity?: number) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  isInCart: (coffeeId: string) => boolean;
  refreshCart: () => Promise<void>;
}

const CartContext = React.createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = React.useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  const fetchCart = async () => {
    if (!user) {
      setItems([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          id,
          coffee_id,
          supplier_id,
          quantity_kg,
          coffee:coffee_offerings(
            id,
            name,
            origin,
            price,
            currency,
            supplier:suppliers(id, name)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems((data as any) || []);
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchCart();
  }, [user]);

  const addToCart = async (coffeeId: string, supplierId: string, quantity = 1) => {
    if (!user) {
      toast({
        title: 'يجب تسجيل الدخول',
        description: 'قم بتسجيل الدخول لإضافة المنتجات للسلة',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('cart_items')
        .upsert({
          user_id: user.id,
          coffee_id: coffeeId,
          supplier_id: supplierId,
          quantity_kg: quantity,
        }, {
          onConflict: 'user_id,coffee_id',
        });

      if (error) throw error;

      toast({
        title: 'تمت الإضافة',
        description: 'تمت إضافة المنتج إلى السلة',
      });

      await fetchCart();
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في إضافة المنتج للسلة',
        variant: 'destructive',
      });
    }
  };

  const removeFromCart = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      setItems(items.filter(item => item.id !== itemId));
      toast({
        title: 'تم الحذف',
        description: 'تم حذف المنتج من السلة',
      });
    } catch (error) {
      console.error('Error removing from cart:', error);
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      await removeFromCart(itemId);
      return;
    }

    try {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity_kg: quantity })
        .eq('id', itemId);

      if (error) throw error;

      setItems(items.map(item => 
        item.id === itemId ? { ...item, quantity_kg: quantity } : item
      ));
    } catch (error) {
      console.error('Error updating quantity:', error);
    }
  };

  const clearCart = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
      setItems([]);
    } catch (error) {
      console.error('Error clearing cart:', error);
    }
  };

  const isInCart = (coffeeId: string) => {
    return items.some(item => item.coffee_id === coffeeId);
  };

  // Group items by supplier
  const totalBySupplier = items.reduce((acc, item) => {
    const supplierId = item.supplier_id;
    const supplierName = item.coffee?.supplier?.name || 'مورد';
    const itemTotal = (item.coffee?.price || 0) * item.quantity_kg;

    if (!acc[supplierId]) {
      acc[supplierId] = {
        supplierName,
        items: [],
        total: 0,
      };
    }

    acc[supplierId].items.push(item);
    acc[supplierId].total += itemTotal;

    return acc;
  }, {} as Record<string, { supplierName: string; items: CartItem[]; total: number }>);

  return (
    <CartContext.Provider value={{
      items,
      isLoading,
      itemCount: items.length,
      totalBySupplier,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      isInCart,
      refreshCart: fetchCart,
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = React.useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
