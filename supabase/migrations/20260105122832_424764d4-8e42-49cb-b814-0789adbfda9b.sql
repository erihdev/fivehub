
-- Create staff permissions table
CREATE TABLE public.staff_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL UNIQUE,
  can_approve_users BOOLEAN DEFAULT false,
  can_reject_users BOOLEAN DEFAULT false,
  can_manage_orders BOOLEAN DEFAULT false,
  can_view_orders BOOLEAN DEFAULT true,
  can_manage_suppliers BOOLEAN DEFAULT false,
  can_view_suppliers BOOLEAN DEFAULT true,
  can_manage_roasters BOOLEAN DEFAULT false,
  can_view_roasters BOOLEAN DEFAULT true,
  can_manage_commissions BOOLEAN DEFAULT false,
  can_view_commissions BOOLEAN DEFAULT false,
  can_view_reports BOOLEAN DEFAULT false,
  can_manage_settings BOOLEAN DEFAULT false,
  can_send_messages BOOLEAN DEFAULT false,
  can_view_messages BOOLEAN DEFAULT false,
  can_manage_auctions BOOLEAN DEFAULT false,
  can_view_auctions BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.staff_permissions ENABLE ROW LEVEL SECURITY;

-- Only admins can view/modify permissions
CREATE POLICY "Admins can manage staff permissions"
ON public.staff_permissions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default permissions for each role
INSERT INTO public.staff_permissions (role, can_approve_users, can_reject_users, can_manage_orders, can_view_orders, can_manage_suppliers, can_view_suppliers, can_manage_roasters, can_view_roasters, can_manage_commissions, can_view_commissions, can_view_reports, can_manage_settings, can_send_messages, can_view_messages, can_manage_auctions, can_view_auctions)
VALUES 
  ('admin', true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true),
  ('supervisor', true, true, true, true, true, true, true, true, false, true, true, false, true, true, true, true),
  ('support', false, false, false, true, false, true, false, true, false, false, false, false, true, true, false, true),
  ('viewer', false, false, false, true, false, true, false, true, false, false, true, false, false, true, false, true);

-- Create function to check specific permission
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE _permission
    WHEN 'approve_users' THEN COALESCE((
      SELECT sp.can_approve_users 
      FROM staff_permissions sp 
      JOIN user_roles ur ON ur.role = sp.role 
      WHERE ur.user_id = _user_id AND ur.status = 'approved'
    ), false)
    WHEN 'reject_users' THEN COALESCE((
      SELECT sp.can_reject_users 
      FROM staff_permissions sp 
      JOIN user_roles ur ON ur.role = sp.role 
      WHERE ur.user_id = _user_id AND ur.status = 'approved'
    ), false)
    WHEN 'manage_orders' THEN COALESCE((
      SELECT sp.can_manage_orders 
      FROM staff_permissions sp 
      JOIN user_roles ur ON ur.role = sp.role 
      WHERE ur.user_id = _user_id AND ur.status = 'approved'
    ), false)
    WHEN 'view_orders' THEN COALESCE((
      SELECT sp.can_view_orders 
      FROM staff_permissions sp 
      JOIN user_roles ur ON ur.role = sp.role 
      WHERE ur.user_id = _user_id AND ur.status = 'approved'
    ), false)
    WHEN 'manage_suppliers' THEN COALESCE((
      SELECT sp.can_manage_suppliers 
      FROM staff_permissions sp 
      JOIN user_roles ur ON ur.role = sp.role 
      WHERE ur.user_id = _user_id AND ur.status = 'approved'
    ), false)
    WHEN 'view_suppliers' THEN COALESCE((
      SELECT sp.can_view_suppliers 
      FROM staff_permissions sp 
      JOIN user_roles ur ON ur.role = sp.role 
      WHERE ur.user_id = _user_id AND ur.status = 'approved'
    ), false)
    WHEN 'view_reports' THEN COALESCE((
      SELECT sp.can_view_reports 
      FROM staff_permissions sp 
      JOIN user_roles ur ON ur.role = sp.role 
      WHERE ur.user_id = _user_id AND ur.status = 'approved'
    ), false)
    WHEN 'manage_settings' THEN COALESCE((
      SELECT sp.can_manage_settings 
      FROM staff_permissions sp 
      JOIN user_roles ur ON ur.role = sp.role 
      WHERE ur.user_id = _user_id AND ur.status = 'approved'
    ), false)
    WHEN 'send_messages' THEN COALESCE((
      SELECT sp.can_send_messages 
      FROM staff_permissions sp 
      JOIN user_roles ur ON ur.role = sp.role 
      WHERE ur.user_id = _user_id AND ur.status = 'approved'
    ), false)
    WHEN 'view_messages' THEN COALESCE((
      SELECT sp.can_view_messages 
      FROM staff_permissions sp 
      JOIN user_roles ur ON ur.role = sp.role 
      WHERE ur.user_id = _user_id AND ur.status = 'approved'
    ), false)
    WHEN 'view_commissions' THEN COALESCE((
      SELECT sp.can_view_commissions 
      FROM staff_permissions sp 
      JOIN user_roles ur ON ur.role = sp.role 
      WHERE ur.user_id = _user_id AND ur.status = 'approved'
    ), false)
    WHEN 'manage_commissions' THEN COALESCE((
      SELECT sp.can_manage_commissions 
      FROM staff_permissions sp 
      JOIN user_roles ur ON ur.role = sp.role 
      WHERE ur.user_id = _user_id AND ur.status = 'approved'
    ), false)
    ELSE false
  END;
$$;

-- Function to check if user is staff (admin, supervisor, support, viewer)
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'supervisor', 'support', 'viewer')
      AND status = 'approved'
  )
$$;
