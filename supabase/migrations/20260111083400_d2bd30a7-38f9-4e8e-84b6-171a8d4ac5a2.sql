
-- 1. Verified Reviews with Purchase Proof
CREATE TABLE public.verified_roaster_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  roaster_id UUID NOT NULL,
  cafe_id UUID NOT NULL,
  order_id UUID NOT NULL REFERENCES public.cafe_orders(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
  delivery_rating INTEGER CHECK (delivery_rating >= 1 AND delivery_rating <= 5),
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  order_details JSONB DEFAULT '{}',
  is_public BOOLEAN DEFAULT true,
  roaster_response TEXT,
  roaster_responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(order_id)
);

-- 2. Smart Recommendations (AI-powered)
CREATE TABLE public.smart_coffee_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cafe_id UUID NOT NULL,
  roaster_id UUID NOT NULL,
  product_id UUID REFERENCES public.roasted_coffee_products(id),
  recommendation_reason TEXT NOT NULL,
  match_score INTEGER DEFAULT 0 CHECK (match_score >= 0 AND match_score <= 100),
  based_on_orders UUID[] DEFAULT '{}',
  flavor_match JSONB DEFAULT '{}',
  is_viewed BOOLEAN DEFAULT false,
  is_acted_upon BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Profit Partnership Program
CREATE TABLE public.roaster_cafe_partnerships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  roaster_id UUID NOT NULL,
  cafe_id UUID NOT NULL,
  partnership_tier TEXT DEFAULT 'bronze' CHECK (partnership_tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
  total_orders INTEGER DEFAULT 0,
  total_spent DECIMAL(12,2) DEFAULT 0,
  current_discount_percentage DECIMAL(5,2) DEFAULT 0,
  next_tier_threshold DECIMAL(12,2),
  benefits JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(roaster_id, cafe_id)
);

-- Partnership history for tracking progress
CREATE TABLE public.partnership_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partnership_id UUID NOT NULL REFERENCES public.roaster_cafe_partnerships(id) ON DELETE CASCADE,
  milestone_type TEXT NOT NULL,
  old_tier TEXT,
  new_tier TEXT,
  discount_earned DECIMAL(5,2),
  order_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.verified_roaster_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_coffee_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roaster_cafe_partnerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partnership_milestones ENABLE ROW LEVEL SECURITY;

-- RLS Policies for verified_roaster_reviews
CREATE POLICY "Cafes can create reviews for their orders" ON public.verified_roaster_reviews
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.cafe_orders WHERE id = order_id AND cafe_id = verified_roaster_reviews.cafe_id)
  );

CREATE POLICY "Public reviews are viewable by everyone" ON public.verified_roaster_reviews
  FOR SELECT USING (is_public = true);

CREATE POLICY "Roasters can view their reviews" ON public.verified_roaster_reviews
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'roaster')
  );

CREATE POLICY "Roasters can respond to their reviews" ON public.verified_roaster_reviews
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.roasted_coffee_products rcp
      JOIN public.cafe_order_items coi ON coi.product_id = rcp.id
      JOIN public.cafe_orders co ON co.id = coi.order_id
      WHERE co.id = verified_roaster_reviews.order_id
      AND rcp.roaster_id = auth.uid()
    )
  );

-- RLS Policies for smart_coffee_recommendations
CREATE POLICY "Cafes can view their recommendations" ON public.smart_coffee_recommendations
  FOR SELECT USING (cafe_id = auth.uid());

CREATE POLICY "Roasters can manage recommendations" ON public.smart_coffee_recommendations
  FOR ALL USING (roaster_id = auth.uid());

-- RLS Policies for partnerships
CREATE POLICY "Cafes can view their partnerships" ON public.roaster_cafe_partnerships
  FOR SELECT USING (cafe_id = auth.uid());

CREATE POLICY "Roasters can manage their partnerships" ON public.roaster_cafe_partnerships
  FOR ALL USING (roaster_id = auth.uid());

CREATE POLICY "Partnership milestones viewable by participants" ON public.partnership_milestones
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.roaster_cafe_partnerships p
      WHERE p.id = partnership_id
      AND (p.cafe_id = auth.uid() OR p.roaster_id = auth.uid())
    )
  );

-- Function to update partnership on order delivery
CREATE OR REPLACE FUNCTION public.update_partnership_on_delivery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_roaster_id UUID;
  v_partnership_id UUID;
  v_new_total DECIMAL(12,2);
  v_new_tier TEXT;
  v_new_discount DECIMAL(5,2);
  v_old_tier TEXT;
BEGIN
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    -- Get roaster from order items
    SELECT DISTINCT coi.roaster_id INTO v_roaster_id
    FROM public.cafe_order_items coi
    WHERE coi.order_id = NEW.id
    LIMIT 1;
    
    IF v_roaster_id IS NOT NULL THEN
      -- Create or update partnership
      INSERT INTO public.roaster_cafe_partnerships (roaster_id, cafe_id, total_orders, total_spent)
      VALUES (v_roaster_id, NEW.cafe_id, 1, NEW.total_amount)
      ON CONFLICT (roaster_id, cafe_id) DO UPDATE SET
        total_orders = roaster_cafe_partnerships.total_orders + 1,
        total_spent = roaster_cafe_partnerships.total_spent + NEW.total_amount,
        updated_at = now()
      RETURNING id, total_spent, partnership_tier INTO v_partnership_id, v_new_total, v_old_tier;
      
      -- Calculate new tier and discount
      v_new_tier := CASE
        WHEN v_new_total >= 100000 THEN 'diamond'
        WHEN v_new_total >= 50000 THEN 'platinum'
        WHEN v_new_total >= 20000 THEN 'gold'
        WHEN v_new_total >= 5000 THEN 'silver'
        ELSE 'bronze'
      END;
      
      v_new_discount := CASE v_new_tier
        WHEN 'diamond' THEN 15.0
        WHEN 'platinum' THEN 10.0
        WHEN 'gold' THEN 7.0
        WHEN 'silver' THEN 4.0
        ELSE 2.0
      END;
      
      -- Update tier if changed
      IF v_new_tier != v_old_tier THEN
        UPDATE public.roaster_cafe_partnerships
        SET partnership_tier = v_new_tier,
            current_discount_percentage = v_new_discount,
            next_tier_threshold = CASE v_new_tier
              WHEN 'bronze' THEN 5000
              WHEN 'silver' THEN 20000
              WHEN 'gold' THEN 50000
              WHEN 'platinum' THEN 100000
              ELSE NULL
            END
        WHERE id = v_partnership_id;
        
        -- Record milestone
        INSERT INTO public.partnership_milestones (partnership_id, milestone_type, old_tier, new_tier, discount_earned, order_id)
        VALUES (v_partnership_id, 'tier_upgrade', v_old_tier, v_new_tier, v_new_discount, NEW.id);
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER update_partnership_trigger
  AFTER UPDATE ON public.cafe_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_partnership_on_delivery();

-- Indexes
CREATE INDEX idx_verified_reviews_roaster ON public.verified_roaster_reviews(roaster_id);
CREATE INDEX idx_verified_reviews_cafe ON public.verified_roaster_reviews(cafe_id);
CREATE INDEX idx_recommendations_cafe ON public.smart_coffee_recommendations(cafe_id);
CREATE INDEX idx_partnerships_roaster ON public.roaster_cafe_partnerships(roaster_id);
CREATE INDEX idx_partnerships_cafe ON public.roaster_cafe_partnerships(cafe_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.verified_roaster_reviews;
ALTER PUBLICATION supabase_realtime ADD TABLE public.roaster_cafe_partnerships;
