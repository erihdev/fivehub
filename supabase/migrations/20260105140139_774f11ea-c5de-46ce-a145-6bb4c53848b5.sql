-- First, drop all existing policies on user_roles to fix infinite recursion
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Staff can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "admin_select_all_roles" ON public.user_roles;
DROP POLICY IF EXISTS "admin_manage_roles" ON public.user_roles;
DROP POLICY IF EXISTS "users_view_own_role" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_admin_select" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_admin_all" ON public.user_roles;

-- Now create simple, non-recursive policies using the security definer function
-- Policy 1: Users can view their own role (simple, no recursion)
CREATE POLICY "user_can_view_own_role" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- Policy 2: Admins can view all roles (using security definer function)
CREATE POLICY "admin_can_view_all_roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (public.is_verified_admin(auth.uid()));

-- Policy 3: Admins can insert roles
CREATE POLICY "admin_can_insert_roles" 
ON public.user_roles 
FOR INSERT 
TO authenticated
WITH CHECK (public.is_verified_admin(auth.uid()));

-- Policy 4: Admins can update roles
CREATE POLICY "admin_can_update_roles" 
ON public.user_roles 
FOR UPDATE 
TO authenticated
USING (public.is_verified_admin(auth.uid()));

-- Policy 5: Admins can delete roles
CREATE POLICY "admin_can_delete_roles" 
ON public.user_roles 
FOR DELETE 
TO authenticated
USING (public.is_verified_admin(auth.uid()));