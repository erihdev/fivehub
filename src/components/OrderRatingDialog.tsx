import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Star, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface OrderRatingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  supplierId: string;
  supplierName: string;
  userId: string;
  onSuccess: () => void;
}

const OrderRatingDialog = ({
  open,
  onOpenChange,
  orderId,
  supplierId,
  supplierName,
  userId,
  onSuccess,
}: OrderRatingDialogProps) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const saveRating = async () => {
    if (rating === 0) return;

    setIsLoading(true);

    try {
      // Save the rating
      const { error: ratingError } = await supabase
        .from("supplier_ratings")
        .insert({
          supplier_id: supplierId,
          user_id: userId,
          rating,
          notes: notes || null,
        });

      if (ratingError) {
        // Check if already rated
        if (ratingError.code === '23505') {
          toast.error("لقد قمت بتقييم هذا المورد مسبقاً");
        } else {
          throw ratingError;
        }
      } else {
        // Mark order as rated using any type to bypass type check
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("orders")
          .update({ rated: true })
          .eq("id", orderId);

        toast.success("شكراً لتقييمك!");
        onSuccess();
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Error saving rating:", error);
      toast.error("فشل في حفظ التقييم");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-center">قيّم تجربتك مع {supplierName}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Stars */}
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={`h-10 w-10 transition-colors ${
                    star <= (hoverRating || rating)
                      ? "fill-yellow-500 text-yellow-500"
                      : "text-muted-foreground"
                  }`}
                />
              </button>
            ))}
          </div>
          
          <p className="text-center text-sm text-muted-foreground">
            {rating > 0 ? `${rating} من 5 نجوم` : "اختر تقييمك"}
          </p>

          {/* Notes */}
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="شاركنا رأيك عن جودة المنتج والتوصيل..."
            rows={3}
            className="resize-none"
          />

          {/* Actions */}
          <div className="flex gap-2">
            <Button 
              onClick={saveRating} 
              disabled={rating === 0 || isLoading} 
              className="flex-1"
            >
              {isLoading ? "جاري الحفظ..." : "إرسال التقييم"}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              لاحقاً
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderRatingDialog;