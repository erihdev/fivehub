import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Star, CheckCircle, MessageSquare, Package, Truck, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Review {
  id: string;
  cafe_id: string;
  order_id: string;
  rating: number;
  review_text: string | null;
  quality_rating: number | null;
  delivery_rating: number | null;
  communication_rating: number | null;
  order_details: any;
  roaster_response: string | null;
  roaster_responded_at: string | null;
  created_at: string;
}

export const VerifiedReviewsManager = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [response, setResponse] = useState('');
  const [stats, setStats] = useState({ avg: 0, total: 0, quality: 0, delivery: 0, communication: 0 });

  useEffect(() => {
    fetchReviews();
  }, [user]);

  const fetchReviews = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('verified_roaster_reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setReviews(data || []);
      
      // Calculate stats
      if (data && data.length > 0) {
        const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
        const quality = data.filter(r => r.quality_rating).reduce((sum, r) => sum + (r.quality_rating || 0), 0) / data.filter(r => r.quality_rating).length || 0;
        const delivery = data.filter(r => r.delivery_rating).reduce((sum, r) => sum + (r.delivery_rating || 0), 0) / data.filter(r => r.delivery_rating).length || 0;
        const communication = data.filter(r => r.communication_rating).reduce((sum, r) => sum + (r.communication_rating || 0), 0) / data.filter(r => r.communication_rating).length || 0;
        
        setStats({ avg, total: data.length, quality, delivery, communication });
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRespond = async (reviewId: string) => {
    if (!response.trim()) return;
    
    try {
      const { error } = await supabase
        .from('verified_roaster_reviews')
        .update({
          roaster_response: response,
          roaster_responded_at: new Date().toISOString()
        })
        .eq('id', reviewId);

      if (error) throw error;
      
      toast.success('تم إرسال الرد بنجاح');
      setRespondingTo(null);
      setResponse('');
      fetchReviews();
    } catch (error) {
      toast.error('حدث خطأ');
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
          />
        ))}
      </div>
    );
  };

  if (isLoading) {
    return <div className="text-center py-8">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border-yellow-500/30">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              <span className="text-2xl font-bold">{stats.avg.toFixed(1)}</span>
            </div>
            <p className="text-xs text-muted-foreground">التقييم العام</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-primary/20 to-primary/10 border-primary/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">إجمالي التقييمات</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Package className="h-4 w-4 text-green-500" />
              <span className="text-lg font-bold">{stats.quality.toFixed(1)}</span>
            </div>
            <p className="text-xs text-muted-foreground">جودة المنتج</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Truck className="h-4 w-4 text-blue-500" />
              <span className="text-lg font-bold">{stats.delivery.toFixed(1)}</span>
            </div>
            <p className="text-xs text-muted-foreground">التوصيل</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Phone className="h-4 w-4 text-purple-500" />
              <span className="text-lg font-bold">{stats.communication.toFixed(1)}</span>
            </div>
            <p className="text-xs text-muted-foreground">التواصل</p>
          </CardContent>
        </Card>
      </div>

      {/* Reviews List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            التقييمات الموثقة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {reviews.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              لا توجد تقييمات بعد
            </div>
          ) : (
            reviews.map((review) => (
              <div key={review.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {renderStars(review.rating)}
                      <Badge variant="outline" className="text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        مشتري موثق
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(review.created_at), 'dd MMMM yyyy', { locale: ar })}
                    </p>
                  </div>
                  
                  {review.order_details && (
                    <div className="text-xs text-muted-foreground text-left">
                      <p>طلب: {(review.order_details as any)?.product_name}</p>
                      <p>{(review.order_details as any)?.quantity_kg} كجم</p>
                    </div>
                  )}
                </div>
                
                {/* Detailed Ratings */}
                <div className="flex gap-4 text-sm">
                  {review.quality_rating && (
                    <span className="flex items-center gap-1">
                      <Package className="h-3 w-3" /> الجودة: {review.quality_rating}/5
                    </span>
                  )}
                  {review.delivery_rating && (
                    <span className="flex items-center gap-1">
                      <Truck className="h-3 w-3" /> التوصيل: {review.delivery_rating}/5
                    </span>
                  )}
                  {review.communication_rating && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" /> التواصل: {review.communication_rating}/5
                    </span>
                  )}
                </div>
                
                {review.review_text && (
                  <p className="text-sm">{review.review_text}</p>
                )}
                
                {/* Roaster Response */}
                {review.roaster_response ? (
                  <div className="bg-muted/50 rounded-lg p-3 mt-2">
                    <p className="text-xs text-muted-foreground mb-1">رد المحمصة:</p>
                    <p className="text-sm">{review.roaster_response}</p>
                  </div>
                ) : respondingTo === review.id ? (
                  <div className="space-y-2 mt-2">
                    <Textarea
                      placeholder="اكتب ردك هنا..."
                      value={response}
                      onChange={(e) => setResponse(e.target.value)}
                      className="text-sm"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleRespond(review.id)}>
                        إرسال الرد
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setRespondingTo(null)}>
                        إلغاء
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRespondingTo(review.id)}
                    className="mt-2"
                  >
                    <MessageSquare className="h-4 w-4 mr-1" />
                    رد على التقييم
                  </Button>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};
