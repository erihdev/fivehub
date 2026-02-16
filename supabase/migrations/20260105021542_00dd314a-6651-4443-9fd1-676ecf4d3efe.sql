-- ============================================
-- FIX 1: Remove all anonymous policies from login_attempts
-- Keep only the admin view policy and use SECURITY DEFINER functions for anonymous operations
-- ============================================

-- Drop the anonymous policies that expose sensitive data
DROP POLICY IF EXISTS "Allow anonymous read for login checks" ON public.login_attempts;
DROP POLICY IF EXISTS "Allow anonymous insert for login tracking" ON public.login_attempts;
DROP POLICY IF EXISTS "Allow anonymous update for login tracking" ON public.login_attempts;

-- The existing SECURITY DEFINER functions (check_login_attempt, record_failed_login, clear_login_attempts)
-- already handle all the necessary operations without exposing the table directly

-- ============================================
-- FIX 2: Secure the public_business_directory view
-- Replace the view with a SECURITY DEFINER function that limits exposure
-- ============================================

-- Drop the existing view
DROP VIEW IF EXISTS public.public_business_directory;

-- Create a secure function that returns limited business directory data
-- This function can be called by anyone but only returns non-sensitive fields
CREATE OR REPLACE FUNCTION public.get_business_directory()
RETURNS TABLE (
  id uuid,
  company_name text,
  city text,
  role app_role
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    company_name,
    city,
    role
  FROM public.user_roles
  WHERE status = 'approved'
    AND company_name IS NOT NULL
    AND role IN ('supplier', 'roaster');
$$;