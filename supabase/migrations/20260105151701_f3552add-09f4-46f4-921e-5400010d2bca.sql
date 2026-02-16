-- Drop and recreate get_business_directory function to include user_id and cafe role
DROP FUNCTION IF EXISTS public.get_business_directory();

CREATE FUNCTION public.get_business_directory()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  company_name text,
  city text,
  role text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ur.id,
    ur.user_id,
    ur.company_name,
    ur.city,
    ur.role::text
  FROM public.user_roles ur
  WHERE ur.status = 'approved'
    AND ur.company_name IS NOT NULL
    AND ur.role IN ('supplier', 'roaster', 'cafe')
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