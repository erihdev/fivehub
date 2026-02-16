-- Create a function to get all users with their auth email for admin use
CREATE OR REPLACE FUNCTION public.get_all_users_for_admin()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  role text,
  status text,
  company_name text,
  company_email text,
  company_phone text,
  city text,
  created_at timestamptz,
  auth_email text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    ur.id,
    ur.user_id,
    ur.role::text,
    ur.status::text,
    ur.company_name,
    ur.company_email,
    ur.company_phone,
    ur.city,
    ur.created_at,
    au.email as auth_email
  FROM public.user_roles ur
  LEFT JOIN auth.users au ON au.id = ur.user_id
  ORDER BY ur.created_at DESC;
$$;