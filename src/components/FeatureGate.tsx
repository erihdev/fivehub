import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Lock, Crown, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/hooks/useLanguage";
import { useSubscriptionFeatures, FeatureKey } from "@/hooks/useSubscriptionFeatures";

interface FeatureGateProps {
  feature: FeatureKey;
  children: ReactNode;
  fallback?: ReactNode;
  showLockOverlay?: boolean;
}

const PLAN_NAMES = {
  professional: { en: 'Professional', ar: 'الاحترافية' },
  enterprise: { en: 'Enterprise', ar: 'المؤسسية' },
};

const FEATURE_PLAN_MAP: Record<FeatureKey, 'professional' | 'enterprise'> = {
  // Free features (won't be checked)
  browse_offers: 'professional',
  limited_messages: 'professional',
  basic_dashboard: 'professional',
  view_suppliers: 'professional',
  view_prices: 'professional',
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

export const FeatureGate = ({ 
  feature, 
  children, 
  fallback,
  showLockOverlay = true 
}: FeatureGateProps) => {
  const { hasFeature, isLoading } = useSubscriptionFeatures();
  const { language } = useLanguage();
  const isArabic = language === 'ar';

  if (isLoading) {
    return <>{children}</>;
  }

  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showLockOverlay) {
    return null;
  }

  const requiredPlan = FEATURE_PLAN_MAP[feature] || 'professional';
  const planName = PLAN_NAMES[requiredPlan];

  return (
    <Card className="relative overflow-hidden border-dashed border-2 border-muted-foreground/30">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
        <div className="text-center p-6 max-w-sm">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h3 className="font-semibold text-lg mb-2">
            {isArabic ? 'ميزة مقفلة' : 'Feature Locked'}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {isArabic 
              ? `هذه الميزة متاحة في باقة ${planName.ar} وأعلى`
              : `This feature is available in ${planName.en} plan and above`}
          </p>
          <Button asChild size="sm" className="gap-2">
            <Link to="/subscription-plans">
              {requiredPlan === 'enterprise' ? (
                <Crown className="w-4 h-4" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              {isArabic ? 'ترقية الآن' : 'Upgrade Now'}
            </Link>
          </Button>
        </div>
      </div>
      <CardContent className="p-4 opacity-40 pointer-events-none">
        {children}
      </CardContent>
    </Card>
  );
};

// Quick check component for inline elements
export const LockedBadge = ({ feature }: { feature: FeatureKey }) => {
  const { hasFeature } = useSubscriptionFeatures();
  const { language } = useLanguage();
  const isArabic = language === 'ar';

  if (hasFeature(feature)) {
    return null;
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
      <Lock className="w-3 h-3" />
      {isArabic ? 'مقفل' : 'Locked'}
    </span>
  );
};

// Hook for checking features in code
export const useFeatureAccess = (feature: FeatureKey) => {
  const { hasFeature, planLevel } = useSubscriptionFeatures();
  return {
    hasAccess: hasFeature(feature),
    planLevel,
  };
};
