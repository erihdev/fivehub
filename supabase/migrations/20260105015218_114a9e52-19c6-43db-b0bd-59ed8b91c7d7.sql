-- Fix SECURITY DEFINER view issue by recreating with SECURITY INVOKER
DROP VIEW IF EXISTS public.public_business_directory;

CREATE VIEW public.public_business_directory
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  company_name,
  city,
  role,
  created_at
FROM public.user_roles
WHERE status = 'approved' AND role IN ('supplier', 'roaster');

-- Re-grant SELECT permissions after recreating
GRANT SELECT ON public.public_business_directory TO anon, authenticated;