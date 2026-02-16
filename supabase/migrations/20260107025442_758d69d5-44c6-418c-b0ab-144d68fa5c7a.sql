-- جدول عقود التوريد المباشرة
CREATE TABLE public.direct_supply_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_number TEXT UNIQUE,
  
  -- الأطراف
  buyer_id UUID NOT NULL,
  buyer_role TEXT NOT NULL CHECK (buyer_role IN ('cafe', 'roaster')),
  seller_id UUID NOT NULL,
  seller_role TEXT NOT NULL CHECK (seller_role IN ('roaster', 'supplier')),
  
  -- تفاصيل الطلب
  order_type TEXT NOT NULL CHECK (order_type IN ('cafe_to_roaster', 'roaster_to_supplier')),
  items JSONB NOT NULL DEFAULT '[]',
  total_amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'SAR',
  
  -- عمولة المنصة
  platform_commission_rate DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  platform_commission_amount DECIMAL(12,2) NOT NULL,
  commission_payment_method TEXT CHECK (commission_payment_method IN ('bank_transfer', 'online_payment')),
  commission_paid BOOLEAN DEFAULT false,
  commission_paid_at TIMESTAMP WITH TIME ZONE,
  commission_transfer_receipt TEXT,
  commission_confirmed_at TIMESTAMP WITH TIME ZONE,
  
  -- دفع البائع
  seller_payment_confirmed BOOLEAN DEFAULT false,
  seller_payment_confirmed_at TIMESTAMP WITH TIME ZONE,
  seller_transfer_receipt TEXT,
  
  -- التوقيعات (الترتيب: البائع أولاً ثم المشتري ثم المنصة)
  seller_signature TEXT,
  seller_signed_at TIMESTAMP WITH TIME ZONE,
  buyer_signature TEXT,
  buyer_signed_at TIMESTAMP WITH TIME ZONE,
  platform_signature TEXT,
  platform_signed_at TIMESTAMP WITH TIME ZONE,
  platform_signed_by UUID,
  
  -- حالة العقد
  status TEXT NOT NULL DEFAULT 'pending_commission' CHECK (status IN (
    'pending_commission',      -- بانتظار دفع العمولة
    'commission_paid',         -- تم دفع العمولة، بانتظار تأكيد المنصة
    'awaiting_seller_sign',    -- بانتظار توقيع البائع
    'awaiting_buyer_sign',     -- بانتظار توقيع المشتري
    'awaiting_platform_sign',  -- بانتظار توقيع المنصة
    'fully_signed',            -- تم توقيع الجميع، بانتظار دفع البائع
    'awaiting_seller_payment', -- بانتظار تحويل المبلغ للبائع
    'completed',               -- اكتمل العقد
    'cancelled',               -- ملغي
    'disputed'                 -- نزاع
  )),
  
  -- ملاحظات
  notes TEXT,
  cancellation_reason TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE public.direct_supply_contracts ENABLE ROW LEVEL SECURITY;

-- سياسات الوصول
CREATE POLICY "Buyers can view their contracts" 
ON public.direct_supply_contracts FOR SELECT 
USING (auth.uid() = buyer_id);

CREATE POLICY "Sellers can view their contracts" 
ON public.direct_supply_contracts FOR SELECT 
USING (auth.uid() = seller_id);

CREATE POLICY "Admins can view all contracts" 
ON public.direct_supply_contracts FOR SELECT 
USING (public.is_verified_admin(auth.uid()));

CREATE POLICY "Buyers can create contracts" 
ON public.direct_supply_contracts FOR INSERT 
WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Parties can update their contracts" 
ON public.direct_supply_contracts FOR UPDATE 
USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR public.is_verified_admin(auth.uid()));

-- فهارس للأداء
CREATE INDEX idx_direct_contracts_buyer ON public.direct_supply_contracts(buyer_id);
CREATE INDEX idx_direct_contracts_seller ON public.direct_supply_contracts(seller_id);
CREATE INDEX idx_direct_contracts_status ON public.direct_supply_contracts(status);

-- تحديث تلقائي للوقت
CREATE TRIGGER update_direct_contracts_updated_at
BEFORE UPDATE ON public.direct_supply_contracts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- دالة توليد رقم العقد
CREATE OR REPLACE FUNCTION public.generate_direct_contract_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.contract_number := 'DSC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || SUBSTRING(NEW.id::text, 1, 8);
  RETURN NEW;
END;
$$;

CREATE TRIGGER generate_direct_contract_number_trigger
BEFORE INSERT ON public.direct_supply_contracts
FOR EACH ROW EXECUTE FUNCTION public.generate_direct_contract_number();

-- جدول سجل نسخ العقود لكل طرف
CREATE TABLE public.contract_copies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.direct_supply_contracts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_role TEXT NOT NULL CHECK (user_role IN ('buyer', 'seller', 'platform')),
  pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.contract_copies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their contract copies" 
ON public.contract_copies FOR SELECT 
USING (auth.uid() = user_id OR public.is_verified_admin(auth.uid()));

CREATE POLICY "System can insert contract copies" 
ON public.contract_copies FOR INSERT 
WITH CHECK (true);

-- تفعيل Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_supply_contracts;