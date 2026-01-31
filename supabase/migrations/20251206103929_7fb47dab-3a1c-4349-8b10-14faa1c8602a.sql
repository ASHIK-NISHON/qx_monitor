-- Enable RLS on tables
ALTER TABLE public.qx_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- Create public read/write policies for admin dashboard (no auth required)
CREATE POLICY "Allow public read access to qx_events" ON public.qx_events
FOR SELECT USING (true);

CREATE POLICY "Allow public insert to qx_events" ON public.qx_events
FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access to wallets" ON public.wallets
FOR SELECT USING (true);

CREATE POLICY "Allow public insert to wallets" ON public.wallets
FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update to wallets" ON public.wallets
FOR UPDATE USING (true);