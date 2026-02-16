-- ============================================
-- SECURITY FIXES - CRITICAL RLS POLICY FIXES
-- ============================================

-- Fix coffee_resale - Only authenticated users can update to purchase available items
DROP POLICY IF EXISTS "Buyers can update resale for purchase" ON public.coffee_resale;

CREATE POLICY "Buyers can update resale for purchase"
  ON public.coffee_resale
  FOR UPDATE
  USING (
    -- Allow update only on available and approved items
    status = 'available' AND approval_status = 'approved'
    AND auth.uid() IS NOT NULL
  )
  WITH CHECK (
    -- Buyer must be the authenticated user
    buyer_id = auth.uid()
  );

-- Fix duplicate SELECT policy on coffee_resale
DROP POLICY IF EXISTS "Resale viewable by authenticated" ON public.coffee_resale;

-- Fix universal_loyalty_cards - Remove the overly permissive INSERT policy
DROP POLICY IF EXISTS "Cafes can create loyalty cards" ON public.universal_loyalty_cards;
-- The existing "Authorized cafes can manage loyalty cards" policy is already correct

-- Fix cafe_ai_recommendations - Only cafes can create their own recommendations
DROP POLICY IF EXISTS "System can create AI recommendations" ON public.cafe_ai_recommendations;

CREATE POLICY "Cafes can create their own AI recommendations"
  ON public.cafe_ai_recommendations
  FOR INSERT
  WITH CHECK (
    cafe_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );