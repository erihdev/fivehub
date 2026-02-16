-- Add 'cafe' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'cafe';

-- Create roasted_coffee_products table for roasters to list their roasted products
CREATE TABLE public.roasted_coffee_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    roaster_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    name_ar TEXT,
    description TEXT,
    description_ar TEXT,
    roast_level TEXT NOT NULL CHECK (roast_level IN ('light', 'medium', 'medium_dark', 'dark')),
    origin_coffee_id UUID REFERENCES public.coffee_offerings(id),
    price_per_kg DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'SAR',
    min_order_kg DECIMAL(10,2) DEFAULT 1,
    available BOOLEAN DEFAULT true,
    flavor_notes TEXT[],
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create cafe_subscriptions for recurring orders
CREATE TABLE public.cafe_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cafe_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    roaster_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.roasted_coffee_products(id) ON DELETE CASCADE,
    quantity_kg DECIMAL(10,2) NOT NULL,
    frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),
    delivery_day INTEGER CHECK (delivery_day BETWEEN 0 AND 6),
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
    next_delivery_date DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create cafe_orders for direct orders from cafes
CREATE TABLE public.cafe_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cafe_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    order_type TEXT NOT NULL CHECK (order_type IN ('direct_roaster', 'three_party')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'roasting', 'shipped', 'delivered', 'cancelled')),
    total_amount DECIMAL(12,2),
    currency TEXT DEFAULT 'SAR',
    delivery_address TEXT,
    notes TEXT,
    subscription_id UUID REFERENCES public.cafe_subscriptions(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create cafe_order_items
CREATE TABLE public.cafe_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.cafe_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.roasted_coffee_products(id),
    roaster_id UUID REFERENCES auth.users(id),
    supplier_id UUID REFERENCES public.suppliers(id),
    green_coffee_id UUID REFERENCES public.coffee_offerings(id),
    quantity_kg DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(12,2) NOT NULL,
    roast_level TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create three_party_requests for marketplace requests
CREATE TABLE public.three_party_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cafe_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    origin_preference TEXT,
    roast_level_preference TEXT,
    quantity_kg DECIMAL(10,2) NOT NULL,
    budget_per_kg DECIMAL(10,2),
    currency TEXT DEFAULT 'SAR',
    delivery_date DATE,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'bidding', 'awarded', 'in_progress', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create three_party_bids for roasters and suppliers to bid
CREATE TABLE public.three_party_bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.three_party_requests(id) ON DELETE CASCADE,
    roaster_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
    green_coffee_id UUID REFERENCES public.coffee_offerings(id),
    green_coffee_price_per_kg DECIMAL(10,2) NOT NULL,
    roasting_fee_per_kg DECIMAL(10,2) NOT NULL,
    total_price_per_kg DECIMAL(10,2) NOT NULL,
    delivery_days INTEGER,
    notes TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create cafe_inventory for inventory tracking
CREATE TABLE public.cafe_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cafe_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.roasted_coffee_products(id),
    product_name TEXT NOT NULL,
    quantity_kg DECIMAL(10,2) NOT NULL DEFAULT 0,
    min_quantity_kg DECIMAL(10,2) DEFAULT 5,
    auto_reorder BOOLEAN DEFAULT false,
    auto_reorder_quantity_kg DECIMAL(10,2) DEFAULT 10,
    last_restocked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(cafe_id, product_id)
);

-- Create cafe_loyalty_points for loyalty program
CREATE TABLE public.cafe_loyalty_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cafe_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    points_balance INTEGER DEFAULT 0,
    total_points_earned INTEGER DEFAULT 0,
    total_points_redeemed INTEGER DEFAULT 0,
    tier TEXT DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(cafe_id)
);

-- Create cafe_loyalty_transactions for points history
CREATE TABLE public.cafe_loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cafe_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    points INTEGER NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earned', 'redeemed', 'expired', 'bonus')),
    description TEXT,
    order_id UUID REFERENCES public.cafe_orders(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create cafe_training_sessions for training/support
CREATE TABLE public.cafe_training_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    roaster_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    title_ar TEXT,
    description TEXT,
    description_ar TEXT,
    session_type TEXT CHECK (session_type IN ('online', 'in_person', 'video')),
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    max_participants INTEGER DEFAULT 20,
    price DECIMAL(10,2) DEFAULT 0,
    currency TEXT DEFAULT 'SAR',
    is_free BOOLEAN DEFAULT false,
    video_url TEXT,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create cafe_training_registrations
CREATE TABLE public.cafe_training_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.cafe_training_sessions(id) ON DELETE CASCADE,
    cafe_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'registered' CHECK (status IN ('registered', 'attended', 'cancelled')),
    registered_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(session_id, cafe_id)
);

-- Create three_party_commissions for commission tracking
CREATE TABLE public.three_party_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.cafe_orders(id) ON DELETE CASCADE,
    cafe_id UUID NOT NULL REFERENCES auth.users(id),
    roaster_id UUID NOT NULL REFERENCES auth.users(id),
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
    order_total DECIMAL(12,2) NOT NULL,
    cafe_commission DECIMAL(12,2) NOT NULL,
    roaster_commission DECIMAL(12,2) NOT NULL,
    supplier_commission DECIMAL(12,2) NOT NULL,
    total_commission DECIMAL(12,2) NOT NULL,
    commission_rate DECIMAL(5,2) DEFAULT 2.0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'collected', 'paid')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.roasted_coffee_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.three_party_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.three_party_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_training_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.three_party_commissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for roasted_coffee_products
CREATE POLICY "Anyone can view available roasted products" ON public.roasted_coffee_products
    FOR SELECT USING (available = true);

CREATE POLICY "Roasters can manage their products" ON public.roasted_coffee_products
    FOR ALL USING (auth.uid() = roaster_id);

-- RLS Policies for cafe_subscriptions
CREATE POLICY "Cafes can view their subscriptions" ON public.cafe_subscriptions
    FOR SELECT USING (auth.uid() = cafe_id);

CREATE POLICY "Cafes can manage their subscriptions" ON public.cafe_subscriptions
    FOR ALL USING (auth.uid() = cafe_id);

CREATE POLICY "Roasters can view subscriptions to their products" ON public.cafe_subscriptions
    FOR SELECT USING (auth.uid() = roaster_id);

-- RLS Policies for cafe_orders
CREATE POLICY "Cafes can view their orders" ON public.cafe_orders
    FOR SELECT USING (auth.uid() = cafe_id);

CREATE POLICY "Cafes can create orders" ON public.cafe_orders
    FOR INSERT WITH CHECK (auth.uid() = cafe_id);

-- RLS Policies for cafe_order_items
CREATE POLICY "Order items viewable by order owner" ON public.cafe_order_items
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.cafe_orders WHERE id = order_id AND cafe_id = auth.uid())
        OR auth.uid() = roaster_id
    );

CREATE POLICY "Cafe can insert order items" ON public.cafe_order_items
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.cafe_orders WHERE id = order_id AND cafe_id = auth.uid())
    );

-- RLS Policies for three_party_requests
CREATE POLICY "Anyone authenticated can view open requests" ON public.three_party_requests
    FOR SELECT USING (status = 'open' OR cafe_id = auth.uid());

CREATE POLICY "Cafes can create requests" ON public.three_party_requests
    FOR INSERT WITH CHECK (auth.uid() = cafe_id);

CREATE POLICY "Cafes can update their requests" ON public.three_party_requests
    FOR UPDATE USING (auth.uid() = cafe_id);

-- RLS Policies for three_party_bids
CREATE POLICY "Request owner can view bids" ON public.three_party_bids
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.three_party_requests WHERE id = request_id AND cafe_id = auth.uid())
        OR roaster_id = auth.uid()
    );

CREATE POLICY "Roasters can create bids" ON public.three_party_bids
    FOR INSERT WITH CHECK (auth.uid() = roaster_id);

-- RLS Policies for cafe_inventory
CREATE POLICY "Cafes can manage their inventory" ON public.cafe_inventory
    FOR ALL USING (auth.uid() = cafe_id);

-- RLS Policies for cafe_loyalty_points
CREATE POLICY "Cafes can view their points" ON public.cafe_loyalty_points
    FOR SELECT USING (auth.uid() = cafe_id);

-- RLS Policies for cafe_loyalty_transactions
CREATE POLICY "Cafes can view their transactions" ON public.cafe_loyalty_transactions
    FOR SELECT USING (auth.uid() = cafe_id);

-- RLS Policies for cafe_training_sessions
CREATE POLICY "Anyone can view scheduled sessions" ON public.cafe_training_sessions
    FOR SELECT USING (status IN ('scheduled', 'live'));

CREATE POLICY "Roasters can manage their sessions" ON public.cafe_training_sessions
    FOR ALL USING (auth.uid() = roaster_id);

-- RLS Policies for cafe_training_registrations
CREATE POLICY "Cafes can manage their registrations" ON public.cafe_training_registrations
    FOR ALL USING (auth.uid() = cafe_id);

CREATE POLICY "Roasters can view registrations for their sessions" ON public.cafe_training_registrations
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.cafe_training_sessions WHERE id = session_id AND roaster_id = auth.uid())
    );

-- RLS Policies for three_party_commissions
CREATE POLICY "Admins can view all commissions" ON public.three_party_commissions
    FOR SELECT USING (public.is_verified_admin(auth.uid()));

CREATE POLICY "Parties can view their commissions" ON public.three_party_commissions
    FOR SELECT USING (
        auth.uid() = cafe_id OR auth.uid() = roaster_id
    );

-- Add realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.three_party_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.three_party_bids;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cafe_orders;

-- Create function to calculate loyalty points
CREATE OR REPLACE FUNCTION public.calculate_cafe_loyalty_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_points INTEGER;
    v_current_balance INTEGER;
    v_new_tier TEXT;
BEGIN
    IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
        -- Calculate points (1 point per 10 SAR)
        v_points := FLOOR(NEW.total_amount / 10);
        
        -- Insert or update loyalty points
        INSERT INTO public.cafe_loyalty_points (cafe_id, points_balance, total_points_earned)
        VALUES (NEW.cafe_id, v_points, v_points)
        ON CONFLICT (cafe_id) DO UPDATE SET
            points_balance = cafe_loyalty_points.points_balance + v_points,
            total_points_earned = cafe_loyalty_points.total_points_earned + v_points,
            updated_at = now();
        
        -- Log the transaction
        INSERT INTO public.cafe_loyalty_transactions (cafe_id, points, transaction_type, description, order_id)
        VALUES (NEW.cafe_id, v_points, 'earned', 'Points earned from order', NEW.id);
        
        -- Update tier based on total points
        SELECT total_points_earned INTO v_current_balance
        FROM public.cafe_loyalty_points WHERE cafe_id = NEW.cafe_id;
        
        v_new_tier := CASE
            WHEN v_current_balance >= 10000 THEN 'platinum'
            WHEN v_current_balance >= 5000 THEN 'gold'
            WHEN v_current_balance >= 1000 THEN 'silver'
            ELSE 'bronze'
        END;
        
        UPDATE public.cafe_loyalty_points 
        SET tier = v_new_tier, updated_at = now()
        WHERE cafe_id = NEW.cafe_id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for loyalty points
CREATE TRIGGER calculate_cafe_loyalty_points_trigger
AFTER UPDATE ON public.cafe_orders
FOR EACH ROW
EXECUTE FUNCTION public.calculate_cafe_loyalty_points();

-- Update updated_at triggers
CREATE TRIGGER update_roasted_coffee_products_updated_at
BEFORE UPDATE ON public.roasted_coffee_products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cafe_subscriptions_updated_at
BEFORE UPDATE ON public.cafe_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cafe_orders_updated_at
BEFORE UPDATE ON public.cafe_orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cafe_inventory_updated_at
BEFORE UPDATE ON public.cafe_inventory
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cafe_loyalty_points_updated_at
BEFORE UPDATE ON public.cafe_loyalty_points
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cafe_training_sessions_updated_at
BEFORE UPDATE ON public.cafe_training_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_three_party_requests_updated_at
BEFORE UPDATE ON public.three_party_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_three_party_commissions_updated_at
BEFORE UPDATE ON public.three_party_commissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();