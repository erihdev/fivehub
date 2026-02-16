import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCart } from '@/hooks/useCart';
import { useLanguage } from '@/hooks/useLanguage';
import { Trash2, Minus, Plus, ShoppingBag, Package, Loader2 } from 'lucide-react';

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigateToCheckout: () => void;
}

export const CartDrawer = ({ open, onOpenChange, onNavigateToCheckout }: CartDrawerProps) => {
  const { items, totalBySupplier, removeFromCart, updateQuantity, isLoading } = useCart();
  const { language } = useLanguage();
  const isArabic = language === 'ar';

  const handleCheckout = () => {
    onOpenChange(false);
    onNavigateToCheckout();
  };

  const grandTotal = Object.values(totalBySupplier).reduce((sum, supplier) => sum + supplier.total, 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={isArabic ? 'left' : 'right'} className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-coffee-gold" />
            {isArabic ? 'سلة الطلبات' : 'Shopping Cart'}
            <Badge variant="secondary">{items.length}</Badge>
          </SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-coffee-gold" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <Package className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">
              {isArabic ? 'السلة فارغة' : 'Cart is empty'}
            </h3>
            <p className="text-muted-foreground text-sm">
              {isArabic 
                ? 'أضف محاصيل القهوة من صفحات الموردين' 
                : 'Add coffee from supplier pages'}
            </p>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-6 py-4">
                {Object.entries(totalBySupplier).map(([supplierId, supplierData]) => (
                  <Card key={supplierId} className="border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                          <Package className="w-4 h-4 text-coffee-gold" />
                          {supplierData.supplierName}
                        </h4>
                        <Badge variant="outline" className="text-xs">
                          {supplierData.items.length} {isArabic ? 'منتج' : 'items'}
                        </Badge>
                      </div>
                      
                      <div className="space-y-3">
                        {supplierData.items.map((item) => (
                          <div key={item.id} className="flex items-start gap-3 p-2 rounded-lg bg-muted/30">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {item.coffee?.name}
                              </p>
                              {item.coffee?.origin && (
                                <p className="text-xs text-muted-foreground">
                                  {item.coffee.origin}
                                </p>
                              )}
                              <p className="text-sm font-semibold text-coffee-gold mt-1">
                                {item.coffee?.price} {item.coffee?.currency || 'SAR'}/kg
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => updateQuantity(item.id, item.quantity_kg - 1)}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <Input
                                type="number"
                                value={item.quantity_kg}
                                onChange={(e) => updateQuantity(item.id, Number(e.target.value))}
                                className="w-14 h-7 text-center text-sm"
                                min={1}
                              />
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => updateQuantity(item.id, item.quantity_kg + 1)}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                            
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => removeFromCart(item.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      
                      <Separator className="my-3" />
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {isArabic ? 'إجمالي المورد:' : 'Supplier total:'}
                        </span>
                        <span className="font-bold">
                          {supplierData.total.toFixed(2)} SAR
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>

            <SheetFooter className="flex-col gap-3 mt-4 sm:flex-col">
              <div className="flex items-center justify-between w-full p-3 bg-muted rounded-lg">
                <span className="font-semibold">
                  {isArabic ? 'الإجمالي الكلي:' : 'Grand Total:'}
                </span>
                <span className="text-xl font-bold text-primary">
                  {grandTotal.toFixed(2)} SAR
                </span>
              </div>
              
              <Button 
                className="w-full"
                size="lg"
                onClick={handleCheckout}
              >
                <ShoppingBag className="w-5 h-5 ml-2" />
                {isArabic ? 'إتمام الطلب' : 'Checkout'}
              </Button>
              
              <p className="text-xs text-center text-muted-foreground">
                {isArabic 
                  ? `سيتم إرسال ${Object.keys(totalBySupplier).length} طلب مباشرة للموردين`
                  : `${Object.keys(totalBySupplier).length} orders will be sent directly to suppliers`}
              </p>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
