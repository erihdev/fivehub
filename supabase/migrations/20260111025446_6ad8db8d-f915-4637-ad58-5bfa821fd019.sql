-- Add document image fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS commercial_registration_image TEXT,
ADD COLUMN IF NOT EXISTS national_address_image TEXT;