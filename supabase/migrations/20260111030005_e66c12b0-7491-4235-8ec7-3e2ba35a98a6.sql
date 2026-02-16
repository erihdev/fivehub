-- Add logo_url column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS logo_url TEXT;