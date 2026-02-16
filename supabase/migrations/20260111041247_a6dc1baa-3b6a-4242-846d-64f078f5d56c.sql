-- Add stock tracking columns to roasted_coffee_products (Roaster inventory)
ALTER TABLE public.roasted_coffee_products
ADD COLUMN IF NOT EXISTS total_quantity_kg NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS sold_quantity_kg NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS min_alert_quantity_kg NUMERIC DEFAULT 10,
ADD COLUMN IF NOT EXISTS warning_quantity_kg NUMERIC DEFAULT 20;

-- Add stock tracking columns to cafe_inventory
ALTER TABLE public.cafe_inventory
ADD COLUMN IF NOT EXISTS total_quantity_kg NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS sold_quantity_kg NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS min_alert_quantity_kg NUMERIC DEFAULT 5,
ADD COLUMN IF NOT EXISTS warning_quantity_kg NUMERIC DEFAULT 10;

-- Function to update roaster inventory when cafe orders
CREATE OR REPLACE FUNCTION public.update_roaster_inventory_on_cafe_order()
RETURNS TRIGGER AS $$
BEGIN
  -- Update sold_quantity_kg in roasted_coffee_products
  IF NEW.product_id IS NOT NULL THEN
    UPDATE public.roasted_coffee_products
    SET 
      sold_quantity_kg = COALESCE(sold_quantity_kg, 0) + NEW.quantity_kg,
      updated_at = now()
    WHERE id = NEW.product_id;
    
    -- Mark as unavailable if stock depleted
    UPDATE public.roasted_coffee_products
    SET available = false
    WHERE id = NEW.product_id
      AND (COALESCE(total_quantity_kg, 0) - COALESCE(sold_quantity_kg, 0)) <= 0;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to restore roaster inventory on cafe order cancel
CREATE OR REPLACE FUNCTION public.restore_roaster_inventory_on_cancel()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    -- Restore each item's quantity
    UPDATE public.roasted_coffee_products rcp
    SET 
      sold_quantity_kg = GREATEST(0, COALESCE(sold_quantity_kg, 0) - coi.quantity_kg),
      available = true,
      updated_at = now()
    FROM public.cafe_order_items coi
    WHERE coi.order_id = NEW.id AND coi.product_id = rcp.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to update cafe inventory when product is used/sold
CREATE OR REPLACE FUNCTION public.update_cafe_inventory_on_sale()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.cafe_inventory
  SET 
    sold_quantity_kg = COALESCE(sold_quantity_kg, 0) + NEW.quantity_kg,
    quantity_kg = GREATEST(0, COALESCE(quantity_kg, 0) - NEW.quantity_kg),
    updated_at = now()
  WHERE id = NEW.inventory_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for cafe order items (when cafe buys from roaster)
DROP TRIGGER IF EXISTS trigger_update_roaster_inventory ON public.cafe_order_items;
CREATE TRIGGER trigger_update_roaster_inventory
  AFTER INSERT ON public.cafe_order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_roaster_inventory_on_cafe_order();

-- Trigger for cafe order cancellation
DROP TRIGGER IF EXISTS trigger_restore_roaster_inventory ON public.cafe_orders;
CREATE TRIGGER trigger_restore_roaster_inventory
  AFTER UPDATE ON public.cafe_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.restore_roaster_inventory_on_cancel();

-- Also update cafe_inventory when cafe receives order (restocking)
CREATE OR REPLACE FUNCTION public.restock_cafe_inventory_on_delivery()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    -- Add delivered items to cafe inventory
    INSERT INTO public.cafe_inventory (cafe_id, product_id, product_name, quantity_kg, total_quantity_kg, last_restocked_at)
    SELECT 
      NEW.cafe_id,
      coi.product_id,
      COALESCE(rcp.name, 'Coffee'),
      coi.quantity_kg,
      coi.quantity_kg,
      now()
    FROM public.cafe_order_items coi
    LEFT JOIN public.roasted_coffee_products rcp ON rcp.id = coi.product_id
    WHERE coi.order_id = NEW.id
    ON CONFLICT (cafe_id, product_id) DO UPDATE SET
      quantity_kg = cafe_inventory.quantity_kg + EXCLUDED.quantity_kg,
      total_quantity_kg = cafe_inventory.total_quantity_kg + EXCLUDED.quantity_kg,
      last_restocked_at = now(),
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_restock_cafe_inventory ON public.cafe_orders;
CREATE TRIGGER trigger_restock_cafe_inventory
  AFTER UPDATE ON public.cafe_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.restock_cafe_inventory_on_delivery();