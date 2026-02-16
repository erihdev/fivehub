
-- Add important new columns to roasting_logs table
ALTER TABLE public.roasting_logs 
ADD COLUMN IF NOT EXISTS roast_temperature_celsius INTEGER,
ADD COLUMN IF NOT EXISTS roast_duration_minutes INTEGER,
ADD COLUMN IF NOT EXISTS loss_percentage DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS batch_number TEXT,
ADD COLUMN IF NOT EXISTS quality_notes TEXT,
ADD COLUMN IF NOT EXISTS review_status TEXT DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS reviewed_by TEXT,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS first_crack_time INTEGER,
ADD COLUMN IF NOT EXISTS machine_number TEXT;

-- Create function to auto-calculate loss percentage
CREATE OR REPLACE FUNCTION public.calculate_roasting_loss()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.output_kg IS NOT NULL AND NEW.total_green_kg > 0 THEN
    NEW.loss_percentage := ROUND(((NEW.total_green_kg - NEW.output_kg) / NEW.total_green_kg * 100)::NUMERIC, 2);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for auto-calculating loss percentage
DROP TRIGGER IF EXISTS calculate_roasting_loss_trigger ON public.roasting_logs;
CREATE TRIGGER calculate_roasting_loss_trigger
BEFORE INSERT OR UPDATE ON public.roasting_logs
FOR EACH ROW
EXECUTE FUNCTION public.calculate_roasting_loss();

-- Add index for batch_number for quick search
CREATE INDEX IF NOT EXISTS idx_roasting_logs_batch_number ON public.roasting_logs(batch_number);

-- Add index for review_status
CREATE INDEX IF NOT EXISTS idx_roasting_logs_review_status ON public.roasting_logs(review_status);
