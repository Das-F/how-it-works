ALTER TABLE public.dashboard_members ADD COLUMN IF NOT EXISTS alias text;

DROP POLICY IF EXISTS "Owners update member alias" ON public.dashboard_members;
CREATE POLICY "Owners update member alias"
ON public.dashboard_members
FOR UPDATE
TO authenticated
USING (public.is_dashboard_owner(dashboard_id, auth.uid()))
WITH CHECK (public.is_dashboard_owner(dashboard_id, auth.uid()));