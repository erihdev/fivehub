import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Star, PackageCheck } from "lucide-react";

interface SupplierRatingProps {
  supplierId: string;
}

const SupplierRating = ({ supplierId }: SupplierRatingProps) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [notes, setNotes] = useState("");
  const [existingRating, setExistingRating] = useState<{ id: string; rating: number; notes: string | null } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasDeliveredOrder, setHasDeliveredOrder] = useState(false);
  const [checkingEligibility, setCheckingEligibility] = useState(true);

  useEffect(() => {
    if (user && supplierId) {
      checkDeliveredOrders();
      fetchExistingRating();
    } else {
      setCheckingEligibility(false);
    }
  }, [user, supplierId]);

  const checkDeliveredOrders = async () => {
    if (!user?.id) return;
    setCheckingEligibility(true);
    
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("orders")
        .select("id")
        .eq("supplier_id", supplierId)
        .eq("buyer_id", user.id)
        .eq("status", "delivered")
        .limit(1);

      setHasDeliveredOrder(!!data && data.length > 0);
    } catch (error) {
      console.error("Error checking delivered orders:", error);
    }
    setCheckingEligibility(false);
  };

  const fetchExistingRating = async () => {
    if (!user?.id) return;
    
    const { data } = await supabase
      .from("supplier_ratings")
      .select("*")
      .eq("supplier_id", supplierId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setExistingRating(data);
      setRating(data.rating);
      setNotes(data.notes || "");
    }
  };

  const saveRating = async () => {
    if (!user || rating === 0) return;

    setIsLoading(true);

    if (existingRating) {
      const { error } = await supabase
        .from("supplier_ratings")
        .update({ rating, notes })
        .eq("id", existingRating.id);

      if (error) {
        toast({ title: "خطأ", description: "فشل في تحديث التقييم", variant: "destructive" });
      } else {
        toast({ title: "تم", description: "تم تحديث التقييم بنجاح" });
      }
    } else {
      const { error } = await supabase
        .from("supplier_ratings")
        .insert({ supplier_id: supplierId, user_id: user.id, rating, notes });

      if (error) {
        toast({ title: "خطأ", description: "فشل في حفظ التقييم", variant: "destructive" });
      } else {
        toast({ title: "تم", description: "تم حفظ التقييم بنجاح" });
        fetchExistingRating();
      }
    }

    setIsLoading(false);
  };

  if (!user) return null;

  if (checkingEligibility) {
    return (
      <div className="bg-muted/30 rounded-lg p-4">
        <div className="animate-pulse h-6 bg-muted rounded w-32"></div>
      </div>
    );
  }

  if (!hasDeliveredOrder && !existingRating) {
    return (
      <div className="bg-muted/30 rounded-lg p-4 space-y-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <PackageCheck className="h-5 w-5" />
          <span className="text-sm">يمكنك تقييم المورد بعد استلام طلبك</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-muted/30 rounded-lg p-4 space-y-3">
      <h4 className="font-semibold">تقييمك للمورد</h4>
      
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="p-1 transition-transform hover:scale-110"
          >
            <Star
              className={`h-6 w-6 transition-colors ${
                star <= (hoverRating || rating)
                  ? "fill-yellow-500 text-yellow-500"
                  : "text-muted-foreground"
              }`}
            />
          </button>
        ))}
        <span className="mr-2 text-sm text-muted-foreground">
          {rating > 0 ? `${rating} من 5` : "اختر تقييمك"}
        </span>
      </div>

      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="ملاحظات عن تجربتك مع هذا المورد..."
        rows={2}
      />

      <Button onClick={saveRating} disabled={rating === 0 || isLoading} size="sm">
        {existingRating ? "تحديث التقييم" : "حفظ التقييم"}
      </Button>
    </div>
  );
};

export default SupplierRating;