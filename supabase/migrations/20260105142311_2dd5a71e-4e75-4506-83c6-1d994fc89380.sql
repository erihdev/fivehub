-- Drop all existing policies on user_roles to start fresh
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can update their own pending role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view non-competing businesses" ON public.user_roles;
DROP POLICY IF EXISTS "Verified admins can update role status" ON public.user_roles;
DROP POLICY IF EXISTS "Verified admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "admin_can_delete_roles" ON public.user_roles;
DROP POLICY IF EXISTS "admin_can_insert_roles" ON public.user_roles;
DROP POLICY IF EXISTS "admin_can_update_roles" ON public.user_roles;
DROP POLICY IF EXISTS "admin_can_view_all_roles" ON public.user_roles;
DROP POLICY IF EXISTS "user_can_view_own_role" ON public.user_roles;

-- Create clean, non-recursive policies

-- 1. Users can view their own role (simple, no recursion)
CREATE POLICY "users_view_own_role" ON public.user_roles
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- 2. Users can insert their own role
CREATE POLICY "users_insert_own_role" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- 3. Users can update their own pending role
CREATE POLICY "users_update_own_pending_role" ON public.user_roles
FOR UPDATE TO authenticated
USING (user_id = auth.uid() AND status = 'pending')
WITH CHECK (user_id = auth.uid());

-- 4. Admins can view all roles (uses SECURITY DEFINER function)
CREATE POLICY "admins_view_all_roles" ON public.user_roles
FOR SELECT TO authenticated
USING (is_verified_admin(auth.uid()));

-- 5. Admins can update any role except their own
CREATE POLICY "admins_update_roles" ON public.user_roles
FOR UPDATE TO authenticated
USING (is_verified_admin(auth.uid()) AND user_id != auth.uid());

-- 6. Admins can delete roles
CREATE POLICY "admins_delete_roles" ON public.user_roles
FOR DELETE TO authenticated
USING (is_verified_admin(auth.uid()));