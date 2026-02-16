
-- Drop the old SELECT policy
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;

-- Create a new SELECT policy that allows both the orderer (roaster) and the supplier to view
CREATE POLICY "Users can view orders they're involved in" 
ON public.orders 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR 
  supplier_id IN (
    SELECT id FROM public.suppliers WHERE user_id = auth.uid()
  )
);

-- Also update UPDATE policy so suppliers can update order status
DROP POLICY IF EXISTS "Users can update their own orders" ON public.orders;

CREATE POLICY "Users can update orders they're involved in" 
ON public.orders 
FOR UPDATE 
USING (
  auth.uid() = user_id 
  OR 
  supplier_id IN (
    SELECT id FROM public.suppliers WHERE user_id = auth.uid()
  )
);
