-- Fix the calculate_order_commission function to handle null values properly
CREATE OR REPLACE FUNCTION public.calculate_order_commission()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_supplier_rate DECIMAL(5,2);
    v_roaster_rate DECIMAL(5,2);
    v_order_total DECIMAL(12,2);
    v_supplier_commission DECIMAL(12,2);
    v_roaster_commission DECIMAL(12,2);
BEGIN
    -- Only calculate when status changes to 'delivered'
    IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
        -- Get commission rates with defaults
        SELECT COALESCE(supplier_rate, 5.0), COALESCE(roaster_rate, 3.0) 
        INTO v_supplier_rate, v_roaster_rate
        FROM public.commission_settings
        LIMIT 1;
        
        -- Default rates if no settings exist
        IF v_supplier_rate IS NULL THEN
            v_supplier_rate := 5.0;
        END IF;
        IF v_roaster_rate IS NULL THEN
            v_roaster_rate := 3.0;
        END IF;
        
        -- Calculate order total
        v_order_total := COALESCE(NEW.total_price, NEW.quantity_kg * COALESCE(NEW.price_per_kg, 0), 0);
        
        -- Calculate commissions (ensure not null)
        v_supplier_commission := COALESCE(v_order_total * (v_supplier_rate / 100), 0);
        v_roaster_commission := COALESCE(v_order_total * (v_roaster_rate / 100), 0);
        
        -- Insert commission record
        INSERT INTO public.commissions (
            order_id, supplier_id, roaster_id, order_total,
            supplier_commission, roaster_commission, total_commission,
            supplier_rate, roaster_rate, status
        ) VALUES (
            NEW.id, NEW.supplier_id, NEW.user_id, COALESCE(v_order_total, 0),
            v_supplier_commission, v_roaster_commission,
            v_supplier_commission + v_roaster_commission,
            v_supplier_rate, v_roaster_rate, 'pending'
        )
        ON CONFLICT (order_id) DO UPDATE SET
            order_total = EXCLUDED.order_total,
            supplier_commission = EXCLUDED.supplier_commission,
            roaster_commission = EXCLUDED.roaster_commission,
            total_commission = EXCLUDED.total_commission,
            updated_at = now();
    END IF;
    
    RETURN NEW;
END;
$function$;