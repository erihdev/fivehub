import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Star, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Review {
  id: string;
  rating: number;
  notes: string | null;
  created_at: string;
  user_id: string;
}

interface SupplierReviewsProps {
  supplierId: string;
}

const SupplierReviews = ({ supplierId }: SupplierReviewsProps) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [averageRating, setAverageRating] = useState(0);

  useEffect(() => {
    fetchReviews();
  }, [supplierId]);

  const fetchReviews = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("supplier_ratings")
      .select("*")
      .eq("supplier_id", supplierId)
      .order("created_at", { ascending: false });

    if (data && !error) {
      setReviews(data);
      if (data.length > 0) {
        const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
        setAverageRating(Math.round(avg * 10) / 10);
      }
    }
    setIsLoading(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ar-SA");
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? "fill-yellow-500 text-yellow-500"
                : "text-muted-foreground"
            }`}
          />
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">التقييمات والمراجعات</h3>
        {reviews.length > 0 && (
          <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full">
            <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
            <span className="font-bold">{averageRating}</span>
            <span className="text-muted-foreground text-sm">
              ({reviews.length} تقييم)
            </span>
          </div>
        )}
      </div>

      {reviews.length === 0 ? (
        <p className="text-muted-foreground text-center py-6">
          لا توجد تقييمات بعد. كن أول من يقيم هذا المورد!
        </p>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="bg-muted/30 rounded-lg p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-primary/10 rounded-full p-2">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  {renderStars(review.rating)}
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDate(review.created_at)}
                </span>
              </div>
              {review.notes && (
                <p className="text-sm text-foreground/80 pr-10">
                  {review.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SupplierReviews;
