-- Add rated column to orders table to track if order has been rated
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS rated boolean DEFAULT false;