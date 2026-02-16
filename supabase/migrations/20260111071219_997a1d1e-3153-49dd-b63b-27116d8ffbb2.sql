-- Update the complete_roasting_log function to auto-create roasted product
CREATE OR REPLACE FUNCTION public.complete_roasting_log()
RETURNS TRIGGER AS $$
DECLARE
  v_product_id UUID;
  v_green_coffee RECORD;
  v_roaster_id UUID;
BEGIN
  -- Only trigger when status changes to 'completed'
  IF NEW.status = 'completed' AND OLD.status = 'in_progress' THEN
    
    -- Get roaster_id from the log
    v_roaster_id := NEW.roaster_id;
    
    -- If no roasted product specified, create one automatically
    IF NEW.roasted_product_id IS NULL AND NEW.output_kg IS NOT NULL THEN
      -- Get green coffee info
      SELECT name, origin, region, process INTO v_green_coffee
      FROM public.coffee_offerings
      WHERE id = NEW.green_coffee_id;
      
      -- Create new roasted coffee product
      INSERT INTO public.roasted_coffee_products (
        roaster_id,
        name,
        roast_level,
        price_per_kg,
        total_quantity_kg,
        sold_quantity_kg,
        available,
        description
      ) VALUES (
        v_roaster_id,
        COALESCE(v_green_coffee.name, NEW.green_coffee_name) || ' - محمص',
        COALESCE(NEW.roast_level, 'medium'),
        0,
        NEW.output_kg,
        0,
        true,
        'منتج من سجل التحميص - أصل: ' || COALESCE(v_green_coffee.origin, 'غير محدد')
      )
      RETURNING id INTO v_product_id;
      
      -- Set the product id in the log
      NEW.roasted_product_id := v_product_id;
      
    -- If roasted product specified, add to its quantity
    ELSIF NEW.roasted_product_id IS NOT NULL AND NEW.output_kg IS NOT NULL THEN
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