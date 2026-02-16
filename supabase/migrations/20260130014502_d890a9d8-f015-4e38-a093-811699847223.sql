-- Update the function to check if caller is admin
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only allow verified admins to call this function
  IF NOT public.is_verified_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  RETURN QUERY
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
END;
$$;