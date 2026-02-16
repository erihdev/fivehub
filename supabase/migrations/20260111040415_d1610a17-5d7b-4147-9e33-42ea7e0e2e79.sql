-- Add stock tracking fields to coffee_offerings
ALTER TABLE public.coffee_offerings 
ADD COLUMN IF NOT EXISTS total_quantity_kg NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS sold_quantity_kg NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS min_alert_quantity_kg NUMERIC DEFAULT 10,
ADD COLUMN IF NOT EXISTS warning_quantity_kg NUMERIC DEFAULT 20;

-- Create a function to calculate remaining quantity
CREATE OR REPLACE FUNCTION public.get_remaining_quantity(total NUMERIC, sold NUMERIC)
RETURNS NUMERIC AS $$
BEGIN
  RETURN COALESCE(total, 0) - COALESCE(sold, 0);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create a function to get stock status
CREATE OR REPLACE FUNCTION public.get_stock_status(total NUMERIC, sold NUMERIC, min_alert NUMERIC, warning_qty NUMERIC)
RETURNS TEXT AS $$
DECLARE
  remaining NUMERIC;
BEGIN
  remaining := COALESCE(total, 0) - COALESCE(sold, 0);
  IF remaining <= COALESCE(min_alert, 10) THEN
    RETURN 'critical';
  ELSIF remaining <= COALESCE(warning_qty, 20) THEN
    RETURN 'warning';
  ELSE
    RETURN 'healthy';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;