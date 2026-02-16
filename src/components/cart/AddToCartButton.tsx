import { ShoppingCart, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/useCart';
import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';

interface AddToCartButtonProps {
  coffeeId: string;
  supplierId: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showText?: boolean;
}

export const AddToCartButton = ({ 
  coffeeId, 
  supplierId, 
  variant = 'outline',
  size = 'sm',
  showText = true 
}: AddToCartButtonProps) => {
  const { addToCart, isInCart } = useCart();
  const { language } = useLanguage();
  const [isAdding, setIsAdding] = useState(false);
  const inCart = isInCart(coffeeId);
  const isArabic = language === 'ar';

  const handleAdd = async () => {
    if (inCart) return;
    setIsAdding(true);
    await addToCart(coffeeId, supplierId);
    setIsAdding(false);
  };

  if (inCart) {
    return (
      <Button variant="ghost" size={size} disabled className="text-green-600">
        <Check className="w-4 h-4" />
        {showText && <span className="mr-1">{isArabic ? 'في السلة' : 'In Cart'}</span>}
      </Button>
    );
  }

  return (
    <Button 
      variant={variant} 
      size={size} 
      onClick={handleAdd}
      disabled={isAdding}
      className="hover:bg-coffee-gold/10 hover:text-coffee-gold"
    >
      {isAdding ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <ShoppingCart className="w-4 h-4" />
      )}
      {showText && <span className="mr-1">{isArabic ? 'أضف للسلة' : 'Add to Cart'}</span>}
    </Button>
  );
};
