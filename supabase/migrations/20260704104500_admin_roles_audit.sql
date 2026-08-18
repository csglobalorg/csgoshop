-- Migration: admin_roles_audit
-- Creates tables for staff roles and audit logging

-- 1. Create staff_roles table
CREATE TABLE IF NOT EXISTS public.staff_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL, -- e.g., 'super_admin', 'order_manager', 'product_manager'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- RLS for staff_roles
ALTER TABLE public.staff_roles ENABLE ROW LEVEL SECURITY;

-- Only super_admins can manage staff roles
CREATE POLICY "Super admins can manage staff roles" ON public.staff_roles
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.staff_roles sr 
            WHERE sr.user_id = auth.uid() AND sr.role = 'super_admin'
        )
    );

-- Users can read their own role
CREATE POLICY "Users can read their own role" ON public.staff_roles
    FOR SELECT
    USING (user_id = auth.uid());

-- 2. Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(255),
    before_state JSONB,
    after_state JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins can read audit logs
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.staff_roles sr 
            WHERE sr.user_id = auth.uid() AND sr.role IN ('super_admin', 'admin')
        )
    );
