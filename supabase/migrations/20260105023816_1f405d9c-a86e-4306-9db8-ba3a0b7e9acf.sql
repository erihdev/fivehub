
-- Update the RLS policy to hide competitors (same role users)
DROP POLICY IF EXISTS "Authenticated users can view approved business info" ON public.user_roles;

-- Create new policy: users can see other roles but NOT their competitors (same role)
CREATE POLICY "Users can view non-competing businesses"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  -- Can always see own data
  user_id = auth.uid()
  OR
  -- Admins can see everyone
  is_verified_admin(auth.uid())
  OR
  -- Can see approved users with DIFFERENT role (not competitors)
  (
    status = 'approved'
    AND role != (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1)
  )
);

-- Update the get_business_directory function to also respect this logic
CREATE OR REPLACE FUNCTION public.get_business_directory()
RETURNS TABLE(id uuid, company_name text, city text, role app_role)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ur.id,
    ur.company_name,
    ur.city,
    ur.role
  FROM public.user_roles ur
  WHERE ur.status = 'approved'
    AND ur.company_name IS NOT NULL
    AND ur.role IN ('supplier', 'roaster')
    -- Exclude competitors (same role as current user)
    AND (
      auth.uid() IS NULL -- Anonymous users see all (for public pages)
      OR NOT EXISTS (
        SELECT 1 FROM public.user_roles curr 
        WHERE curr.user_id = auth.uid() 
        AND curr.role = ur.role
      )
    );
$$;
