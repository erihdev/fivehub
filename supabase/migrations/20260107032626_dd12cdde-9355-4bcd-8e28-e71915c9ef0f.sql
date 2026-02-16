-- Create subscription_reminders table to track sent reminders
CREATE TABLE IF NOT EXISTS public.subscription_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID NOT NULL REFERENCES public.user_subscriptions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  days_before INTEGER NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  email_sent_to TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_reminders ENABLE ROW LEVEL SECURITY;

-- Policy for users to see their own reminders
CREATE POLICY "Users can view their own reminders"
  ON public.subscription_reminders
  FOR SELECT
  USING (auth.uid() = user_id);

-- Add index for efficient lookups
CREATE INDEX idx_subscription_reminders_subscription ON public.subscription_reminders(subscription_id, days_before);

-- Add payment_id column to user_subscriptions if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_subscriptions' 
    AND column_name = 'payment_id'
  ) THEN
    ALTER TABLE public.user_subscriptions ADD COLUMN payment_id TEXT;
  END IF;
END $$;