-- Add latest_tick_number column to wallets table
-- This stores the tick number directly in the wallet record for efficient queries
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS latest_tick_number INTEGER DEFAULT 0;

-- Create index for faster sorting by tick number
CREATE INDEX IF NOT EXISTS idx_wallets_latest_tick_number ON public.wallets(latest_tick_number DESC);

-- Backfill existing wallets with their latest tick numbers from qx_events
UPDATE public.wallets w
SET latest_tick_number = COALESCE(
  (SELECT MAX(e.tick_number) 
   FROM public.qx_events e 
   WHERE e.source_id = w.address),
  0
);
