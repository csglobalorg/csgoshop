/* Migration: Add app_settings and feature_flags tables */

-- Create app_settings table
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security for app_settings
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Allow any authenticated user to read settings
CREATE POLICY "app_settings_read"
    ON public.app_settings
    FOR SELECT
    USING (auth.role() <> 'anonymous');

-- Allow staff with admin roles to modify settings
CREATE POLICY "app_settings_write"
    ON public.app_settings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.staff_roles sr
            WHERE sr.user_id = auth.uid() AND sr.role = ANY(ARRAY['super_admin', 'admin'])
        )
    );

-- Create feature_flags table
CREATE TABLE IF NOT EXISTS public.feature_flags (
    flag TEXT PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT false,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security for feature_flags
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Allow any authenticated user to read flags
CREATE POLICY "feature_flags_read"
    ON public.feature_flags
    FOR SELECT
    USING (auth.role() <> 'anonymous');

-- Allow admin staff to modify flags
CREATE POLICY "feature_flags_write"
    ON public.feature_flags
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.staff_roles sr
            WHERE sr.user_id = auth.uid() AND sr.role = ANY(ARRAY['super_admin', 'admin'])
        )
    );

-- Grant usage to anon and authenticated roles (already default)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feature_flags TO anon, authenticated;
