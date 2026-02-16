
-- ============================================
-- SECURITY FIXES - SHIPMENT EVENTS
-- ============================================

-- Fix shipment_events - Use shipment_tracking table
DROP POLICY IF EXISTS "System can insert events" ON public.shipment_events;

CREATE POLICY "Suppliers can create shipment events"
  ON public.shipment_events
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shipment_tracking st
      JOIN public.orders o ON o.id = st.order_id
      JOIN public.suppliers s ON s.id = o.supplier_id
      WHERE st.id = shipment_events.shipment_id
      AND s.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_shipment_events_shipment ON public.shipment_events(shipment_id);
