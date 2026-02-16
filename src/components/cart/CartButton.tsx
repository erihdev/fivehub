import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/hooks/useCart';

interface CartButtonProps {
  onClick: () => void;
}

export const CartButton = ({ onClick }: CartButtonProps) => {
  const { itemCount } = useCart();

  return (
    <Button
      variant="outline"
      size="icon"
      className="relative"
      onClick={onClick}
    >
      <ShoppingCart className="w-5 h-5" />
      {itemCount > 0 && (
        <Badge 
          className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs bg-coffee-gold text-primary-foreground"
        >
          {itemCount}
        </Badge>
      )}
    </Button>
  );
};
