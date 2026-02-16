-- Create the trigger for escrow creation on order payment
CREATE TRIGGER create_order_escrow_trigger
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.create_order_escrow();

-- Create trigger for releasing escrow on delivery
CREATE TRIGGER release_order_escrow_trigger
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.release_order_escrow();

-- Create trigger for commission calculation
CREATE TRIGGER calculate_order_commission_trigger
    AFTER UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.calculate_order_commission();