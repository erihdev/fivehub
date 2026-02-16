-- Add commercial and banking fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS commercial_registration TEXT,
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
ADD COLUMN IF NOT EXISTS iban TEXT;