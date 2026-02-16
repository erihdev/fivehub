-- Create roasting logs table
CREATE TABLE public.roasting_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roaster_id UUID NOT NULL,
  green_coffee_id UUID REFERENCES public.coffee_offerings(id),
  green_coffee_name TEXT NOT NULL,
  bags_count INTEGER NOT NULL,
  kg_per_bag INTEGER DEFAULT 60,
  total_green_kg NUMERIC NOT NULL,
  roast_level TEXT,
  roaster_person_name TEXT NOT NULL,
  roaster_signature TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  output_kg NUMERIC,
  roasted_product_id UUID REFERENCES public.roasted_coffee_products(id),
  notes TEXT,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.roasting_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Roasters can view their own logs"
ON public.roasting_logs FOR SELECT
TO authenticated
USING (roaster_id = auth.uid() OR is_verified_admin(auth.uid()));

CREATE POLICY "Roasters can insert their own logs"
ON public.roasting_logs FOR INSERT
TO authenticated
WITH CHECK (roaster_id = auth.uid());

CREATE POLICY "Roasters can update their own logs"
ON public.roasting_logs FOR UPDATE
TO authenticated
USING (roaster_id = auth.uid());

CREATE POLICY "Roasters can delete their own logs"
ON public.roasting_logs FOR DELETE
TO authenticated
USING (roaster_id = auth.uid());

-- Trigger to update updated_at
CREATE TRIGGER update_roasting_logs_updated_at
BEFORE UPDATE ON public.roasting_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle roasting completion - deduct from green, add to roasted
CREATE OR REPLACE FUNCTION public.complete_roasting_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only trigger when status changes to 'completed'
  IF NEW.status = 'completed' AND OLD.status = 'in_progress' THEN
    -- Deduct from green coffee inventory
    IF NEW.green_coffee_id IS NOT NULL THEN
      UPDATE public.coffee_offerings
      SET 
        sold_quantity_kg = COALESCE(sold_quantity_kg, 0) + NEW.total_green_kg,
        updated_at = now()
      WHERE id = NEW.green_coffee_id;
    END IF;
    
    -- Add to roasted coffee inventory if product specified
    IF NEW.roasted_product_id IS NOT NULL AND NEW.output_kg IS NOT NULL THEN
      UPDATE public.roasted_coffee_products
      SET 
        total_quantity_kg = COALESCE(total_quantity_kg, 0) + NEW.output_kg,
        updated_at = now()
      WHERE id = NEW.roasted_product_id;
    END IF;
    
    -- Set completed timestamp
    NEW.completed_at := now();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for roasting completion
CREATE TRIGGER on_roasting_complete
BEFORE UPDATE ON public.roasting_logs
FOR EACH ROW
EXECUTE FUNCTION public.complete_roasting_log();