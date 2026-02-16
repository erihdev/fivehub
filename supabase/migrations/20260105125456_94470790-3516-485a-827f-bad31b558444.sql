-- =====================================================
-- SECURITY FIX PART 4: Remaining Tables (with correct names)
-- =====================================================

-- 1. Fix profiles - Drop duplicate and recreate
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Profile owner can view their profile" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

CREATE POLICY "Admins can access all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Profile owner can update their profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Profile owner can insert their profile" 
ON public.profiles 
FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());

-- 2. Fix barista_certifications
DROP POLICY IF EXISTS "Cafe owners can view their certifications" ON public.barista_certifications;
DROP POLICY IF EXISTS "Cafe owners can manage their certifications" ON public.barista_certifications;
DROP POLICY IF EXISTS "Admins can view all certifications" ON public.barista_certifications;
DROP POLICY IF EXISTS "Anyone can view barista certifications" ON public.barista_certifications;
DROP POLICY IF EXISTS "Authenticated users can view certifications" ON public.barista_certifications;

CREATE POLICY "Cafes can view own barista certifications" 
ON public.barista_certifications 
FOR SELECT 
TO authenticated 
USING (cafe_id = auth.uid());

CREATE POLICY "Cafes can manage own barista certifications" 
ON public.barista_certifications 
FOR ALL 
TO authenticated 
USING (cafe_id = auth.uid())
WITH CHECK (cafe_id = auth.uid());

CREATE POLICY "Admins can access all barista certifications" 
ON public.barista_certifications 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- 3. Fix universal_loyalty_cards (if not already fixed)
DROP POLICY IF EXISTS "Cafes can view and manage their loyalty cards" ON public.universal_loyalty_cards;
DROP POLICY IF EXISTS "Admins and cafes can view loyalty cards" ON public.universal_loyalty_cards;

CREATE POLICY "Authorized cafes can manage loyalty cards" 
ON public.universal_loyalty_cards 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role IN ('cafe', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role IN ('cafe', 'admin')
  )
);

-- 4. Remove problematic auction_bids policy
DROP POLICY IF EXISTS "Bids viewable by authenticated users" ON public.auction_bids;
DROP POLICY IF EXISTS "Authenticated users can view bids" ON public.auction_bids;