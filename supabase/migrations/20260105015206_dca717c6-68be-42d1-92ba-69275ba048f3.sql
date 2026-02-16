-- Fix PUBLIC_DATA_EXPOSURE: Create a secure view for public marketing pages
-- This view only exposes non-sensitive columns (no email/phone)

-- Create a view for public display of approved suppliers/roasters (no PII)
CREATE OR REPLACE VIEW public.public_business_directory AS
SELECT 
  id,
  user_id,
  company_name,
  city,
  role,
  created_at
FROM public.user_roles
WHERE status = 'approved' AND role IN ('supplier', 'roaster');

-- Grant SELECT on the view to both anonymous and authenticated users
GRANT SELECT ON public.public_business_directory TO anon, authenticated;

-- Drop the overly permissive policy that exposes all columns including email/phone
DROP POLICY IF EXISTS "Anyone can view approved suppliers and roasters basic info" ON public.user_roles;

-- Create a new policy that requires authentication to access the full user_roles table
-- This protects sensitive columns like company_email and company_phone
CREATE POLICY "Authenticated users can view approved business info"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  -- Users can see their own record
  user_id = auth.uid()
  OR
  -- Authenticated users can see approved suppliers/roasters (needed for messaging, orders, etc.)
  (status = 'approved' AND role IN ('supplier', 'roaster'))
);

-- Admins can view all records (already covered by existing admin policies)
-- Note: The has_role and is_verified_admin functions already exist for admin access