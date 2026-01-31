-- Create table for QX events from EasyConnect webhook
CREATE TABLE public.qx_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  procedure_type_value INTEGER NOT NULL,
  procedure_type_name TEXT NOT NULL,
  source_id TEXT NOT NULL,
  dest_id TEXT NOT NULL,
  amount TEXT NOT NULL,
  tick_number INTEGER NOT NULL,
  tx_id TEXT UNIQUE NOT NULL,
  input_type INTEGER,
  input_hex TEXT,
  signature_hex TEXT,
  timestamp BIGINT NOT NULL,
  money_flew BOOLEAN DEFAULT false,
  issuer_address TEXT,
  asset_name TEXT,
  price BIGINT,
  number_of_shares BIGINT,
  raw_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create table for tracking unique wallets
CREATE TABLE public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address TEXT UNIQUE NOT NULL,
  first_seen_at TIMESTAMPTZ DEFAULT now(),
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  transaction_count INTEGER DEFAULT 1
);

-- Create indexes for faster queries
CREATE INDEX idx_qx_events_source_id ON public.qx_events(source_id);
CREATE INDEX idx_qx_events_tick_number ON public.qx_events(tick_number DESC);
CREATE INDEX idx_qx_events_created_at ON public.qx_events(created_at DESC);
CREATE INDEX idx_qx_events_asset_name ON public.qx_events(asset_name);
CREATE INDEX idx_wallets_address ON public.wallets(address);

-- Enable realtime for events table
ALTER TABLE public.qx_events REPLICA IDENTITY FULL;

-- No RLS needed since this is a public admin dashboard