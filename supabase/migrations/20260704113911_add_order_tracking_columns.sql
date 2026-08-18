-- Add tracking_url and courier_info to orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS tracking_url text,
ADD COLUMN IF NOT EXISTS courier_info text;
