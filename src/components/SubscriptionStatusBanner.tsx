import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Crown, Zap, AlertTriangle, Clock, ArrowLeft, ArrowRight } from "lucide-react";
import { differenceInDays, format } from "date-fns";
import { ar, enUS } from "date-fns/locale";

interface SubscriptionInfo {
  id: string;
  plan_id: string;
  plan_name: string;
  plan_name_ar: string;
  status: string;
  ends_at: string;
  commission_rate: number;
}

const SubscriptionStatusBanner = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isArabic = language === "ar";

  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSubscription();
    }
  }, [user]);

  const fetchSubscription = async () => {
    try {
      // Get all active subscriptions and pick the best one (latest or highest tier)
      const { data, error } = await supabase
        .from("user_subscriptions")
        .select(`
          id,
          plan_id,
          status,
          ends_at,
          created_at,
          subscription_plans (
            name,
            name_ar,
            commission_rate
          )
        `)
        .eq("user_id", user?.id)
        .eq("status", "active")
        .gt("ends_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching subscription:", error);
        setLoading(false);
        return;
      }

      if (data && data.length > 0) {
        // Prioritize: Enterprise > Professional > Free, then by latest created
        const planPriority: Record<string, number> = {
          'enterprise': 3,
          'مؤسسي': 3,
          'professional': 2,
          'احترافي': 2,
          'free': 1,
          'مجاني': 1,
        };

        const sortedData = data.sort((a, b) => {
          const aPlan = a.subscription_plans as { name: string; name_ar: string; commission_rate: number } | null;
          const bPlan = b.subscription_plans as { name: string; name_ar: string; commission_rate: number } | null;
          
          const aPriority = planPriority[aPlan?.name?.toLowerCase() || ''] || 0;
          const bPriority = planPriority[bPlan?.name?.toLowerCase() || ''] || 0;
          
          if (bPriority !== aPriority) {
            return bPriority - aPriority; // Higher tier first
          }
          
          // Same tier, prefer later end date
          return new Date(b.ends_at).getTime() - new Date(a.ends_at).getTime();
        });

        const bestSubscription = sortedData[0];
        const planData = bestSubscription.subscription_plans as { name: string; name_ar: string; commission_rate: number };
        
        if (planData) {
          setSubscription({
            id: bestSubscription.id,
            plan_id: bestSubscription.plan_id,
            plan_name: planData.name,
            plan_name_ar: planData.name_ar,
            status: bestSubscription.status,
            ends_at: bestSubscription.ends_at,
            commission_rate: planData.commission_rate,
          });
        }
      }
    } catch (error) {
      console.error("Error fetching subscription:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;

  // No subscription - show prompt
  if (!subscription) {
    return (
      <Alert className="mb-4 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 dark:from-amber-950/20 dark:to-orange-950/20 dark:border-amber-800">
        <Zap className="h-4 w-4 text-amber-600" />
        <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-amber-800 dark:text-amber-200">
            {isArabic 
              ? "اشترك الآن للحصول على عمولات مخفضة وميزات حصرية!" 
              : "Subscribe now for reduced commissions and exclusive features!"}
          </span>
          <Button asChild size="sm" variant="outline" className="border-amber-400 text-amber-700 hover:bg-amber-100">
            <Link to="/subscription-plans" className="gap-2">
              {isArabic ? "اشترك الآن" : "Subscribe Now"}
              {isArabic ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </Link>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const daysUntilExpiry = differenceInDays(new Date(subscription.ends_at), new Date());
  const isExpiringSoon = daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  const expiryDate = format(new Date(subscription.ends_at), "dd MMMM yyyy", {
    locale: isArabic ? ar : enUS,
  });

  // Expiring soon warning
  if (isExpiringSoon) {
    return (
      <Alert className="mb-4 bg-gradient-to-r from-red-50 to-orange-50 border-red-200 dark:from-red-950/20 dark:to-orange-950/20 dark:border-red-800">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
            <Clock className="w-4 h-4" />
            <span>
              {isArabic 
                ? `اشتراكك ينتهي خلال ${daysUntilExpiry} ${daysUntilExpiry === 1 ? 'يوم' : 'أيام'}!` 
                : `Your subscription expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}!`}
            </span>
          </div>
          <div className="flex gap-2">
            <Button asChild size="sm" variant="default" className="bg-red-600 hover:bg-red-700">
              <Link to="/subscription-plans">
                {isArabic ? "تجديد الآن" : "Renew Now"}
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/subscription-plans">
                {isArabic ? "ترقية" : "Upgrade"}
              </Link>
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Active subscription banner
  return (
    <div className="mb-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-3 flex items-center justify-between flex-wrap gap-2 border border-primary/20">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
          <Crown className="w-5 h-5 text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">
              {isArabic ? subscription.plan_name_ar : subscription.plan_name}
            </span>
            <Badge variant="secondary" className="text-xs">
              {subscription.commission_rate}% {isArabic ? "عمولة" : "commission"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {isArabic ? "ينتهي في: " : "Expires: "}
            {expiryDate}
          </p>
        </div>
      </div>
      <Button asChild size="sm" variant="ghost">
        <Link to="/subscription-plans">
          {isArabic ? "إدارة الاشتراك" : "Manage Subscription"}
        </Link>
      </Button>
    </div>
  );
};

export default SubscriptionStatusBanner;
