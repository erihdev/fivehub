
-- Add escrow_id to orders table to link orders with escrow transactions
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS escrow_id UUID REFERENCES public.escrow_transactions(id);

-- Add payment_status to orders for better tracking
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'released', 'refunded'));

-- Update order status to include escrow flow
-- pending → confirmed (by supplier) → awaiting_payment → paid → shipped → delivered → completed

-- Create function to create escrow when order is paid
CREATE OR REPLACE FUNCTION public.create_order_escrow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
        
        -- Create escrow transaction
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
            'held',
            now()
        )
        RETURNING id INTO NEW.escrow_id;
        
        -- Update order status to show payment received
        NEW.status := 'paid';
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for escrow creation
DROP TRIGGER IF EXISTS create_escrow_on_payment ON public.orders;
CREATE TRIGGER create_escrow_on_payment
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.create_order_escrow();

-- Create function to release escrow when order is delivered
CREATE OR REPLACE FUNCTION public.release_order_escrow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- When order status changes to delivered, release escrow
    IF NEW.status = 'delivered' AND OLD.status != 'delivered' AND NEW.escrow_id IS NOT NULL THEN
        UPDATE public.escrow_transactions
        SET status = 'released',
            released_at = now()
        WHERE id = NEW.escrow_id;
        
        -- Update payment status
        NEW.payment_status := 'released';
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for escrow release
DROP TRIGGER IF EXISTS release_escrow_on_delivery ON public.orders;
CREATE TRIGGER release_escrow_on_delivery
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.release_order_escrow();

-- Enable RLS on escrow_transactions if not already
ALTER TABLE public.escrow_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their escrow transactions" ON public.escrow_transactions;

-- Create policy for viewing escrow transactions
CREATE POLICY "Users can view their escrow transactions"
ON public.escrow_transactions
FOR SELECT
USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
