-- Update the create_order_escrow function to use correct status values
CREATE OR REPLACE FUNCTION public.create_order_escrow()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_commission_rate DECIMAL(5,2);
    v_platform_commission DECIMAL(12,2);
    v_seller_amount DECIMAL(12,2);
    v_supplier_user_id UUID;
BEGIN
    -- Only trigger when payment_status changes to 'paid'
    IF NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid') THEN
        -- Get commission rate from settings
        SELECT supplier_rate INTO v_commission_rate FROM public.commission_settings LIMIT 1;
        IF v_commission_rate IS NULL THEN
            v_commission_rate := 5.0; -- Default 5%
        END IF;
        
        -- Calculate amounts
        v_platform_commission := COALESCE(NEW.total_price, NEW.quantity_kg * COALESCE(NEW.price_per_kg, 0)) * (v_commission_rate / 100);
        v_seller_amount := COALESCE(NEW.total_price, NEW.quantity_kg * COALESCE(NEW.price_per_kg, 0)) - v_platform_commission;
        
        -- Get supplier user_id
        SELECT user_id INTO v_supplier_user_id FROM public.suppliers WHERE id = NEW.supplier_id;
        
        -- Create escrow transaction with correct status value 'buyer_paid'
        INSERT INTO public.escrow_transactions (
            buyer_id,
            seller_id,
            total_amount,
            platform_commission,
            seller_amount,
            currency,
            status,
            buyer_paid_at
        ) VALUES (
            NEW.user_id,
            v_supplier_user_id,
            COALESCE(NEW.total_price, NEW.quantity_kg * COALESCE(NEW.price_per_kg, 0)),
            v_platform_commission,
            v_seller_amount,
            COALESCE(NEW.currency, 'SAR'),
            'buyer_paid',  -- Changed from 'held' to valid status
            now()
        )
        RETURNING id INTO NEW.escrow_id;
        
        -- Update order status to show payment received
        NEW.status := 'paid';
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Update the release_order_escrow function to use correct status value
CREATE OR REPLACE FUNCTION public.release_order_escrow()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- When order status changes to delivered, release escrow
    IF NEW.status = 'delivered' AND OLD.status != 'delivered' AND NEW.escrow_id IS NOT NULL THEN
        UPDATE public.escrow_transactions
        SET status = 'released_to_seller',  -- Changed from 'released' to valid status
            released_at = now()
        WHERE id = NEW.escrow_id;
        
        -- Update payment status
        NEW.payment_status := 'released';
    END IF;
    
    RETURN NEW;
END;
$function$;