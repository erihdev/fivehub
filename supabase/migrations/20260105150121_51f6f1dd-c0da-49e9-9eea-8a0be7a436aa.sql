-- Add new columns to harvest_contracts for creator role and roaster response
ALTER TABLE public.harvest_contracts 
ADD COLUMN IF NOT EXISTS creator_role text DEFAULT 'supplier',
ADD COLUMN IF NOT EXISTS creator_id uuid,
ADD COLUMN IF NOT EXISTS roaster_response text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS roaster_response_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS roaster_notes text;

-- Update existing records to set creator_id from supplier_id
UPDATE public.harvest_contracts 
SET creator_id = supplier_id 
WHERE creator_id IS NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_harvest_contracts_creator_id ON public.harvest_contracts(creator_id);
CREATE INDEX IF NOT EXISTS idx_harvest_contracts_roaster_response ON public.harvest_contracts(roaster_response);