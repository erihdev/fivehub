import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { 
  Crown, 
  Star, 
  Clock, 
  Package,
  Lock,
  Sparkles,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface RareRelease {
  id: string;
  title: string;
  description: string;
  total_quantity_kg: number;
  remaining_quantity_kg: number;
  min_tier: string;
  priority_access_ends_at: string;
  status: string;
  coffee_id?: string;
  roasted_product_id?: string;
}

interface Reservation {
  id: string;
  release_id: string;
  quantity_kg: number;
  status: string;
  reserved_at: string;
}

interface LoyaltyInfo {
  tier: string;
  points_balance: number;
}

const RareCoffeeAccess = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isRTL = language === 'ar';
  
  const [releases, setReleases] = useState<RareRelease[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loyaltyInfo, setLoyaltyInfo] = useState<LoyaltyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [reserveDialogOpen, setReserveDialogOpen] = useState(false);
  const [selectedRelease, setSelectedRelease] = useState<RareRelease | null>(null);
  const [quantity, setQuantity] = useState("");

  useEffect(() => {
    if (user) {
      fetchData();
      setupRealtimeSubscription();
    }
  }, [user]);

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('rare-releases')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rare_coffee_releases' },
        () => fetchReleases()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchData = async () => {
    await Promise.all([
      fetchLoyaltyInfo(),
      fetchReleases(),
      fetchReservations()
    ]);
    setLoading(false);
  };

  const fetchLoyaltyInfo = async () => {
    const { data } = await supabase
      .from('cafe_loyalty_points')
      .select('tier, points_balance')
      .eq('cafe_id', user?.id)
      .single();
    
    if (data) {
      setLoyaltyInfo(data);
    } else {
      // Default for new cafes
      setLoyaltyInfo({ tier: 'bronze', points_balance: 0 });
    }
  };

  const fetchReleases = async () => {
    const { data, error } = await supabase
      .from('rare_coffee_releases')
      .select('*')
      .in('status', ['priority_access', 'public'])
      .gt('remaining_quantity_kg', 0)
      .order('created_at', { ascending: false });

    if (data) {
      setReleases(data);
    }
  };

  const fetchReservations = async () => {
    const { data } = await supabase
      .from('rare_coffee_reservations')
      .select('*')
      .eq('cafe_id', user?.id);

    if (data) {
      setReservations(data);
    }
  };

  const getTierLevel = (tier: string): number => {
    const levels: Record<string, number> = {
      bronze: 1,
      silver: 2,
      gold: 3,
      platinum: 4
    };
    return levels[tier] || 0;
  };

  const canAccessRelease = (release: RareRelease): boolean => {
    if (!loyaltyInfo) return false;
    return getTierLevel(loyaltyInfo.tier) >= getTierLevel(release.min_tier);
  };

  const getTierBadge = (tier: string) => {
    const configs: Record<string, { color: string; icon: React.ReactNode }> = {
      bronze: { color: 'bg-amber-700', icon: <Star className="h-3 w-3" /> },
      silver: { color: 'bg-gray-400', icon: <Star className="h-3 w-3" /> },
      gold: { color: 'bg-yellow-500', icon: <Crown className="h-3 w-3" /> },
      platinum: { color: 'bg-purple-500', icon: <Sparkles className="h-3 w-3" /> }
    };
    const config = configs[tier] || configs.bronze;
    return (
      <Badge className={`${config.color} text-white gap-1`}>
        {config.icon}
        {tier.charAt(0).toUpperCase() + tier.slice(1)}
      </Badge>
    );
  };

  const handleReserve = async () => {
    if (!selectedRelease || !quantity) return;

    const qty = parseFloat(quantity);
    if (qty <= 0 || qty > selectedRelease.remaining_quantity_kg) {
      toast.error(isRTL ? 'الكمية غير صالحة' : 'Invalid quantity');
      return;
    }

    const { error } = await supabase
      .from('rare_coffee_reservations')
      .insert({
        release_id: selectedRelease.id,
        cafe_id: user?.id,
        quantity_kg: qty,
        status: 'pending'
      });

    if (error) {
      if (error.code === '23505') {
        toast.error(isRTL ? 'لديك حجز مسبق لهذا المنتج' : 'You already have a reservation');
      } else {
        toast.error(isRTL ? 'حدث خطأ' : 'An error occurred');
      }
    } else {
      toast.success(isRTL ? 'تم الحجز بنجاح!' : 'Reservation successful!');
      setReserveDialogOpen(false);
      setSelectedRelease(null);
      setQuantity("");
      fetchReservations();
      fetchReleases();
    }
  };

  const hasReservation = (releaseId: string) => {
    return reservations.some(r => r.release_id === releaseId);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Crown className="h-5 w-5 text-yellow-500" />
              {isRTL ? 'قهوة نادرة - وصول حصري' : 'Rare Coffee - Exclusive Access'}
            </CardTitle>
            {loyaltyInfo && getTierBadge(loyaltyInfo.tier)}
          </div>
          <p className="text-sm text-muted-foreground">
            {isRTL 
              ? 'احصل على أولوية الوصول للقهوة المحدودة قبل الجميع'
              : 'Get priority access to limited coffees before everyone'}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {releases.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>{isRTL ? 'لا توجد إصدارات نادرة حالياً' : 'No rare releases available'}</p>
              <p className="text-xs mt-2">
                {isRTL ? 'ترقب الإصدارات القادمة!' : 'Stay tuned for upcoming releases!'}
              </p>
            </div>
          ) : (
            releases.map((release) => {
              const canAccess = canAccessRelease(release);
              const reserved = hasReservation(release.id);
              const isExpiringSoon = new Date(release.priority_access_ends_at) < new Date(Date.now() + 24 * 60 * 60 * 1000);
              
              return (
                <div 
                  key={release.id}
                  className={`relative rounded-lg border p-4 transition-all ${
                    canAccess 
                      ? 'border-primary/30 bg-gradient-to-br from-primary/5 to-transparent hover:border-primary/50' 
                      : 'border-muted bg-muted/30 opacity-75'
                  }`}
                >
                  {!canAccess && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
                      <div className="text-center">
                        <Lock className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm font-medium">
                          {isRTL ? `يتطلب مستوى ${release.min_tier}` : `Requires ${release.min_tier} tier`}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-yellow-500" />
                        {release.title}
                      </h4>
                      <p className="text-sm text-muted-foreground">{release.description}</p>
                    </div>
                    {getTierBadge(release.min_tier)}
                  </div>

                  <div className="flex items-center gap-4 text-sm mt-3">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Package className="h-4 w-4" />
                      <span>{release.remaining_quantity_kg} / {release.total_quantity_kg} kg</span>
                    </div>
                    <div className={`flex items-center gap-1 ${isExpiringSoon ? 'text-red-500' : 'text-muted-foreground'}`}>
                      <Clock className="h-4 w-4" />
                      <span>
                        {formatDistanceToNow(new Date(release.priority_access_ends_at), {
                          addSuffix: true,
                          locale: isRTL ? ar : undefined
                        })}
                      </span>
                    </div>
                  </div>

                  {canAccess && (
                    <div className="mt-3">
                      {reserved ? (
                        <Badge variant="outline" className="gap-1 text-green-600 border-green-600">
                          <CheckCircle className="h-3 w-3" />
                          {isRTL ? 'تم الحجز' : 'Reserved'}
                        </Badge>
                      ) : (
                        <Button 
                          size="sm" 
                          className="w-full"
                          onClick={() => {
                            setSelectedRelease(release);
                            setReserveDialogOpen(true);
                          }}
                        >
                          {isRTL ? 'احجز الآن' : 'Reserve Now'}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* My Reservations */}
          {reservations.length > 0 && (
            <div className="pt-4 border-t">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                {isRTL ? 'حجوزاتي' : 'My Reservations'}
              </h4>
              <div className="space-y-2">
                {reservations.map((reservation) => {
                  const release = releases.find(r => r.id === reservation.release_id);
                  return (
                    <div 
                      key={reservation.id}
                      className="flex items-center justify-between bg-green-500/10 rounded-lg p-3"
                    >
                      <div>
                        <p className="font-medium text-sm">{release?.title || 'Coffee'}</p>
                        <p className="text-xs text-muted-foreground">
                          {reservation.quantity_kg} kg • {format(new Date(reservation.reserved_at), 'PPP', {
                            locale: isRTL ? ar : undefined
                          })}
                        </p>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {reservation.status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reserve Dialog */}
      <Dialog open={reserveDialogOpen} onOpenChange={setReserveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              {isRTL ? 'حجز قهوة نادرة' : 'Reserve Rare Coffee'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedRelease && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-semibold">{selectedRelease.title}</h4>
                <p className="text-sm text-muted-foreground">{selectedRelease.description}</p>
                <p className="text-sm mt-2">
                  {isRTL ? 'المتوفر: ' : 'Available: '}
                  <span className="font-semibold">{selectedRelease.remaining_quantity_kg} kg</span>
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {isRTL ? 'الكمية (كجم)' : 'Quantity (kg)'}
                </label>
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max={selectedRelease.remaining_quantity_kg}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder={isRTL ? 'أدخل الكمية' : 'Enter quantity'}
                />
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-yellow-500/10 rounded-lg p-3">
                <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                <span>
                  {isRTL 
                    ? 'الحجز يضمن لك الأولوية - سيتم التواصل معك للتأكيد'
                    : 'Reservation guarantees priority - you will be contacted for confirmation'}
                </span>
              </div>

              <Button className="w-full" onClick={handleReserve} disabled={!quantity}>
                {isRTL ? 'تأكيد الحجز' : 'Confirm Reservation'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RareCoffeeAccess;
