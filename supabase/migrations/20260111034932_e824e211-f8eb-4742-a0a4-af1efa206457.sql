-- Add unit_type and kg_per_bag columns to coffee_offerings table
ALTER TABLE public.coffee_offerings
ADD COLUMN IF NOT EXISTS unit_type TEXT DEFAULT 'kg',
ADD COLUMN IF NOT EXISTS kg_per_bag NUMERIC;