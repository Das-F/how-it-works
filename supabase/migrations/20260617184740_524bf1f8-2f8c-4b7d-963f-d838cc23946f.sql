
-- Table : admins sport
CREATE TABLE public.sport_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
GRANT SELECT ON public.sport_admins TO authenticated;
GRANT ALL ON public.sport_admins TO service_role;
ALTER TABLE public.sport_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view sport admins"
  ON public.sport_admins FOR SELECT TO authenticated USING (true);
CREATE POLICY "Global admins manage sport admins"
  ON public.sport_admins FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Fonction utilitaire
CREATE OR REPLACE FUNCTION public.is_sport_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
      OR EXISTS (SELECT 1 FROM public.sport_admins WHERE user_id = _user_id);
$$;

-- Table : périodes d'exclusion
CREATE TABLE public.sport_excluded_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  start_date date NOT NULL,
  end_date date NOT NULL,
  label text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sport_period_valid CHECK (end_date >= start_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sport_excluded_periods TO authenticated;
GRANT ALL ON public.sport_excluded_periods TO service_role;
ALTER TABLE public.sport_excluded_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view periods"
  ON public.sport_excluded_periods FOR SELECT TO authenticated USING (true);
CREATE POLICY "Sport admins manage periods"
  ON public.sport_excluded_periods FOR ALL TO authenticated
  USING (public.is_sport_admin(auth.uid()))
  WITH CHECK (public.is_sport_admin(auth.uid()));

-- Table : présences
CREATE TABLE public.sport_attendances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_date date NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('present','absent')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_date, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sport_attendances TO authenticated;
GRANT ALL ON public.sport_attendances TO service_role;
ALTER TABLE public.sport_attendances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view attendances"
  ON public.sport_attendances FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own attendance"
  ON public.sport_attendances FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own attendance"
  ON public.sport_attendances FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own attendance"
  ON public.sport_attendances FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER sport_attendances_touch
  BEFORE UPDATE ON public.sport_attendances
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Realtime
ALTER TABLE public.sport_attendances REPLICA IDENTITY FULL;
ALTER TABLE public.sport_excluded_periods REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sport_attendances;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sport_excluded_periods;
