-- إضافة حقول جديدة لجدول العقود المباشرة
ALTER TABLE public.direct_supply_contracts
ADD COLUMN IF NOT EXISTS seller_response_deadline TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS seller_rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS commission_refund_status TEXT CHECK (commission_refund_status IN ('none', 'requested', 'approved', 'refunded', 'denied')),
ADD COLUMN IF NOT EXISTS commission_refund_requested_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS commission_refund_processed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS commission_refund_method TEXT,
ADD COLUMN IF NOT EXISTS commission_refund_receipt TEXT,
ADD COLUMN IF NOT EXISTS auto_cancelled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancelled_by UUID;

-- تحديث القيود للحالات الجديدة
ALTER TABLE public.direct_supply_contracts 
DROP CONSTRAINT IF EXISTS direct_supply_contracts_status_check;

ALTER TABLE public.direct_supply_contracts 
ADD CONSTRAINT direct_supply_contracts_status_check 
CHECK (status IN (
  'pending_commission',
  'commission_paid',
  'awaiting_seller_sign',
  'seller_rejected',        -- البائع رفض
  'awaiting_buyer_sign',
  'awaiting_platform_sign',
  'fully_signed',
  'awaiting_seller_payment',
  'completed',
  'cancelled',
  'expired',                -- انتهت المهلة
  'refund_pending',         -- بانتظار الاسترداد
  'refunded',               -- تم الاسترداد
  'disputed'
));

-- جدول سجل الاستردادات
CREATE TABLE IF NOT EXISTS public.commission_refunds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.direct_supply_contracts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  original_amount DECIMAL(12,2) NOT NULL,
  refund_amount DECIMAL(12,2) NOT NULL,
  refund_reason TEXT NOT NULL,
  refund_method TEXT,
  bank_details JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processing', 'completed', 'denied')),
  admin_notes TEXT,
  processed_by UUID,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.commission_refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their refunds" 
ON public.commission_refunds FOR SELECT 
USING (auth.uid() = user_id OR public.is_verified_admin(auth.uid()));

CREATE POLICY "Users can request refunds" 
ON public.commission_refunds FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update refunds" 
ON public.commission_refunds FOR UPDATE 
USING (public.is_verified_admin(auth.uid()));

CREATE TRIGGER update_commission_refunds_updated_at
BEFORE UPDATE ON public.commission_refunds
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();