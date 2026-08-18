-- Security definer functions to bypass RLS and avoid infinite recursion
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.staff_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.staff_roles
    WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix staff_roles policy
DROP POLICY IF EXISTS "Super admins can manage staff roles" ON public.staff_roles;
CREATE POLICY "Super admins can manage staff roles" ON public.staff_roles
    FOR ALL
    USING (public.is_super_admin());

-- Fix audit_logs policy
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
    FOR SELECT
    USING (public.is_admin());
