import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Heart, Package, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface CoffeeActionsProps {
  coffeeId: string;
  coffeeName: string;
}

const CoffeeActions = ({ coffeeId, coffeeName }: CoffeeActionsProps) => {
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isInInventory, setIsInInventory] = useState(false);
  const [inventoryDialogOpen, setInventoryDialogOpen] = useState(false);
  const [quantity, setQuantity] = useState(10);
  const [minQuantity, setMinQuantity] = useState(5);

  useEffect(() => {
    if (user && coffeeId) {
      checkFavorite();
      checkInventory();
    }
  }, [user, coffeeId]);

  const checkFavorite = async () => {
    const { data } = await supabase
      .from("favorites")
      .select("id")
      .eq("coffee_id", coffeeId)
      .eq("user_id", user?.id)
      .single();
    setIsFavorite(!!data);
  };

  const checkInventory = async () => {
    const { data } = await supabase
      .from("inventory")
      .select("id")
      .eq("coffee_id", coffeeId)
      .eq("user_id", user?.id)
      .single();
    setIsInInventory(!!data);
  };

  const toggleFavorite = async () => {
    if (!user) return;

    if (isFavorite) {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("coffee_id", coffeeId)
        .eq("user_id", user.id);

      if (error) {
        toast({ title: "خطأ", description: "فشل في إزالة العنصر من المفضلة", variant: "destructive" });
      } else {
        setIsFavorite(false);
        toast({ title: "تم", description: "تمت إزالة العنصر من المفضلة" });
      }
    } else {
      const { error } = await supabase
        .from("favorites")
        .insert({ coffee_id: coffeeId, user_id: user.id });

      if (error) {
        toast({ title: "خطأ", description: "فشل في إضافة العنصر للمفضلة", variant: "destructive" });
      } else {
        setIsFavorite(true);
        toast({ title: "تم", description: "تمت إضافة العنصر للمفضلة" });
      }
    }
  };

  const addToInventory = async () => {
    if (!user) return;

    const { error } = await supabase
      .from("inventory")
      .insert({
        coffee_id: coffeeId,
        user_id: user.id,
        quantity_kg: quantity,
        min_quantity_kg: minQuantity,
      });

    if (error) {
      toast({ title: "خطأ", description: "فشل في إضافة العنصر للمخزون", variant: "destructive" });
    } else {
      setIsInInventory(true);
      setInventoryDialogOpen(false);
      toast({ title: "تم", description: "تمت إضافة العنصر للمخزون" });
    }
  };

  if (!user) return null;

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={isFavorite ? "default" : "outline"}
        size="icon"
        onClick={toggleFavorite}
        title={isFavorite ? "إزالة من المفضلة" : "إضافة للمفضلة"}
      >
        <Heart className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
      </Button>

      {!isInInventory && (
        <Dialog open={inventoryDialogOpen} onOpenChange={setInventoryDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon" title="إضافة للمخزون">
              <Package className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>إضافة للمخزون</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">{coffeeName}</p>
              <div>
                <Label>الكمية (كجم)</Label>
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  min="0"
                />
              </div>
              <div>
                <Label>الحد الأدنى للتنبيه (كجم)</Label>
                <Input
                  type="number"
                  value={minQuantity}
                  onChange={(e) => setMinQuantity(Number(e.target.value))}
                  min="0"
                />
              </div>
              <Button onClick={addToInventory} className="w-full">
                <Plus className="ml-2 h-4 w-4" />
                إضافة للمخزون
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {isInInventory && (
        <Button variant="secondary" size="icon" disabled title="موجود في المخزون">
          <Package className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export default CoffeeActions;
