-- Add 'maintenance' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'maintenance';

-- Add maintenance_type column to user_roles table for maintenance providers
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS maintenance_type text[] DEFAULT NULL;