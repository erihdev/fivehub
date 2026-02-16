import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Check, Crown, Zap, Building2, ArrowLeft, ArrowRight, Star, Sprout, Package, Flame, Coffee, Wrench } from "lucide-react";
import BackButton from "@/components/BackButton";
import PaymentSystem from "@/components/payment/PaymentSystem";

interface Plan {
  id: string;
  name: string;
  name_ar: string;
  description: string | null;
  description_ar: string | null;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  commission_rate: number;
  features: string[];
}

interface UserSubscription {
  plan_id: string;
  ends_at: string;
  status: string;
}

export default function SubscriptionPlans() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roleFromUrl = searchParams.get('role');
  const isArabic = language === "ar";

  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentSub, setCurrentSub] = useState<UserSubscription | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [pendingSubscriptionId, setPendingSubscriptionId] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
    if (user) {
      fetchCurrentSubscription();
    }
  }, [user]);

  const fetchPlans = async () => {
    const { data } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price_monthly', { ascending: true });

    if (data) {
      setPlans(data.map(p => ({
        ...p,
        features: Array.isArray(p.features) ? (p.features as string[]) : []
      })));
    }
    setLoading(false);
  };

  const fetchCurrentSubscription = async () => {
    const { data } = await supabase
      .from('user_subscriptions')
      .select('plan_id, ends_at, status')
      .eq('user_id', user?.id)
      .eq('status', 'active')
      .gt('ends_at', new Date().toISOString())
      .single();

    if (data) {
      setCurrentSub(data);
    }
  };

  const handleSubscribe = async (planId: string) => {
    // If user is not logged in and we have a role, redirect to auth with plan info
    if (!user) {
      const plan = plans.find(p => p.id === planId);
      if (roleFromUrl && plan) {
        // Store selected plan in sessionStorage for after registration
        sessionStorage.setItem('selectedPlanId', planId);
        sessionStorage.setItem('selectedBillingCycle', billingCycle);
        navigate(`/auth?role=${roleFromUrl}&plan=${planId}`);
      } else {
        navigate('/auth');
      }
      return;
    }

    // Refresh session to ensure we have valid auth token
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      toast.error(isArabic ? "يرجى تسجيل الدخول مرة أخرى" : "Please log in again");
      navigate('/auth');
      return;
    }

    const plan = plans.find(p => p.id === planId);
    if (!plan) return;

    const currentUserId = sessionData.session.user.id;

    // For free plan, activate immediately
    if (plan.price_monthly === 0) {
      setSubscribing(planId);
      try {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1);

        const { error } = await supabase
          .from('user_subscriptions')
          .insert({
            user_id: currentUserId,
            plan_id: planId,
            billing_cycle: 'monthly',
            status: 'active',
            starts_at: startDate.toISOString(),
            ends_at: endDate.toISOString()
          });

        if (error) throw error;

        toast.success(isArabic ? "تم تفعيل الباقة المجانية" : "Free plan activated");
        fetchCurrentSubscription();
      } catch (error: any) {
        toast.error(error.message);
      } finally {
        setSubscribing(null);
      }
      return;
    }

    // For paid plans, create pending subscription and open payment dialog
    setSubscribing(planId);
    try {
      const startDate = new Date();
      const endDate = new Date();
      if (billingCycle === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }

      const { data, error } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: currentUserId,
          plan_id: planId,
          billing_cycle: billingCycle,
          status: 'pending',
          starts_at: startDate.toISOString(),
          ends_at: endDate.toISOString(),
          next_payment_at: startDate.toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      setPendingSubscriptionId(data.id);
      setSelectedPlan(plan);
      setPaymentDialogOpen(true);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubscribing(null);
    }
  };

  const handlePaymentSuccess = async (invoiceId: string) => {
    if (!pendingSubscriptionId) return;

    try {
      // Activate the subscription
      const { error } = await supabase
        .from('user_subscriptions')
        .update({ 
          status: 'active',
          payment_id: invoiceId 
        })
        .eq('id', pendingSubscriptionId);

      if (error) throw error;

      toast.success(isArabic ? "تم تفعيل الاشتراك بنجاح!" : "Subscription activated successfully!");
      setPaymentDialogOpen(false);
      setSelectedPlan(null);
      setPendingSubscriptionId(null);
      fetchCurrentSubscription();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handlePaymentError = async (error: string) => {
    // Delete the pending subscription if payment fails
    if (pendingSubscriptionId) {
      await supabase
        .from('user_subscriptions')
        .delete()
        .eq('id', pendingSubscriptionId);
    }
    
    setPendingSubscriptionId(null);
    setPaymentDialogOpen(false);
    setSelectedPlan(null);
  };

  const getPlanIcon = (name: string) => {
    if (name.toLowerCase().includes('enterprise') || name.includes('مؤسسي')) {
      return <Building2 className="w-6 h-6" />;
    }
    if (name.toLowerCase().includes('professional') || name.includes('احترافي')) {
      return <Crown className="w-6 h-6" />;
    }
    return <Zap className="w-6 h-6" />;
  };

  const getFeatureLabel = (feature: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      browse_offers: { ar: "تصفح العروض", en: "Browse Offers" },
      limited_messages: { ar: "رسائل محدودة", en: "Limited Messages" },
      unlimited_messages: { ar: "رسائل غير محدودة", en: "Unlimited Messages" },
      priority_support: { ar: "دعم أولوية", en: "Priority Support" },
      analytics: { ar: "تحليلات متقدمة", en: "Advanced Analytics" },
      contact_info: { ar: "عرض معلومات التواصل", en: "View Contact Info" },
      all_professional: { ar: "كل ميزات الاحترافي", en: "All Professional Features" },
      dedicated_support: { ar: "دعم مخصص", en: "Dedicated Support" },
      api_access: { ar: "وصول API", en: "API Access" },
      custom_contracts: { ar: "عقود مخصصة", en: "Custom Contracts" },
    };
    return labels[feature] ? (isArabic ? labels[feature].ar : labels[feature].en) : feature;
  };

  const getPaymentItems = () => {
    if (!selectedPlan) return [];
    const price = billingCycle === 'monthly' ? selectedPlan.price_monthly : selectedPlan.price_yearly;
    return [{
      name: `${isArabic ? selectedPlan.name_ar : selectedPlan.name} - ${billingCycle === 'monthly' ? (isArabic ? 'شهري' : 'Monthly') : (isArabic ? 'سنوي' : 'Yearly')}`,
      quantity: 1,
      unitPrice: price
    }];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const getRoleInfo = () => {
    const roles: Record<string, { icon: typeof Sprout; label: { ar: string; en: string }; gradient: string }> = {
      farm: { icon: Sprout, label: { ar: 'مزرعة', en: 'Farm' }, gradient: 'from-emerald-500 to-green-600' },
      supplier: { icon: Package, label: { ar: 'مورد', en: 'Supplier' }, gradient: 'from-blue-500 to-indigo-600' },
      roaster: { icon: Flame, label: { ar: 'محمصة', en: 'Roaster' }, gradient: 'from-orange-500 to-amber-600' },
      cafe: { icon: Coffee, label: { ar: 'مقهى', en: 'Cafe' }, gradient: 'from-rose-500 to-pink-600' },
      maintenance: { icon: Wrench, label: { ar: 'صيانة', en: 'Maintenance' }, gradient: 'from-slate-500 to-gray-600' },
    };
    return roleFromUrl ? roles[roleFromUrl] : null;
  };

  const roleInfo = getRoleInfo();

  return (
    <div className={`min-h-screen bg-background p-4 md:p-8 ${isArabic ? 'rtl' : 'ltr'}`}>
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <BackButton />
          <div>
            <div className="flex items-center gap-3 mb-2">
              {roleInfo && (
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${roleInfo.gradient} flex items-center justify-center`}>
                  <roleInfo.icon className="w-5 h-5 text-white" />
                </div>
              )}
              <h1 className="text-2xl md:text-3xl font-bold">
                {roleInfo 
                  ? (isArabic 
                      ? `اشتراك ${roleInfo.label.ar}` 
                      : `${roleInfo.label.en} Subscription`)
                  : (isArabic ? "باقات الاشتراك" : "Subscription Plans")}
              </h1>
            </div>
            <p className="text-muted-foreground">
              {isArabic ? "اختر الباقة المناسبة لعملك ثم أكمل التسجيل" : "Choose the right plan for your business, then complete registration"}
            </p>
          </div>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center">
          <div className="inline-flex items-center bg-muted rounded-lg p-1">
            <Button
              variant={billingCycle === 'monthly' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setBillingCycle('monthly')}
            >
              {isArabic ? "شهري" : "Monthly"}
            </Button>
            <Button
              variant={billingCycle === 'yearly' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setBillingCycle('yearly')}
              className="gap-2"
            >
              {isArabic ? "سنوي" : "Yearly"}
              <Badge variant="secondary" className="text-xs">
                {isArabic ? "وفر 17%" : "Save 17%"}
              </Badge>
            </Button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan, index) => {
            const isCurrentPlan = currentSub?.plan_id === plan.id;
            const price = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;
            const isPopular = index === 1;

            return (
              <Card 
                key={plan.id} 
                className={`relative ${isPopular ? 'border-primary shadow-lg scale-105' : ''} ${isCurrentPlan ? 'border-green-500' : ''}`}
              >
                {isPopular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 gap-1">
                    <Star className="w-3 h-3" />
                    {isArabic ? "الأكثر شعبية" : "Most Popular"}
                  </Badge>
                )}
                {isCurrentPlan && (
                  <Badge variant="outline" className="absolute -top-3 right-4 bg-green-50 text-green-700 border-green-300">
                    {isArabic ? "باقتك الحالية" : "Current Plan"}
                  </Badge>
                )}
                
                <CardHeader className="text-center">
                  <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center ${
                    isPopular ? 'bg-primary text-white' : 'bg-muted'
                  }`}>
                    {getPlanIcon(plan.name)}
                  </div>
                  <CardTitle className="text-xl">
                    {isArabic ? plan.name_ar : plan.name}
                  </CardTitle>
                  <CardDescription>
                    {isArabic ? plan.description_ar : plan.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="text-center">
                    <span className="text-4xl font-bold">{price.toLocaleString()}</span>
                    <span className="text-muted-foreground ms-1">
                      {plan.currency}/{billingCycle === 'monthly' ? (isArabic ? 'شهر' : 'mo') : (isArabic ? 'سنة' : 'yr')}
                    </span>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <span className="text-sm text-muted-foreground">
                      {isArabic ? "عمولة الصفقات" : "Transaction Commission"}
                    </span>
                    <p className="text-2xl font-bold text-primary">{plan.commission_rate}%</p>
                  </div>

                  <ul className="space-y-2">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500 shrink-0" />
                        <span>{getFeatureLabel(feature)}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  <Button 
                    className="w-full gap-2"
                    variant={isPopular ? 'default' : 'outline'}
                    disabled={isCurrentPlan || subscribing === plan.id}
                    onClick={() => handleSubscribe(plan.id)}
                  >
                    {subscribing === plan.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isCurrentPlan ? (
                      isArabic ? "باقتك الحالية" : "Current Plan"
                    ) : price === 0 ? (
                      isArabic ? (user ? "ابدأ مجاناً" : "سجل مجاناً") : (user ? "Start Free" : "Register Free")
                    ) : (
                      <>
                        {isArabic ? (user ? "اشترك الآن" : "اختر وسجل") : (user ? "Subscribe Now" : "Choose & Register")}
                        {isArabic ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Benefits */}
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold mb-4 text-center">
              {isArabic ? "مميزات الاشتراك المدفوع" : "Premium Subscription Benefits"}
            </h3>
            <div className="grid md:grid-cols-3 gap-4 text-center">
              <div className="space-y-2">
                <div className="text-3xl">💰</div>
                <h4 className="font-semibold">{isArabic ? "عمولة أقل" : "Lower Commission"}</h4>
                <p className="text-sm text-muted-foreground">
                  {isArabic ? "وفر أكثر مع عمولات مخفضة" : "Save more with reduced commissions"}
                </p>
              </div>
              <div className="space-y-2">
                <div className="text-3xl">📞</div>
                <h4 className="font-semibold">{isArabic ? "معلومات التواصل" : "Contact Information"}</h4>
                <p className="text-sm text-muted-foreground">
                  {isArabic ? "الوصول لمعلومات التواصل المباشر" : "Access direct contact information"}
                </p>
              </div>
              <div className="space-y-2">
                <div className="text-3xl">⚡</div>
                <h4 className="font-semibold">{isArabic ? "ميزات متقدمة" : "Advanced Features"}</h4>
                <p className="text-sm text-muted-foreground">
                  {isArabic ? "تحليلات ودعم أولوية" : "Analytics and priority support"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={(open) => {
        if (!open) {
          handlePaymentError("cancelled");
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isArabic ? "إتمام الدفع" : "Complete Payment"}
            </DialogTitle>
          </DialogHeader>
          <PaymentSystem
            items={getPaymentItems()}
            currency={selectedPlan?.currency || 'SAR'}
            onPaymentSuccess={handlePaymentSuccess}
            onPaymentError={handlePaymentError}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
