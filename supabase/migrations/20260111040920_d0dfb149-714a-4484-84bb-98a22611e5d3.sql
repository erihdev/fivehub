-- Create function to update inventory when order is placed
CREATE OR REPLACE FUNCTION public.update_inventory_on_order()
RETURNS TRIGGER AS $$
BEGIN
  -- Update sold_quantity_kg in coffee_offerings
  UPDATE public.coffee_offerings
  SET 
    sold_quantity_kg = COALESCE(sold_quantity_kg, 0) + NEW.quantity_kg,
    updated_at = now()
  WHERE id = NEW.coffee_id;
  
  -- Check if remaining quantity is 0 or less, mark as unavailable
  UPDATE public.coffee_offerings
  SET available = false
  WHERE id = NEW.coffee_id
    AND (COALESCE(total_quantity_kg, 0) - COALESCE(sold_quantity_kg, 0)) <= 0;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to restore inventory when order is cancelled
CREATE OR REPLACE FUNCTION public.restore_inventory_on_cancel()
RETURNS TRIGGER AS $$
BEGIN
  -- Only restore if status changed to 'cancelled'
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    UPDATE public.coffee_offerings
    SET 
      sold_quantity_kg = GREATEST(0, COALESCE(sold_quantity_kg, 0) - OLD.quantity_kg),
      available = true,
      updated_at = now()
    WHERE id = OLD.coffee_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new orders
DROP TRIGGER IF EXISTS trigger_update_inventory_on_order ON public.orders;
CREATE TRIGGER trigger_update_inventory_on_order
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_inventory_on_order();

-- Create trigger for cancelled orders
DROP TRIGGER IF EXISTS trigger_restore_inventory_on_cancel ON public.orders;
CREATE TRIGGER trigger_restore_inventory_on_cancel
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.restore_inventory_on_cancel();