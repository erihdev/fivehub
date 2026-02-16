-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_roasting_complete ON public.roasting_logs;
DROP FUNCTION IF EXISTS public.complete_roasting_log();

-- Create function to handle roasting START (deduct green coffee)
CREATE OR REPLACE FUNCTION public.start_roasting_log()
RETURNS TRIGGER AS $$
BEGIN
  -- When a new roasting log is created, deduct from green coffee immediately
  IF NEW.green_coffee_id IS NOT NULL AND NEW.total_green_kg IS NOT NULL THEN
    UPDATE public.coffee_offerings
    SET 
      sold_quantity_kg = COALESCE(sold_quantity_kg, 0) + NEW.total_green_kg,
      updated_at = now()
    WHERE id = NEW.green_coffee_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to handle roasting COMPLETION (add roasted coffee)
CREATE OR REPLACE FUNCTION public.complete_roasting_log()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when status changes to 'completed'
  IF NEW.status = 'completed' AND OLD.status = 'in_progress' THEN
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to handle roasting CANCELLATION (restore green coffee)
CREATE OR REPLACE FUNCTION public.cancel_roasting_log()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when status changes to 'cancelled'
  IF NEW.status = 'cancelled' AND OLD.status = 'in_progress' THEN
    -- Restore green coffee quantity
    IF NEW.green_coffee_id IS NOT NULL AND NEW.total_green_kg IS NOT NULL THEN
      UPDATE public.coffee_offerings
      SET 
        sold_quantity_kg = GREATEST(0, COALESCE(sold_quantity_kg, 0) - NEW.total_green_kg),
        updated_at = now()
      WHERE id = NEW.green_coffee_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for INSERT (start roasting - deduct green coffee)
CREATE TRIGGER on_roasting_start
  AFTER INSERT ON public.roasting_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.start_roasting_log();

-- Create trigger for UPDATE to completed (add roasted coffee)
CREATE TRIGGER on_roasting_complete
  BEFORE UPDATE ON public.roasting_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.complete_roasting_log();

-- Create trigger for UPDATE to cancelled (restore green coffee)
CREATE TRIGGER on_roasting_cancel
  BEFORE UPDATE ON public.roasting_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.cancel_roasting_log();