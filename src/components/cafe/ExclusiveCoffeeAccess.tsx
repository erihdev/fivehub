import { useState, useEffect } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Gem, Lock, Clock, Star, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface ExclusiveCoffee {
  id: string;
  coffee_id: string;
  access_type: string;
  min_loyalty_tier: string;
  available_quantity_kg: number;
  reserved_quantity_kg: number;
  release_date: string;
  expires_at: string;
  coffee?: {
    name: string;
    origin: string;
    price: number;
    score: number;
    flavor: string;
  };
}

interface LoyaltyInfo {
  tier: string;
  points: number;
}

const ExclusiveCoffeeAccess = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [exclusives, setExclusives] = useState<ExclusiveCoffee[]>([]);
  const [loyaltyInfo, setLoyaltyInfo] = useState<LoyaltyInfo>({ tier: "bronze", points: 0 });
  const [loading, setLoading] = useState(true);

  const tierOrder = ["bronze", "silver", "gold", "platinum"];

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);

    // Fetch exclusive coffees
    const { data: exclusiveData } = await supabase
      .from("exclusive_coffee_access")
      .select("*")
      .gte("expires_at", new Date().toISOString())
      .order("release_date", { ascending: true });

    if (exclusiveData) {
      // Fetch coffee details
      const coffeeIds = exclusiveData.map(e => e.coffee_id).filter(Boolean);
      const { data: coffees } = await supabase
        .from("coffee_offerings")
        .select("id, name, origin, price, score, flavor")
        .in("id", coffeeIds);

      const exclusivesWithCoffee = exclusiveData.map(exc => ({
        ...exc,
        coffee: coffees?.find(c => c.id === exc.coffee_id),
      }));

      setExclusives(exclusivesWithCoffee);
    }

    // Fetch loyalty info
    const { data: loyaltyData } = await supabase
      .from("cafe_loyalty_points")
      .select("tier, points_balance")
      .eq("cafe_id", user?.id)
      .single();

    if (loyaltyData) {
      setLoyaltyInfo({
        tier: loyaltyData.tier || "bronze",
        points: loyaltyData.points_balance || 0,
      });
    }

    setLoading(false);
  };

  const canAccess = (minTier: string) => {
    const userTierIndex = tierOrder.indexOf(loyaltyInfo.tier);
    const requiredTierIndex = tierOrder.indexOf(minTier);
    return userTierIndex >= requiredTierIndex;
  };

  const reserveCoffee = async (exclusiveId: string) => {
    toast.success(language === "ar" ? "تم حجز الكمية!" : "Quantity reserved!");
  };

  const getAccessTypeBadge = (type: string) => {
    switch (type) {
      case "exclusive":
        return <Badge className="bg-purple-500">{language === "ar" ? "حصري" : "Exclusive"}</Badge>;
      case "early_access":
        return <Badge className="bg-blue-500">{language === "ar" ? "وصول مبكر" : "Early Access"}</Badge>;
      default:
        return <Badge variant="secondary">{language === "ar" ? "أولوية" : "Priority"}</Badge>;
    }
  };

  const getTierBadge = (tier: string) => {
    const colors: Record<string, string> = {
      bronze: "bg-orange-500",
      silver: "bg-gray-400",
      gold: "bg-yellow-500",
      platinum: "bg-slate-600",
    };
    return (
      <Badge className={colors[tier]}>
        <Star className="w-3 h-3 mr-1" />
        {tier.charAt(0).toUpperCase() + tier.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
          <Gem className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">
            {language === "ar" ? "البن الحصري" : "Exclusive Coffee Access"}
          </h2>
          <p className="text-muted-foreground">
            {language === "ar" ? "وصول حصري لأندر أنواع البن" : "Exclusive access to the rarest coffees"}
          </p>
        </div>
      </div>

      {/* Your Tier */}
      <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                {language === "ar" ? "مستواك الحالي" : "Your Current Tier"}
              </p>
              <div className="flex items-center gap-3">
                {getTierBadge(loyaltyInfo.tier)}
                <span className="text-lg font-bold">{loyaltyInfo.points} {language === "ar" ? "نقطة" : "points"}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">
                {language === "ar" ? "المستوى التالي" : "Next Tier"}
              </p>
              <p className="font-medium">
                {tierOrder[tierOrder.indexOf(loyaltyInfo.tier) + 1]?.toUpperCase() || "MAX"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exclusive Coffees */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {exclusives.map((exclusive) => {
          const hasAccess = canAccess(exclusive.min_loyalty_tier);
          const availablePercent = ((exclusive.available_quantity_kg - exclusive.reserved_quantity_kg) / exclusive.available_quantity_kg) * 100;
          const isReleased = new Date(exclusive.release_date) <= new Date();

          return (
            <Card key={exclusive.id} className={`relative overflow-hidden ${!hasAccess ? "opacity-75" : ""}`}>
              {!hasAccess && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
                  <div className="text-center p-4">
                    <Lock className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="font-medium">
                      {language === "ar" ? "يتطلب مستوى" : "Requires"} {exclusive.min_loyalty_tier.toUpperCase()}
                    </p>
                  </div>
                </div>
              )}

              <div className="h-32 bg-gradient-to-br from-amber-600 to-orange-700 flex items-center justify-center">
                <Gem className="w-12 h-12 text-white/50" />
              </div>

              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  {getAccessTypeBadge(exclusive.access_type)}
                  {getTierBadge(exclusive.min_loyalty_tier)}
                </div>

                <h3 className="font-semibold text-lg mb-1">{exclusive.coffee?.name || "Premium Coffee"}</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {exclusive.coffee?.origin} • {exclusive.coffee?.flavor}
                </p>

                {exclusive.coffee?.score && (
                  <div className="flex items-center gap-2 mb-3">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="font-medium">{exclusive.coffee.score}</span>
                    <span className="text-sm text-muted-foreground">SCA Score</span>
                  </div>
                )}

                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span>{language === "ar" ? "الكمية المتاحة" : "Available"}</span>
                    <span>{exclusive.available_quantity_kg - exclusive.reserved_quantity_kg} kg</span>
                  </div>
                  <Progress value={availablePercent} className="h-2" />
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    {isReleased
                      ? (language === "ar" ? "متاح الآن" : "Available Now")
                      : `${language === "ar" ? "يتاح في" : "Releases"} ${format(new Date(exclusive.release_date), "MMM d")}`}
                  </div>
                  <span className="font-bold text-primary">${exclusive.coffee?.price}/kg</span>
                </div>

                <Button
                  className="w-full"
                  disabled={!hasAccess || !isReleased}
                  onClick={() => reserveCoffee(exclusive.id)}
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  {language === "ar" ? "حجز الآن" : "Reserve Now"}
                </Button>
              </CardContent>
            </Card>
          );
        })}

        {exclusives.length === 0 && !loading && (
          <div className="col-span-2 text-center py-12 text-muted-foreground">
            {language === "ar" ? "لا توجد عروض حصرية حالياً" : "No exclusive offers available"}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExclusiveCoffeeAccess;
