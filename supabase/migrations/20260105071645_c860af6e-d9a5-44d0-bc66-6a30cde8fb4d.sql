
-- إضافة جداول المميزات الثورية للمقاهي

-- 1. جدول تفضيلات النكهات للـ AI Sommelier
CREATE TABLE public.cafe_flavor_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id UUID NOT NULL,
  preferred_origins TEXT[] DEFAULT '{}',
  preferred_processes TEXT[] DEFAULT '{}',
  flavor_notes TEXT[] DEFAULT '{}',
  roast_level_preference TEXT DEFAULT 'medium',
  acidity_preference INTEGER DEFAULT 5 CHECK (acidity_preference BETWEEN 1 AND 10),
  body_preference INTEGER DEFAULT 5 CHECK (body_preference BETWEEN 1 AND 10),
  sweetness_preference INTEGER DEFAULT 5 CHECK (sweetness_preference BETWEEN 1 AND 10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(cafe_id)
);

-- 2. جدول توصيات الذكاء الاصطناعي
CREATE TABLE public.cafe_ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id UUID NOT NULL,
  product_id UUID REFERENCES public.roasted_coffee_products(id) ON DELETE CASCADE,
  green_coffee_id UUID REFERENCES public.coffee_offerings(id) ON DELETE CASCADE,
  recommendation_type TEXT NOT NULL, -- 'roasted', 'green', 'blend'
  match_score DECIMAL(5,2) DEFAULT 0,
  reasoning TEXT,
  is_viewed BOOLEAN DEFAULT false,
  is_acted_upon BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. جدول طلبات التحميص حسب الطلب
CREATE TABLE public.custom_roast_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id UUID NOT NULL,
  roaster_id UUID NOT NULL,
  green_coffee_id UUID REFERENCES public.coffee_offerings(id),
  roast_level TEXT NOT NULL,
  quantity_kg DECIMAL(10,2) NOT NULL,
  special_instructions TEXT,
  target_flavor_notes TEXT[],
  price_per_kg DECIMAL(10,2),
  total_price DECIMAL(10,2),
  status TEXT DEFAULT 'pending', -- pending, accepted, in_progress, roasting, ready, shipped, delivered
  roast_date TIMESTAMP WITH TIME ZONE,
  expected_delivery DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. جدول البن الحصري للمقاهي المميزة
CREATE TABLE public.exclusive_coffee_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coffee_id UUID REFERENCES public.coffee_offerings(id) ON DELETE CASCADE,
  access_type TEXT DEFAULT 'priority', -- priority, exclusive, early_access
  min_loyalty_tier TEXT DEFAULT 'silver',
  available_quantity_kg DECIMAL(10,2),
  reserved_quantity_kg DECIMAL(10,2) DEFAULT 0,
  release_date TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. جدول شهادات الباريستا
CREATE TABLE public.barista_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id UUID NOT NULL,
  barista_name TEXT NOT NULL,
  barista_email TEXT,
  certification_type TEXT NOT NULL, -- basic, intermediate, advanced, master
  course_id UUID REFERENCES public.cafe_training_sessions(id),
  score DECIMAL(5,2),
  passed BOOLEAN DEFAULT false,
  certificate_url TEXT,
  issued_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. جدول جلسات التذوق الافتراضية
CREATE TABLE public.virtual_tasting_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL, -- supplier or roaster
  host_type TEXT NOT NULL, -- 'supplier', 'roaster'
  title TEXT NOT NULL,
  title_ar TEXT,
  description TEXT,
  description_ar TEXT,
  coffee_samples JSON, -- array of coffee IDs to taste
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  max_participants INTEGER DEFAULT 20,
  video_url TEXT,
  status TEXT DEFAULT 'scheduled', -- scheduled, live, completed, cancelled
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 7. جدول تسجيل جلسات التذوق
CREATE TABLE public.virtual_tasting_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.virtual_tasting_sessions(id) ON DELETE CASCADE,
  cafe_id UUID NOT NULL,
  samples_shipped BOOLEAN DEFAULT false,
  shipping_tracking TEXT,
  attended BOOLEAN DEFAULT false,
  feedback TEXT,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 8. جدول تحالف المقاهي للشراء الجماعي
CREATE TABLE public.cafe_alliance_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  leader_cafe_id UUID NOT NULL,
  min_members INTEGER DEFAULT 3,
  max_members INTEGER DEFAULT 20,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 9. جدول أعضاء التحالف
CREATE TABLE public.cafe_alliance_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alliance_id UUID REFERENCES public.cafe_alliance_groups(id) ON DELETE CASCADE,
  cafe_id UUID NOT NULL,
  role TEXT DEFAULT 'member', -- leader, member
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(alliance_id, cafe_id)
);

-- 10. جدول طلبات التحالف الجماعية
CREATE TABLE public.alliance_group_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alliance_id UUID REFERENCES public.cafe_alliance_groups(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.roasted_coffee_products(id),
  green_coffee_id UUID REFERENCES public.coffee_offerings(id),
  total_quantity_kg DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  discount_applied DECIMAL(5,2) DEFAULT 0,
  final_price_per_kg DECIMAL(10,2),
  status TEXT DEFAULT 'collecting', -- collecting, confirmed, processing, shipped, delivered
  deadline TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 11. جدول مساهمات أعضاء التحالف في الطلب
CREATE TABLE public.alliance_order_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_order_id UUID REFERENCES public.alliance_group_orders(id) ON DELETE CASCADE,
  cafe_id UUID NOT NULL,
  quantity_kg DECIMAL(10,2) NOT NULL,
  amount_due DECIMAL(10,2),
  paid BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 12. جدول بطاقة الولاء الموحدة
CREATE TABLE public.universal_loyalty_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_number TEXT UNIQUE NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  total_points INTEGER DEFAULT 0,
  tier TEXT DEFAULT 'bronze', -- bronze, silver, gold, platinum
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 13. جدول معاملات الولاء الموحد
CREATE TABLE public.universal_loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID REFERENCES public.universal_loyalty_cards(id) ON DELETE CASCADE,
  cafe_id UUID NOT NULL,
  transaction_type TEXT NOT NULL, -- earn, redeem
  points INTEGER NOT NULL,
  description TEXT,
  order_amount DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 14. جدول تقارير المنافسة
CREATE TABLE public.competition_intelligence_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id UUID NOT NULL,
  report_type TEXT NOT NULL, -- market_analysis, pricing, trends, competitor
  report_data JSON,
  insights TEXT[],
  recommendations TEXT[],
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 15. جدول ضمان الجودة
CREATE TABLE public.quality_guarantees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID,
  order_type TEXT, -- 'cafe_order', 'custom_roast', 'alliance_order'
  quality_score DECIMAL(5,2),
  issues_reported TEXT[],
  resolution_status TEXT DEFAULT 'none', -- none, reported, investigating, resolved, refunded
  refund_amount DECIMAL(10,2),
  replacement_order_id UUID,
  reported_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 16. جدول إعدادات التوريد الذكي
CREATE TABLE public.smart_supply_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id UUID NOT NULL UNIQUE,
  enabled BOOLEAN DEFAULT true,
  min_stock_days INTEGER DEFAULT 7,
  auto_order_enabled BOOLEAN DEFAULT false,
  preferred_roaster_id UUID,
  preferred_supplier_id UUID REFERENCES public.suppliers(id),
  budget_limit_monthly DECIMAL(10,2),
  notification_threshold_days INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.cafe_flavor_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_roast_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exclusive_coffee_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barista_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.virtual_tasting_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.virtual_tasting_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_alliance_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_alliance_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alliance_group_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alliance_order_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.universal_loyalty_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.universal_loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_intelligence_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_guarantees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_supply_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cafe_flavor_preferences
CREATE POLICY "Cafes can manage their flavor preferences"
ON public.cafe_flavor_preferences FOR ALL
TO authenticated
USING (cafe_id = auth.uid())
WITH CHECK (cafe_id = auth.uid());

-- RLS Policies for cafe_ai_recommendations
CREATE POLICY "Cafes can view their AI recommendations"
ON public.cafe_ai_recommendations FOR SELECT
TO authenticated
USING (cafe_id = auth.uid());

CREATE POLICY "System can create AI recommendations"
ON public.cafe_ai_recommendations FOR INSERT
TO authenticated
WITH CHECK (true);

-- RLS Policies for custom_roast_requests
CREATE POLICY "Cafes can manage their roast requests"
ON public.custom_roast_requests FOR ALL
TO authenticated
USING (cafe_id = auth.uid())
WITH CHECK (cafe_id = auth.uid());

CREATE POLICY "Roasters can view and update their roast requests"
ON public.custom_roast_requests FOR ALL
TO authenticated
USING (roaster_id = auth.uid());

-- RLS Policies for exclusive_coffee_access
CREATE POLICY "Anyone can view exclusive coffee access"
ON public.exclusive_coffee_access FOR SELECT
TO authenticated
USING (true);

-- RLS Policies for barista_certifications
CREATE POLICY "Cafes can manage their barista certifications"
ON public.barista_certifications FOR ALL
TO authenticated
USING (cafe_id = auth.uid())
WITH CHECK (cafe_id = auth.uid());

-- RLS Policies for virtual_tasting_sessions
CREATE POLICY "Anyone can view virtual tasting sessions"
ON public.virtual_tasting_sessions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Hosts can manage their sessions"
ON public.virtual_tasting_sessions FOR ALL
TO authenticated
USING (host_id = auth.uid())
WITH CHECK (host_id = auth.uid());

-- RLS Policies for virtual_tasting_registrations
CREATE POLICY "Cafes can manage their tasting registrations"
ON public.virtual_tasting_registrations FOR ALL
TO authenticated
USING (cafe_id = auth.uid())
WITH CHECK (cafe_id = auth.uid());

-- RLS Policies for cafe_alliance_groups
CREATE POLICY "Anyone can view alliance groups"
ON public.cafe_alliance_groups FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Leaders can manage their alliance"
ON public.cafe_alliance_groups FOR ALL
TO authenticated
USING (leader_cafe_id = auth.uid())
WITH CHECK (leader_cafe_id = auth.uid());

-- RLS Policies for cafe_alliance_members
CREATE POLICY "Anyone can view alliance members"
ON public.cafe_alliance_members FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Cafes can join/leave alliances"
ON public.cafe_alliance_members FOR ALL
TO authenticated
USING (cafe_id = auth.uid())
WITH CHECK (cafe_id = auth.uid());

-- RLS Policies for alliance_group_orders
CREATE POLICY "Alliance members can view group orders"
ON public.alliance_group_orders FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.cafe_alliance_members
    WHERE alliance_id = alliance_group_orders.alliance_id
    AND cafe_id = auth.uid()
  )
);

-- RLS Policies for alliance_order_contributions
CREATE POLICY "Cafes can manage their contributions"
ON public.alliance_order_contributions FOR ALL
TO authenticated
USING (cafe_id = auth.uid())
WITH CHECK (cafe_id = auth.uid());

-- RLS Policies for universal_loyalty_cards
CREATE POLICY "Anyone can view loyalty cards"
ON public.universal_loyalty_cards FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Cafes can create loyalty cards"
ON public.universal_loyalty_cards FOR INSERT
TO authenticated
WITH CHECK (true);

-- RLS Policies for universal_loyalty_transactions
CREATE POLICY "Cafes can manage loyalty transactions"
ON public.universal_loyalty_transactions FOR ALL
TO authenticated
USING (cafe_id = auth.uid())
WITH CHECK (cafe_id = auth.uid());

-- RLS Policies for competition_intelligence_reports
CREATE POLICY "Cafes can view their reports"
ON public.competition_intelligence_reports FOR SELECT
TO authenticated
USING (cafe_id = auth.uid());

-- RLS Policies for quality_guarantees
CREATE POLICY "Anyone can view and create quality guarantees"
ON public.quality_guarantees FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- RLS Policies for smart_supply_settings
CREATE POLICY "Cafes can manage their supply settings"
ON public.smart_supply_settings FOR ALL
TO authenticated
USING (cafe_id = auth.uid())
WITH CHECK (cafe_id = auth.uid());

-- Triggers for updated_at
CREATE TRIGGER update_cafe_flavor_preferences_updated_at
  BEFORE UPDATE ON public.cafe_flavor_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_custom_roast_requests_updated_at
  BEFORE UPDATE ON public.custom_roast_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_virtual_tasting_sessions_updated_at
  BEFORE UPDATE ON public.virtual_tasting_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cafe_alliance_groups_updated_at
  BEFORE UPDATE ON public.cafe_alliance_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_alliance_group_orders_updated_at
  BEFORE UPDATE ON public.alliance_group_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_universal_loyalty_cards_updated_at
  BEFORE UPDATE ON public.universal_loyalty_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_smart_supply_settings_updated_at
  BEFORE UPDATE ON public.smart_supply_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
