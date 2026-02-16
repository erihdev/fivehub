
-- =============================================
-- 1. COMPETITOR ANALYSIS - Market Insights
-- =============================================

-- Market insights aggregated data (anonymized competitor stats)
CREATE TABLE public.cafe_market_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  city TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  avg_coffee_price DECIMAL(10,2),
  top_coffee_origins TEXT[],
  top_roast_levels TEXT[],
  avg_order_frequency DECIMAL(10,2),
  total_cafes_analyzed INTEGER DEFAULT 0,
  popular_products JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cafe_market_insights ENABLE ROW LEVEL SECURITY;

-- Cafes can view market insights for their city
CREATE POLICY "Cafes can view market insights" ON public.cafe_market_insights
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'cafe' 
      AND ur.status = 'approved'
      AND ur.city = cafe_market_insights.city
    )
  );

-- =============================================
-- 2. RARE COFFEE PRIORITY ACCESS
-- =============================================

-- Rare/Limited coffee releases
CREATE TABLE public.rare_coffee_releases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coffee_id UUID REFERENCES public.coffee_offerings(id) ON DELETE CASCADE,
  roasted_product_id UUID REFERENCES public.roasted_coffee_products(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  total_quantity_kg DECIMAL(10,2) NOT NULL,
  remaining_quantity_kg DECIMAL(10,2) NOT NULL,
  min_tier TEXT NOT NULL DEFAULT 'gold', -- bronze, silver, gold, platinum
  priority_access_ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  public_release_at TIMESTAMP WITH TIME ZONE,
  supplier_id UUID REFERENCES public.suppliers(id),
  roaster_id UUID,
  status TEXT NOT NULL DEFAULT 'priority_access', -- priority_access, public, sold_out
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT check_coffee_source CHECK (coffee_id IS NOT NULL OR roasted_product_id IS NOT NULL)
);

-- Priority reservations for rare coffees
CREATE TABLE public.rare_coffee_reservations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  release_id UUID NOT NULL REFERENCES public.rare_coffee_releases(id) ON DELETE CASCADE,
  cafe_id UUID NOT NULL,
  quantity_kg DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, confirmed, cancelled, completed
  reserved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(release_id, cafe_id)
);

-- Enable RLS
ALTER TABLE public.rare_coffee_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rare_coffee_reservations ENABLE ROW LEVEL SECURITY;

-- Cafes with required tier can view rare releases
CREATE POLICY "Cafes can view rare releases based on tier" ON public.rare_coffee_releases
  FOR SELECT USING (
    status = 'public' OR
    EXISTS (
      SELECT 1 FROM public.cafe_loyalty_points clp
      JOIN public.user_roles ur ON ur.user_id = auth.uid()
      WHERE ur.role = 'cafe' AND ur.status = 'approved'
      AND clp.cafe_id = ur.user_id
      AND (
        (min_tier = 'bronze') OR
        (min_tier = 'silver' AND clp.tier IN ('silver', 'gold', 'platinum')) OR
        (min_tier = 'gold' AND clp.tier IN ('gold', 'platinum')) OR
        (min_tier = 'platinum' AND clp.tier = 'platinum')
      )
    )
  );

-- Suppliers/Roasters can manage their releases
CREATE POLICY "Suppliers can manage their releases" ON public.rare_coffee_releases
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.suppliers s
      WHERE s.id = supplier_id AND s.user_id = auth.uid()
    ) OR
    roaster_id = auth.uid()
  );

-- Cafes can manage their reservations
CREATE POLICY "Cafes can manage their reservations" ON public.rare_coffee_reservations
  FOR ALL USING (cafe_id = auth.uid());

-- Suppliers/Roasters can view reservations for their releases
CREATE POLICY "Sellers can view reservations" ON public.rare_coffee_reservations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.rare_coffee_releases rcr
      WHERE rcr.id = release_id
      AND (
        EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = rcr.supplier_id AND s.user_id = auth.uid())
        OR rcr.roaster_id = auth.uid()
      )
    )
  );

-- =============================================
-- 3. CUSTOMER CHURN PREDICTION
-- =============================================

-- Track cafe customers and their visit patterns
CREATE TABLE public.cafe_customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cafe_id UUID NOT NULL,
  customer_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  first_visit_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_visit_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  total_visits INTEGER NOT NULL DEFAULT 1,
  total_spent DECIMAL(12,2) NOT NULL DEFAULT 0,
  avg_days_between_visits DECIMAL(10,2),
  churn_risk TEXT DEFAULT 'low', -- low, medium, high, churned
  churn_risk_updated_at TIMESTAMP WITH TIME ZONE,
  favorite_products TEXT[],
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Customer visit logs
CREATE TABLE public.cafe_customer_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.cafe_customers(id) ON DELETE CASCADE,
  cafe_id UUID NOT NULL,
  visit_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  amount_spent DECIMAL(10,2),
  products_purchased TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Churn alerts
CREATE TABLE public.cafe_churn_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cafe_id UUID NOT NULL,
  customer_id UUID NOT NULL REFERENCES public.cafe_customers(id) ON DELETE CASCADE,
  risk_level TEXT NOT NULL, -- medium, high, churned
  days_since_last_visit INTEGER NOT NULL,
  suggested_action TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_actioned BOOLEAN NOT NULL DEFAULT false,
  action_taken TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cafe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_customer_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_churn_alerts ENABLE ROW LEVEL SECURITY;

-- Cafes can manage their customers
CREATE POLICY "Cafes can manage their customers" ON public.cafe_customers
  FOR ALL USING (cafe_id = auth.uid());

CREATE POLICY "Cafes can manage their customer visits" ON public.cafe_customer_visits
  FOR ALL USING (cafe_id = auth.uid());

CREATE POLICY "Cafes can manage their churn alerts" ON public.cafe_churn_alerts
  FOR ALL USING (cafe_id = auth.uid());

-- =============================================
-- TRIGGERS
-- =============================================

-- Update timestamps
CREATE TRIGGER update_rare_coffee_releases_updated_at
  BEFORE UPDATE ON public.rare_coffee_releases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cafe_customers_updated_at
  BEFORE UPDATE ON public.cafe_customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update customer stats on new visit
CREATE OR REPLACE FUNCTION public.update_customer_on_visit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_days_diff DECIMAL;
  v_avg_days DECIMAL;
  v_total_visits INTEGER;
  v_churn_risk TEXT;
BEGIN
  -- Update customer stats
  UPDATE public.cafe_customers
  SET 
    last_visit_at = NEW.visit_at,
    total_visits = total_visits + 1,
    total_spent = total_spent + COALESCE(NEW.amount_spent, 0),
    updated_at = now()
  WHERE id = NEW.customer_id
  RETURNING total_visits INTO v_total_visits;
  
  -- Calculate average days between visits
  IF v_total_visits > 1 THEN
    SELECT EXTRACT(EPOCH FROM (MAX(visit_at) - MIN(visit_at))) / 86400 / (COUNT(*) - 1)
    INTO v_avg_days
    FROM public.cafe_customer_visits
    WHERE customer_id = NEW.customer_id;
    
    UPDATE public.cafe_customers
    SET avg_days_between_visits = v_avg_days
    WHERE id = NEW.customer_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_customer_visit
  AFTER INSERT ON public.cafe_customer_visits
  FOR EACH ROW EXECUTE FUNCTION public.update_customer_on_visit();

-- Function to calculate churn risk
CREATE OR REPLACE FUNCTION public.calculate_churn_risk()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_days_since_visit DECIMAL;
  v_expected_days DECIMAL;
  v_risk TEXT;
BEGIN
  -- Calculate days since last visit
  v_days_since_visit := EXTRACT(EPOCH FROM (now() - NEW.last_visit_at)) / 86400;
  v_expected_days := COALESCE(NEW.avg_days_between_visits, 7);
  
  -- Determine risk level
  IF v_days_since_visit > v_expected_days * 4 THEN
    v_risk := 'churned';
  ELSIF v_days_since_visit > v_expected_days * 2.5 THEN
    v_risk := 'high';
  ELSIF v_days_since_visit > v_expected_days * 1.5 THEN
    v_risk := 'medium';
  ELSE
    v_risk := 'low';
  END IF;
  
  -- Update if changed
  IF v_risk != COALESCE(OLD.churn_risk, 'low') THEN
    NEW.churn_risk := v_risk;
    NEW.churn_risk_updated_at := now();
    
    -- Create alert for medium/high/churned
    IF v_risk IN ('medium', 'high', 'churned') THEN
      INSERT INTO public.cafe_churn_alerts (cafe_id, customer_id, risk_level, days_since_last_visit, suggested_action)
      VALUES (
        NEW.cafe_id,
        NEW.id,
        v_risk,
        v_days_since_visit::INTEGER,
        CASE v_risk
          WHEN 'medium' THEN 'أرسل رسالة ترحيب أو عرض خاص'
          WHEN 'high' THEN 'اتصل بالعميل مباشرة أو قدم خصم حصري'
          WHEN 'churned' THEN 'حاول استعادة العميل بعرض مميز جداً'
        END
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.rare_coffee_releases;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cafe_churn_alerts;
