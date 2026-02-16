import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type PlanLevel = 'free' | 'professional' | 'enterprise';

interface SubscriptionFeaturesContextType {
  planLevel: PlanLevel;
  planName: string;
  planNameAr: string;
  isLoading: boolean;
  hasFeature: (feature: FeatureKey) => boolean;
  canAccess: (requiredPlan: PlanLevel) => boolean;
}

// Define all features and their required plan levels
export type FeatureKey =
  // Free features
  | 'browse_offers'
  | 'limited_messages'
  | 'basic_dashboard'
  | 'view_suppliers'
  | 'view_prices'
  // Professional features
  | 'unlimited_messages'
  | 'priority_support'
  | 'analytics'
  | 'contact_info'
  | 'price_alerts'
  | 'inventory_management'
  | 'order_tracking'
  | 'cupping_sessions'
  | 'blend_creator'
  | 'favorite_offers'
  | 'supplier_ratings'
  | 'performance_reports'
  | 'live_sessions'
  // Enterprise features
  | 'api_access'
  | 'custom_contracts'
  | 'dedicated_support'
  | 'live_auctions'
  | 'direct_contracts'
  | 'ai_recommendations'
  | 'advanced_analytics'
  | 'export_data'
  | 'supplier_competition'
  | 'smart_matching';

const FEATURE_PLAN_MAP: Record<FeatureKey, PlanLevel> = {
  // Free features
  browse_offers: 'free',
  limited_messages: 'free',
  basic_dashboard: 'free',
  view_suppliers: 'free',
  view_prices: 'free',
  // Professional features
  unlimited_messages: 'professional',
  priority_support: 'professional',
  analytics: 'professional',
  contact_info: 'professional',
  price_alerts: 'professional',
  inventory_management: 'professional',
  order_tracking: 'professional',
  cupping_sessions: 'professional',
  blend_creator: 'professional',
  favorite_offers: 'professional',
  supplier_ratings: 'professional',
  performance_reports: 'professional',
  live_sessions: 'professional',
  // Enterprise features
  api_access: 'enterprise',
  custom_contracts: 'enterprise',
  dedicated_support: 'enterprise',
  live_auctions: 'enterprise',
  direct_contracts: 'enterprise',
  ai_recommendations: 'enterprise',
  advanced_analytics: 'enterprise',
  export_data: 'enterprise',
  supplier_competition: 'enterprise',
  smart_matching: 'enterprise',
};

const PLAN_HIERARCHY: Record<PlanLevel, number> = {
  free: 0,
  professional: 1,
  enterprise: 2,
};

const SubscriptionFeaturesContext = React.createContext<SubscriptionFeaturesContextType | null>(null);

export const SubscriptionFeaturesProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [planLevel, setPlanLevel] = React.useState<PlanLevel>('free');
  const [planName, setPlanName] = React.useState('Free');
  const [planNameAr, setPlanNameAr] = React.useState('مجاني');
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (user) {
      fetchSubscription();
    } else {
      setPlanLevel('free');
      setIsLoading(false);
    }
  }, [user]);

  const fetchSubscription = async () => {
    try {
      // Get all active subscriptions and pick the highest tier
      const { data, error } = await supabase
        .from("user_subscriptions")
        .select(`
          plan_id,
          ends_at,
          subscription_plans (
            name,
            name_ar
          )
        `)
        .eq("user_id", user?.id)
        .eq("status", "active")
        .gt("ends_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching subscription:", error);
        setPlanLevel('free');
        setIsLoading(false);
        return;
      }

      if (data && data.length > 0) {
        // Prioritize: Enterprise > Professional > Free
        const planPriority: Record<string, number> = {
          'enterprise': 3,
          'مؤسسي': 3,
          'professional': 2,
          'احترافي': 2,
          'free': 1,
          'مجاني': 1,
        };

        const sortedData = data.sort((a, b) => {
          const aPlan = a.subscription_plans as { name: string; name_ar: string } | null;
          const bPlan = b.subscription_plans as { name: string; name_ar: string } | null;
          
          const aPriority = planPriority[aPlan?.name?.toLowerCase() || ''] || 0;
          const bPriority = planPriority[bPlan?.name?.toLowerCase() || ''] || 0;
          
          if (bPriority !== aPriority) {
            return bPriority - aPriority;
          }
          
          return new Date(b.ends_at).getTime() - new Date(a.ends_at).getTime();
        });

        const bestSubscription = sortedData[0];
        const planData = bestSubscription.subscription_plans as { name: string; name_ar: string };
        
        if (planData) {
          const name = planData.name.toLowerCase();
          
          if (name.includes('enterprise') || name.includes('مؤسسي')) {
            setPlanLevel('enterprise');
          } else if (name.includes('professional') || name.includes('احترافي')) {
            setPlanLevel('professional');
          } else {
            setPlanLevel('free');
          }
          
          setPlanName(planData.name);
          setPlanNameAr(planData.name_ar);
        } else {
          setPlanLevel('free');
          setPlanName('Free');
          setPlanNameAr('مجاني');
        }
      } else {
        setPlanLevel('free');
        setPlanName('Free');
        setPlanNameAr('مجاني');
      }
    } catch (error) {
      console.error("Error fetching subscription:", error);
      setPlanLevel('free');
    } finally {
      setIsLoading(false);
    }
  };

  const hasFeature = (feature: FeatureKey): boolean => {
    const requiredPlan = FEATURE_PLAN_MAP[feature];
    return PLAN_HIERARCHY[planLevel] >= PLAN_HIERARCHY[requiredPlan];
  };

  const canAccess = (requiredPlan: PlanLevel): boolean => {
    return PLAN_HIERARCHY[planLevel] >= PLAN_HIERARCHY[requiredPlan];
  };

  return (
    <SubscriptionFeaturesContext.Provider
      value={{
        planLevel,
        planName,
        planNameAr,
        isLoading,
        hasFeature,
        canAccess,
      }}
    >
      {children}
    </SubscriptionFeaturesContext.Provider>
  );
};

export const useSubscriptionFeatures = () => {
  const context = React.useContext(SubscriptionFeaturesContext);
  if (!context) {
    throw new Error("useSubscriptionFeatures must be used within SubscriptionFeaturesProvider");
  }
  return context;
};
