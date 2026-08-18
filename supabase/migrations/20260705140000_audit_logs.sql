/* Migration: Add audit_logs table */

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL,
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security for audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow only staff with admin roles to view logs
CREATE POLICY "audit_logs_read"
    ON public.audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.staff_roles sr
            WHERE sr.user_id = auth.uid() AND sr.role = ANY(ARRAY['super_admin', 'admin'])
        )
    );

-- Allow only the service role to insert logs (so it's done via edge functions securely)
-- If we want admins to insert directly, we could add a policy, but service_role bypasses RLS anyway.
-- So we don't strictly need an INSERT policy for service_role.

GRANT SELECT ON public.audit_logs TO authenticated;
