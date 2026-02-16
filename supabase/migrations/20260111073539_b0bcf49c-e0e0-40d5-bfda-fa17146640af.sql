-- Add batch_quality_rating to roasting_logs for quality control
ALTER TABLE public.roasting_logs 
ADD COLUMN IF NOT EXISTS batch_quality_rating INTEGER CHECK (batch_quality_rating >= 1 AND batch_quality_rating <= 5),
ADD COLUMN IF NOT EXISTS customer_complaints_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS cupping_session_id UUID REFERENCES public.cupping_sessions(id);

-- Create roasting schedule table for calendar
CREATE TABLE IF NOT EXISTS public.roasting_schedule (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  roaster_id UUID NOT NULL,
  green_coffee_id UUID REFERENCES public.coffee_offerings(id),
  green_coffee_name TEXT NOT NULL,
  planned_quantity_kg DECIMAL(10,2) NOT NULL,
  planned_date DATE NOT NULL,
  planned_time TIME,
  roast_level TEXT,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  linked_order_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.roasting_schedule ENABLE ROW LEVEL SECURITY;

-- RLS policies for roasting_schedule
CREATE POLICY "Roasters can view own schedule" 
ON public.roasting_schedule FOR SELECT 
USING (roaster_id = auth.uid());

CREATE POLICY "Roasters can insert own schedule" 
ON public.roasting_schedule FOR INSERT 
WITH CHECK (roaster_id = auth.uid());

CREATE POLICY "Roasters can update own schedule" 
ON public.roasting_schedule FOR UPDATE 
USING (roaster_id = auth.uid());

CREATE POLICY "Roasters can delete own schedule" 
ON public.roasting_schedule FOR DELETE 
USING (roaster_id = auth.uid());

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_roasting_schedule_roaster_date ON public.roasting_schedule(roaster_id, planned_date);
CREATE INDEX IF NOT EXISTS idx_roasting_logs_quality ON public.roasting_logs(roaster_id, batch_quality_rating);