-- Subscription Plans
CREATE TABLE public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    description TEXT,
    description_ar TEXT,
    price_monthly NUMERIC(10,2) NOT NULL DEFAULT 0,
    price_yearly NUMERIC(10,2) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'SAR',
    commission_rate NUMERIC(5,2) NOT NULL DEFAULT 10,
    features JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User Subscriptions
CREATE TABLE public.user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    plan_id UUID REFERENCES public.subscription_plans(id),
    billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'pending')),
    starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ends_at TIMESTAMPTZ NOT NULL,
    auto_renew BOOLEAN DEFAULT true,
    payment_method TEXT,
    last_payment_at TIMESTAMPTZ,
    next_payment_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Escrow Transactions
CREATE TABLE public.escrow_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES public.direct_supply_contracts(id),
    buyer_id UUID NOT NULL,
    seller_id UUID NOT NULL,
    total_amount NUMERIC(12,2) NOT NULL,
    platform_commission NUMERIC(12,2) NOT NULL,
    seller_amount NUMERIC(12,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'SAR',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'buyer_paid', 'released_to_seller', 'refunded', 'disputed')),
    buyer_paid_at TIMESTAMPTZ,
    released_at TIMESTAMPTZ,
    release_approved_by UUID,
    dispute_reason TEXT,
    disputed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_plans (public read)
CREATE POLICY "Anyone can view active plans" ON public.subscription_plans
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage plans" ON public.subscription_plans
    FOR ALL USING (public.is_verified_admin(auth.uid()));

-- RLS Policies for user_subscriptions
CREATE POLICY "Users can view own subscriptions" ON public.user_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own subscriptions" ON public.user_subscriptions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all subscriptions" ON public.user_subscriptions
    FOR ALL USING (public.is_verified_admin(auth.uid()));

-- RLS Policies for escrow_transactions
CREATE POLICY "Parties can view own escrow" ON public.escrow_transactions
    FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Buyers can create escrow" ON public.escrow_transactions
    FOR INSERT WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Admins can manage escrow" ON public.escrow_transactions
    FOR ALL USING (public.is_verified_admin(auth.uid()));

-- Function to get user's active subscription
CREATE OR REPLACE FUNCTION public.get_user_subscription(p_user_id UUID)
RETURNS TABLE (
    plan_name TEXT,
    commission_rate NUMERIC,
    ends_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        sp.name,
        sp.commission_rate,
        us.ends_at
    FROM public.user_subscriptions us
    JOIN public.subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = p_user_id
      AND us.status = 'active'
      AND us.ends_at > now()
    ORDER BY us.ends_at DESC
    LIMIT 1;
$$;

-- Function to check if user can see contact info
CREATE OR REPLACE FUNCTION public.can_see_contact_info(p_viewer_id UUID, p_target_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        -- Has active subscription
        SELECT 1 FROM public.user_subscriptions us
        WHERE us.user_id = p_viewer_id
          AND us.status = 'active'
          AND us.ends_at > now()
    ) OR EXISTS (
        -- Has completed contract with this user
        SELECT 1 FROM public.direct_supply_contracts dsc
        WHERE dsc.status = 'completed'
          AND ((dsc.buyer_id = p_viewer_id AND dsc.seller_id = p_target_id)
               OR (dsc.seller_id = p_viewer_id AND dsc.buyer_id = p_target_id))
    );
$$;

-- Insert default subscription plans
INSERT INTO public.subscription_plans (name, name_ar, description, description_ar, price_monthly, price_yearly, commission_rate, features) VALUES
('Free', 'مجاني', 'Basic access with standard commission', 'وصول أساسي مع عمولة قياسية', 0, 0, 10, '["browse_offers", "limited_messages"]'),
('Professional', 'احترافي', 'Reduced commission and full features', 'عمولة مخفضة وميزات كاملة', 299, 2990, 5, '["unlimited_messages", "priority_support", "analytics", "contact_info"]'),
('Enterprise', 'مؤسسي', 'Lowest commission and premium support', 'أقل عمولة ودعم متميز', 599, 5990, 2.5, '["all_professional", "dedicated_support", "api_access", "custom_contracts"]');