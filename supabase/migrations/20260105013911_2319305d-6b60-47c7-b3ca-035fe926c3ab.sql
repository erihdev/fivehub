-- Drop the overly permissive anonymous policies on login_attempts
DROP POLICY IF EXISTS "Allow anonymous insert" ON public.login_attempts;
DROP POLICY IF EXISTS "Allow anonymous select" ON public.login_attempts;
DROP POLICY IF EXISTS "Allow anonymous update" ON public.login_attempts;

-- Also drop any other permissive policies that might exist
DROP POLICY IF EXISTS "Enable insert for all users" ON public.login_attempts;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.login_attempts;
DROP POLICY IF EXISTS "Enable update for all users" ON public.login_attempts;

-- The login_attempts table should ONLY be accessed through SECURITY DEFINER functions
-- No direct RLS policies should allow public access
-- The existing functions check_login_attempts and record_failed_login are SECURITY DEFINER
-- and will bypass RLS, which is the correct pattern for login tracking

-- Create restrictive policy: Only admins can directly SELECT for debugging purposes
CREATE POLICY "Only admins can view login attempts"
ON public.login_attempts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- No INSERT/UPDATE/DELETE policies for regular users
-- All access must go through the SECURITY DEFINER functions