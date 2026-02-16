import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface BatchQualityRatingProps {
  logId: string;
  currentRating: number | null;
  onRatingUpdate?: () => void;
}

const BatchQualityRating = ({ logId, currentRating, onRatingUpdate }: BatchQualityRatingProps) => {
  const { language } = useLanguage();
  const [rating, setRating] = useState<number>(currentRating || 0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isArabic = language === 'ar';

  const handleRatingSubmit = async (newRating: number) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("roasting_logs")
        .update({ batch_quality_rating: newRating })
        .eq("id", logId);

      if (error) throw error;

      setRating(newRating);
      toast({
        title: isArabic ? "تم التقييم" : "Rated",
        description: isArabic ? `تم تقييم الدفعة بـ ${newRating} نجوم` : `Batch rated ${newRating} stars`,
      });
      
      onRatingUpdate?.();
    } catch (error) {
      console.error("Error updating rating:", error);
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "حدث خطأ أثناء التقييم" : "Error updating rating",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={isSubmitting}
          onClick={() => handleRatingSubmit(star)}
          onMouseEnter={() => setHoveredRating(star)}
          onMouseLeave={() => setHoveredRating(0)}
          className={cn(
            "transition-colors",
            isSubmitting && "opacity-50 cursor-not-allowed"
          )}
        >
          <Star
            className={cn(
              "h-5 w-5 transition-colors",
              (hoveredRating >= star || rating >= star)
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground"
            )}
          />
        </button>
      ))}
    </div>
  );
};

export default BatchQualityRating;
