-- Add log number column with auto-increment sequence
ALTER TABLE public.roasting_logs ADD COLUMN log_number SERIAL;

-- Create index for faster lookups
CREATE INDEX idx_roasting_logs_log_number ON public.roasting_logs (log_number);