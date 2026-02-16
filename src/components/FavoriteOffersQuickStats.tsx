import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, XCircle, AlertTriangle, CheckCircle } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

interface Offer {
  id: string;
  title: string;
  is_active: boolean;
  valid_until: string | null;
}

interface FavoriteOffer {
  id: string;
  offer_id: string;
  offer: Offer | null;
}

interface FavoriteOffersQuickStatsProps {
  favoriteOffers: FavoriteOffer[];
}

const FavoriteOffersQuickStats = ({ favoriteOffers }: FavoriteOffersQuickStatsProps) => {
  const { language } = useLanguage();

  const stats = useMemo(() => {
    const now = new Date();
    let expired = 0;
    let expiringSoon = 0;
    let active = 0;
    let inactive = 0;

    favoriteOffers.forEach((favorite) => {
      const offer = favorite.offer;
      if (!offer) return;

      if (!offer.is_active) {
        inactive++;
        return;
      }

      if (offer.valid_until) {
        const expiryDate = new Date(offer.valid_until);
        if (expiryDate < now) {
          expired++;
        } else {
          const daysUntil = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (daysUntil <= 7) {
            expiringSoon++;
          } else {
            active++;
          }
        }
      } else {
        active++;
      }
    });

    return { expired, expiringSoon, active, inactive };
  }, [favoriteOffers]);

  const statCards = [
    {
      label: language === "ar" ? "عروض نشطة" : "Active Offers",
      value: stats.active,
      icon: CheckCircle,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      label: language === "ar" ? "تنتهي قريباً" : "Expiring Soon",
      value: stats.expiringSoon,
      icon: AlertTriangle,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      label: language === "ar" ? "منتهية" : "Expired",
      value: stats.expired,
      icon: XCircle,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
    {
      label: language === "ar" ? "غير نشطة" : "Inactive",
      value: stats.inactive,
      icon: Clock,
      color: "text-muted-foreground",
      bgColor: "bg-muted",
    },
  ];

  if (favoriteOffers.length === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {statCards.map((stat, index) => (
        <Card key={index} className={`${stat.bgColor} border-0`}>
          <CardContent className="p-4 flex items-center gap-3">
            <stat.icon className={`w-8 h-8 ${stat.color}`} />
            <div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default FavoriteOffersQuickStats;