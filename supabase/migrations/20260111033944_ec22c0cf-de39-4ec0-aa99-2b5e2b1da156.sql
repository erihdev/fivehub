-- Add unit_type and kg_per_bag columns to supplier_offers table
ALTER TABLE public.supplier_offers 
ADD COLUMN IF NOT EXISTS unit_type TEXT DEFAULT 'kg',
ADD COLUMN IF NOT EXISTS kg_per_bag NUMERIC;