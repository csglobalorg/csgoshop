-- Phase 4: Customer CRM
-- Add is_banned column to users table if it doesn't exist
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT FALSE;
