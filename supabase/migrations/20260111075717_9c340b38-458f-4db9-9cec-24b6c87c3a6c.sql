
-- ========================================
-- Feature 8: Supplier Bidding System (نظام مزايدة الموردين)
-- ========================================

-- Cafe supply requests - where cafes post their needs
CREATE TABLE public.cafe_supply_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cafe_id UUID NOT NULL,
  title TEXT NOT NULL,
  title_ar TEXT,
  description TEXT,
  coffee_type TEXT NOT NULL, -- green, roasted, any
  origin_preference TEXT, -- optional origin preference
  quantity_kg NUMERIC NOT NULL,
  max_price_per_kg NUMERIC,
  currency TEXT DEFAULT 'SAR',
  delivery_location TEXT,
  deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'awarded', 'cancelled')),
  awarded_bid_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Supplier/Roaster bids on requests
CREATE TABLE public.supply_request_bids (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.cafe_supply_requests(id) ON DELETE CASCADE,
  bidder_id UUID NOT NULL,
  bidder_type TEXT NOT NULL CHECK (bidder_type IN ('supplier', 'roaster')),
  price_per_kg NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  currency TEXT DEFAULT 'SAR',
  delivery_days INTEGER NOT NULL,
  coffee_name TEXT,
  coffee_origin TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key for awarded bid
ALTER TABLE public.cafe_supply_requests 
ADD CONSTRAINT cafe_supply_requests_awarded_bid_fkey 
FOREIGN KEY (awarded_bid_id) REFERENCES public.supply_request_bids(id);

-- ========================================
-- Feature 11: Equipment Maintenance Scheduling
-- ========================================

-- Cafe equipment registry
CREATE TABLE public.cafe_equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cafe_id UUID NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT,
  equipment_type TEXT NOT NULL, -- espresso_machine, grinder, water_filter, refrigerator, etc.
  brand TEXT,
  model TEXT,
  serial_number TEXT,
  purchase_date DATE,
  warranty_until DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'needs_maintenance', 'under_repair', 'inactive')),
  notes TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Scheduled maintenance tasks (recurring)
CREATE TABLE public.equipment_maintenance_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL REFERENCES public.cafe_equipment(id) ON DELETE CASCADE,
  task_name TEXT NOT NULL,
  task_name_ar TEXT,
  description TEXT,
  frequency_days INTEGER NOT NULL, -- every X days
  last_completed_at TIMESTAMP WITH TIME ZONE,
  next_due_at TIMESTAMP WITH TIME ZONE NOT NULL,
  reminder_days_before INTEGER DEFAULT 3,
  is_critical BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Maintenance task completion log
CREATE TABLE public.equipment_maintenance_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID REFERENCES public.equipment_maintenance_schedules(id) ON DELETE SET NULL,
  equipment_id UUID NOT NULL REFERENCES public.cafe_equipment(id) ON DELETE CASCADE,
  performed_by TEXT, -- name of person who did it
  performed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  cost NUMERIC,
  currency TEXT DEFAULT 'SAR',
  next_scheduled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Maintenance service requests (to maintenance providers)
CREATE TABLE public.equipment_service_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL REFERENCES public.cafe_equipment(id) ON DELETE CASCADE,
  cafe_id UUID NOT NULL,
  maintenance_provider_id UUID, -- if assigned to a maintenance role user
  issue_title TEXT NOT NULL,
  issue_description TEXT,
  urgency TEXT DEFAULT 'medium' CHECK (urgency IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled')),
  estimated_cost NUMERIC,
  final_cost NUMERIC,
  currency TEXT DEFAULT 'SAR',
  scheduled_visit_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  technician_notes TEXT,
  cafe_rating INTEGER CHECK (cafe_rating >= 1 AND cafe_rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ========================================
-- Enable RLS on all tables
-- ========================================

ALTER TABLE public.cafe_supply_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supply_request_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_maintenance_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_service_requests ENABLE ROW LEVEL SECURITY;

-- ========================================
-- RLS Policies for Supply Requests
-- ========================================

-- Anyone can view open supply requests
CREATE POLICY "Anyone can view open supply requests"
ON public.cafe_supply_requests FOR SELECT
USING (status = 'open' OR cafe_id = auth.uid());

-- Cafes can create their own requests
CREATE POLICY "Cafes can create supply requests"
ON public.cafe_supply_requests FOR INSERT
WITH CHECK (cafe_id = auth.uid());

-- Cafes can update their own requests
CREATE POLICY "Cafes can update own supply requests"
ON public.cafe_supply_requests FOR UPDATE
USING (cafe_id = auth.uid());

-- Cafes can delete their own requests
CREATE POLICY "Cafes can delete own supply requests"
ON public.cafe_supply_requests FOR DELETE
USING (cafe_id = auth.uid());

-- ========================================
-- RLS Policies for Supply Bids
-- ========================================

-- Request owner and bidder can view bids
CREATE POLICY "View supply bids"
ON public.supply_request_bids FOR SELECT
USING (
  bidder_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.cafe_supply_requests 
    WHERE id = request_id AND cafe_id = auth.uid()
  )
);

-- Suppliers/Roasters can create bids
CREATE POLICY "Create supply bids"
ON public.supply_request_bids FOR INSERT
WITH CHECK (bidder_id = auth.uid());

-- Bidders can update their own bids
CREATE POLICY "Update own supply bids"
ON public.supply_request_bids FOR UPDATE
USING (bidder_id = auth.uid());

-- ========================================
-- RLS Policies for Equipment
-- ========================================

-- Cafes can view their own equipment
CREATE POLICY "View own equipment"
ON public.cafe_equipment FOR SELECT
USING (cafe_id = auth.uid());

-- Cafes can manage their own equipment
CREATE POLICY "Manage own equipment"
ON public.cafe_equipment FOR ALL
USING (cafe_id = auth.uid());

-- ========================================
-- RLS Policies for Maintenance Schedules
-- ========================================

-- View schedules for own equipment
CREATE POLICY "View own maintenance schedules"
ON public.equipment_maintenance_schedules FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.cafe_equipment 
    WHERE id = equipment_id AND cafe_id = auth.uid()
  )
);

-- Manage schedules for own equipment
CREATE POLICY "Manage own maintenance schedules"
ON public.equipment_maintenance_schedules FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.cafe_equipment 
    WHERE id = equipment_id AND cafe_id = auth.uid()
  )
);

-- ========================================
-- RLS Policies for Maintenance Logs
-- ========================================

-- View logs for own equipment
CREATE POLICY "View own maintenance logs"
ON public.equipment_maintenance_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.cafe_equipment 
    WHERE id = equipment_id AND cafe_id = auth.uid()
  )
);

-- Manage logs for own equipment
CREATE POLICY "Manage own maintenance logs"
ON public.equipment_maintenance_logs FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.cafe_equipment 
    WHERE id = equipment_id AND cafe_id = auth.uid()
  )
);

-- ========================================
-- RLS Policies for Service Requests
-- ========================================

-- Cafes and assigned maintenance providers can view
CREATE POLICY "View service requests"
ON public.equipment_service_requests FOR SELECT
USING (
  cafe_id = auth.uid() 
  OR maintenance_provider_id = auth.uid()
  OR maintenance_provider_id IS NULL
);

-- Cafes can create service requests
CREATE POLICY "Create service requests"
ON public.equipment_service_requests FOR INSERT
WITH CHECK (cafe_id = auth.uid());

-- Cafes and providers can update service requests
CREATE POLICY "Update service requests"
ON public.equipment_service_requests FOR UPDATE
USING (cafe_id = auth.uid() OR maintenance_provider_id = auth.uid());

-- ========================================
-- Triggers for updated_at
-- ========================================

CREATE TRIGGER update_cafe_supply_requests_updated_at
BEFORE UPDATE ON public.cafe_supply_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_supply_request_bids_updated_at
BEFORE UPDATE ON public.supply_request_bids
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cafe_equipment_updated_at
BEFORE UPDATE ON public.cafe_equipment
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_equipment_maintenance_schedules_updated_at
BEFORE UPDATE ON public.equipment_maintenance_schedules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_equipment_service_requests_updated_at
BEFORE UPDATE ON public.equipment_service_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================
-- Enable Realtime
-- ========================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.cafe_supply_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.supply_request_bids;
ALTER PUBLICATION supabase_realtime ADD TABLE public.equipment_service_requests;
