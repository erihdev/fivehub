-- Drop and recreate the suppliers SELECT policy to fix the role check
DROP POLICY IF EXISTS "Users can view suppliers" ON public.suppliers;

CREATE POLICY "Users can view suppliers"
ON public.suppliers
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  OR is_verified_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('roaster', 'cafe')
    AND status = 'approved'
  )
);