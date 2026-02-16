
-- ============================================
-- جداول المزارع: عروض المحاصيل وربط الموردين
-- ============================================

-- جدول عروض المحاصيل من المزارع
CREATE TABLE IF NOT EXISTS public.farm_crop_offers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    farm_id UUID NOT NULL,
    crop_name TEXT NOT NULL,
    crop_name_ar TEXT,
    variety TEXT,
    quantity_kg NUMERIC NOT NULL,
    price_per_kg NUMERIC,
    currency TEXT DEFAULT 'SAR',
    harvest_date DATE,
    description TEXT,
    description_ar TEXT,
    altitude TEXT,
    processing_method TEXT,
    images TEXT[],
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'sold', 'expired')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ربط المزارع بالموردين
CREATE TABLE IF NOT EXISTS public.farm_supplier_links (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    farm_id UUID NOT NULL,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(farm_id, supplier_id)
);

-- ============================================
-- جداول الصيانة: طلبات وتقارير الصيانة
-- ============================================

-- طلبات الصيانة
CREATE TABLE IF NOT EXISTS public.maintenance_requests (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    requester_id UUID NOT NULL,
    requester_type TEXT NOT NULL CHECK (requester_type IN ('roaster', 'cafe')),
    technician_id UUID,
    equipment_type TEXT NOT NULL,
    equipment_brand TEXT,
    equipment_model TEXT,
    issue_description TEXT NOT NULL,
    issue_description_ar TEXT,
    urgency TEXT DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high', 'urgent')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled')),
    scheduled_date TIMESTAMPTZ,
    completed_date TIMESTAMPTZ,
    notes TEXT,
    images TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- تقارير الصيانة
CREATE TABLE IF NOT EXISTS public.maintenance_reports (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    request_id UUID NOT NULL REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
    technician_id UUID NOT NULL,
    diagnosis TEXT NOT NULL,
    work_performed TEXT NOT NULL,
    parts_used JSONB,
    labor_hours NUMERIC,
    parts_cost NUMERIC,
    labor_cost NUMERIC,
    total_cost NUMERIC,
    currency TEXT DEFAULT 'SAR',
    recommendations TEXT,
    next_maintenance_date DATE,
    customer_signature TEXT,
    technician_signature TEXT,
    images TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- تقييمات فني الصيانة
CREATE TABLE IF NOT EXISTS public.maintenance_ratings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    request_id UUID NOT NULL REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
    technician_id UUID NOT NULL,
    rater_id UUID NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(request_id, rater_id)
);

-- ============================================
-- تحسينات المحمصة: مقارنة أسعار الموردين
-- ============================================

-- جدول تتبع أسعار الموردين للمحمصة
CREATE TABLE IF NOT EXISTS public.roaster_supplier_comparisons (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    roaster_id UUID NOT NULL,
    coffee_origin TEXT NOT NULL,
    coffee_process TEXT,
    comparison_data JSONB NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- تفعيل RLS
-- ============================================

ALTER TABLE public.farm_crop_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_supplier_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roaster_supplier_comparisons ENABLE ROW LEVEL SECURITY;

-- ============================================
-- سياسات RLS للمزارع
-- ============================================

CREATE POLICY "Farms can manage their crop offers"
ON public.farm_crop_offers FOR ALL
USING (auth.uid() = farm_id)
WITH CHECK (auth.uid() = farm_id);

CREATE POLICY "Everyone can view available crop offers"
ON public.farm_crop_offers FOR SELECT
USING (status = 'available');

CREATE POLICY "Farms can manage their supplier links"
ON public.farm_supplier_links FOR ALL
USING (auth.uid() = farm_id)
WITH CHECK (auth.uid() = farm_id);

CREATE POLICY "Suppliers can view their farm links"
ON public.farm_supplier_links FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.suppliers s WHERE s.id = supplier_id AND s.user_id = auth.uid()
));

CREATE POLICY "Suppliers can update their farm link status"
ON public.farm_supplier_links FOR UPDATE
USING (EXISTS (
    SELECT 1 FROM public.suppliers s WHERE s.id = supplier_id AND s.user_id = auth.uid()
));

-- ============================================
-- سياسات RLS للصيانة
-- ============================================

CREATE POLICY "Users can create maintenance requests"
ON public.maintenance_requests FOR INSERT
WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Requesters can view their requests"
ON public.maintenance_requests FOR SELECT
USING (auth.uid() = requester_id OR auth.uid() = technician_id);

CREATE POLICY "Technicians can view assigned requests"
ON public.maintenance_requests FOR SELECT
USING (auth.uid() = technician_id OR technician_id IS NULL);

CREATE POLICY "Technicians can update assigned requests"
ON public.maintenance_requests FOR UPDATE
USING (auth.uid() = technician_id);

CREATE POLICY "Technicians can create reports"
ON public.maintenance_reports FOR INSERT
WITH CHECK (auth.uid() = technician_id);

CREATE POLICY "Report participants can view"
ON public.maintenance_reports FOR SELECT
USING (
    auth.uid() = technician_id OR 
    EXISTS (
        SELECT 1 FROM public.maintenance_requests mr 
        WHERE mr.id = request_id AND mr.requester_id = auth.uid()
    )
);

CREATE POLICY "Users can rate completed maintenance"
ON public.maintenance_ratings FOR INSERT
WITH CHECK (auth.uid() = rater_id);

CREATE POLICY "Ratings are viewable by participants"
ON public.maintenance_ratings FOR SELECT
USING (
    auth.uid() = technician_id OR auth.uid() = rater_id
);

-- ============================================
-- سياسات RLS للمحمصة
-- ============================================

CREATE POLICY "Roasters can manage their comparisons"
ON public.roaster_supplier_comparisons FOR ALL
USING (auth.uid() = roaster_id)
WITH CHECK (auth.uid() = roaster_id);

-- ============================================
-- Triggers للتحديث التلقائي
-- ============================================

CREATE TRIGGER update_farm_crop_offers_updated_at
BEFORE UPDATE ON public.farm_crop_offers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_farm_supplier_links_updated_at
BEFORE UPDATE ON public.farm_supplier_links
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_maintenance_requests_updated_at
BEFORE UPDATE ON public.maintenance_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Realtime للإشعارات
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.maintenance_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.farm_crop_offers;
