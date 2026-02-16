-- =====================================================
-- SECURITY FIX PART 2: Remaining Policies
-- =====================================================

-- Fix supplier_offers remaining policies
DROP POLICY IF EXISTS "Business users can view active offers" ON public.supplier_offers;
DROP POLICY IF EXISTS "Suppliers can view their own offers" ON public.supplier_offers;
DROP POLICY IF EXISTS "Suppliers can manage their own offers" ON public.supplier_offers;

CREATE POLICY "Business users can view active offers" 
ON public.supplier_offers 
FOR SELECT 
TO authenticated 
USING (
  is_active = true 
  AND valid_until > now()
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role IN ('roaster', 'cafe', 'admin', 'supplier')
  )
);

CREATE POLICY "Suppliers can view their own offers" 
ON public.supplier_offers 
FOR SELECT 
TO authenticated 
USING (
  supplier_id IN (SELECT id FROM public.suppliers WHERE user_id = auth.uid())
);

CREATE POLICY "Suppliers can manage their own offers" 
ON public.supplier_offers 
FOR ALL 
TO authenticated 
USING (
  supplier_id IN (SELECT id FROM public.suppliers WHERE user_id = auth.uid())
)
WITH CHECK (
  supplier_id IN (SELECT id FROM public.suppliers WHERE user_id = auth.uid())
);

-- Fix messages policies
DROP POLICY IF EXISTS "Users can view their messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages they sent or received" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
DROP POLICY IF EXISTS "Senders can update their messages" ON public.messages;
DROP POLICY IF EXISTS "Receivers can mark messages as read" ON public.messages;

CREATE POLICY "Users can view messages they sent or received" 
ON public.messages 
FOR SELECT 
TO authenticated 
USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can send messages" 
ON public.messages 
FOR INSERT 
TO authenticated 
WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update their own messages" 
ON public.messages 
FOR UPDATE 
TO authenticated 
USING (sender_id = auth.uid() OR receiver_id = auth.uid());

-- Fix coffee_resale policies
DROP POLICY IF EXISTS "Anyone can view coffee resale" ON public.coffee_resale;
DROP POLICY IF EXISTS "Authenticated users can view approved resales" ON public.coffee_resale;
DROP POLICY IF EXISTS "Users can manage their own resale listings" ON public.coffee_resale;
DROP POLICY IF EXISTS "Users can create resale listings" ON public.coffee_resale;
DROP POLICY IF EXISTS "Sellers can update their listings" ON public.coffee_resale;
DROP POLICY IF EXISTS "Admins can manage all resale listings" ON public.coffee_resale;

CREATE POLICY "Authenticated users can view approved resales" 
ON public.coffee_resale 
FOR SELECT 
TO authenticated 
USING (
  (approval_status = 'approved' AND status = 'available')
  OR seller_id = auth.uid()
  OR buyer_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users can create resale listings" 
ON public.coffee_resale 
FOR INSERT 
TO authenticated 
WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Sellers can update their listings" 
ON public.coffee_resale 
FOR UPDATE 
TO authenticated 
USING (seller_id = auth.uid());

CREATE POLICY "Admins can manage all resale listings" 
ON public.coffee_resale 
FOR ALL 
TO authenticated 
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Fix auction_bids policies
DROP POLICY IF EXISTS "Anyone can view auction bids" ON public.auction_bids;
DROP POLICY IF EXISTS "Authenticated users can view bids" ON public.auction_bids;
DROP POLICY IF EXISTS "Bidders can view their own bids" ON public.auction_bids;
DROP POLICY IF EXISTS "Auction owners can view bids on their auctions" ON public.auction_bids;
DROP POLICY IF EXISTS "Auction owners can view their auction bids" ON public.auction_bids;
DROP POLICY IF EXISTS "Admins can view all bids" ON public.auction_bids;
DROP POLICY IF EXISTS "Authenticated users can place bids" ON public.auction_bids;

CREATE POLICY "Bidders can view their own bids" 
ON public.auction_bids 
FOR SELECT 
TO authenticated 
USING (bidder_id = auth.uid());

CREATE POLICY "Auction owners can view their auction bids" 
ON public.auction_bids 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.coffee_auctions ca 
    JOIN public.suppliers s ON ca.supplier_id = s.id
    WHERE ca.id = auction_id AND s.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all bids" 
ON public.auction_bids 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Authenticated users can place bids" 
ON public.auction_bids 
FOR INSERT 
TO authenticated 
WITH CHECK (bidder_id = auth.uid());