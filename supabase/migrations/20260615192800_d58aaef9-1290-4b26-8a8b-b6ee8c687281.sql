
-- =========================
-- 1) DASHBOARDS TABLES
-- =========================

CREATE TABLE public.dashboards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_personal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX dashboards_one_personal_per_owner
  ON public.dashboards(owner_id) WHERE is_personal;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dashboards TO authenticated;
GRANT ALL ON public.dashboards TO service_role;

CREATE TABLE public.dashboard_members (
  dashboard_id uuid NOT NULL REFERENCES public.dashboards(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (dashboard_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.dashboard_members TO authenticated;
GRANT ALL ON public.dashboard_members TO service_role;

CREATE TABLE public.dashboard_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id uuid NOT NULL REFERENCES public.dashboards(id) ON DELETE CASCADE,
  email text NOT NULL,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  UNIQUE (dashboard_id, email)
);
CREATE INDEX dashboard_invitations_email_idx ON public.dashboard_invitations(lower(email)) WHERE accepted_at IS NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dashboard_invitations TO authenticated;
GRANT ALL ON public.dashboard_invitations TO service_role;

-- =========================
-- 2) SECURITY DEFINER HELPERS
-- =========================

CREATE OR REPLACE FUNCTION public.is_dashboard_member(_dashboard_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.dashboard_members
    WHERE dashboard_id = _dashboard_id AND user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_dashboard_owner(_dashboard_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.dashboards
    WHERE id = _dashboard_id AND owner_id = _user_id
  );
$$;

-- =========================
-- 3) BACKFILL DATA
-- =========================

-- Create personal dashboard for every existing user
INSERT INTO public.dashboards (name, owner_id, is_personal)
SELECT 'Mon espace perso', id, true FROM auth.users
ON CONFLICT DO NOTHING;

-- Membership: owner is member of their personal dashboard
INSERT INTO public.dashboard_members (dashboard_id, user_id)
SELECT d.id, d.owner_id FROM public.dashboards d
ON CONFLICT DO NOTHING;

-- Create the shared "Principal" dashboard for the admin to hold legacy data
DO $$
DECLARE
  admin_uid uuid;
  principal_id uuid;
BEGIN
  SELECT user_id INTO admin_uid FROM public.user_roles WHERE role = 'admin' LIMIT 1;
  IF admin_uid IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.dashboards (name, owner_id, is_personal)
  VALUES ('Principal', admin_uid, false)
  RETURNING id INTO principal_id;

  -- Admin is member
  INSERT INTO public.dashboard_members (dashboard_id, user_id)
  VALUES (principal_id, admin_uid)
  ON CONFLICT DO NOTHING;

  -- All other existing users become members of Principal (legacy shared dashboard)
  INSERT INTO public.dashboard_members (dashboard_id, user_id)
  SELECT principal_id, id FROM auth.users WHERE id <> admin_uid
  ON CONFLICT DO NOTHING;

  -- Store principal id in a temp setting for later use
  PERFORM set_config('app.principal_dashboard_id', principal_id::text, true);
END $$;

-- =========================
-- 4) ADD dashboard_id TO EXISTING TABLES
-- =========================

ALTER TABLE public.post_its      ADD COLUMN dashboard_id uuid REFERENCES public.dashboards(id) ON DELETE CASCADE;
ALTER TABLE public.widgets       ADD COLUMN dashboard_id uuid REFERENCES public.dashboards(id) ON DELETE CASCADE;
ALTER TABLE public.gallery_items ADD COLUMN dashboard_id uuid REFERENCES public.dashboards(id) ON DELETE CASCADE;
ALTER TABLE public.messages      ADD COLUMN dashboard_id uuid REFERENCES public.dashboards(id) ON DELETE CASCADE;

-- Backfill: all legacy rows belong to the Principal dashboard
DO $$
DECLARE
  principal_id uuid;
BEGIN
  SELECT id INTO principal_id FROM public.dashboards WHERE name='Principal' AND is_personal=false ORDER BY created_at DESC LIMIT 1;
  IF principal_id IS NULL THEN RETURN; END IF;
  UPDATE public.post_its      SET dashboard_id = principal_id WHERE dashboard_id IS NULL;
  UPDATE public.widgets       SET dashboard_id = principal_id WHERE dashboard_id IS NULL;
  UPDATE public.gallery_items SET dashboard_id = principal_id WHERE dashboard_id IS NULL;
  UPDATE public.messages      SET dashboard_id = principal_id WHERE dashboard_id IS NULL;
END $$;

ALTER TABLE public.post_its      ALTER COLUMN dashboard_id SET NOT NULL;
ALTER TABLE public.widgets       ALTER COLUMN dashboard_id SET NOT NULL;
ALTER TABLE public.gallery_items ALTER COLUMN dashboard_id SET NOT NULL;
ALTER TABLE public.messages      ALTER COLUMN dashboard_id SET NOT NULL;

CREATE INDEX post_its_dashboard_idx      ON public.post_its(dashboard_id);
CREATE INDEX widgets_dashboard_idx       ON public.widgets(dashboard_id);
CREATE INDEX gallery_items_dashboard_idx ON public.gallery_items(dashboard_id);
CREATE INDEX messages_dashboard_idx      ON public.messages(dashboard_id);

-- widgets unique (dashboard_id, slot) instead of global slot
ALTER TABLE public.widgets ADD CONSTRAINT widgets_dashboard_slot_unique UNIQUE (dashboard_id, slot);

-- =========================
-- 5) RLS — dashboards & members & invitations
-- =========================

ALTER TABLE public.dashboards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view their dashboards"
  ON public.dashboards FOR SELECT TO authenticated
  USING (public.is_dashboard_member(id, auth.uid()) OR owner_id = auth.uid());
CREATE POLICY "Admins create dashboards"
  ON public.dashboards FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND owner_id = auth.uid());
CREATE POLICY "Owners update their dashboards"
  ON public.dashboards FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owners delete their dashboards (non personal)"
  ON public.dashboards FOR DELETE TO authenticated
  USING (owner_id = auth.uid() AND is_personal = false);

ALTER TABLE public.dashboard_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can see membership of their dashboards"
  ON public.dashboard_members FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_dashboard_owner(dashboard_id, auth.uid())
    OR public.is_dashboard_member(dashboard_id, auth.uid())
  );
CREATE POLICY "Owners add members"
  ON public.dashboard_members FOR INSERT TO authenticated
  WITH CHECK (public.is_dashboard_owner(dashboard_id, auth.uid()));
CREATE POLICY "Owners remove members or self leaves"
  ON public.dashboard_members FOR DELETE TO authenticated
  USING (public.is_dashboard_owner(dashboard_id, auth.uid()) OR user_id = auth.uid());

ALTER TABLE public.dashboard_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners see invitations"
  ON public.dashboard_invitations FOR SELECT TO authenticated
  USING (public.is_dashboard_owner(dashboard_id, auth.uid()));
CREATE POLICY "Owners create invitations"
  ON public.dashboard_invitations FOR INSERT TO authenticated
  WITH CHECK (public.is_dashboard_owner(dashboard_id, auth.uid()) AND invited_by = auth.uid());
CREATE POLICY "Owners delete invitations"
  ON public.dashboard_invitations FOR DELETE TO authenticated
  USING (public.is_dashboard_owner(dashboard_id, auth.uid()));

-- =========================
-- 6) RLS — rewrite content tables
-- =========================

-- post_its
DROP POLICY IF EXISTS "Authenticated users can read post-its" ON public.post_its;
DROP POLICY IF EXISTS "Only admins can write post-its" ON public.post_its;
CREATE POLICY "Members read post-its"
  ON public.post_its FOR SELECT TO authenticated
  USING (public.is_dashboard_member(dashboard_id, auth.uid()));
CREATE POLICY "Owners write post-its"
  ON public.post_its FOR ALL TO authenticated
  USING (public.is_dashboard_owner(dashboard_id, auth.uid()))
  WITH CHECK (public.is_dashboard_owner(dashboard_id, auth.uid()));

-- widgets
DROP POLICY IF EXISTS "Authenticated users can read widgets" ON public.widgets;
DROP POLICY IF EXISTS "Only admins can manage widgets" ON public.widgets;
CREATE POLICY "Members read widgets"
  ON public.widgets FOR SELECT TO authenticated
  USING (public.is_dashboard_member(dashboard_id, auth.uid()));
CREATE POLICY "Owners write widgets"
  ON public.widgets FOR ALL TO authenticated
  USING (public.is_dashboard_owner(dashboard_id, auth.uid()))
  WITH CHECK (public.is_dashboard_owner(dashboard_id, auth.uid()));

-- gallery_items
DROP POLICY IF EXISTS "Users see their own gallery items" ON public.gallery_items;
DROP POLICY IF EXISTS "Users insert their own gallery items" ON public.gallery_items;
DROP POLICY IF EXISTS "Users update their own gallery items" ON public.gallery_items;
DROP POLICY IF EXISTS "Users delete their own gallery items" ON public.gallery_items;
CREATE POLICY "Members see own gallery items"
  ON public.gallery_items FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND public.is_dashboard_member(dashboard_id, auth.uid()));
CREATE POLICY "Members insert their own gallery items"
  ON public.gallery_items FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_dashboard_member(dashboard_id, auth.uid()));
CREATE POLICY "Members update their own gallery items"
  ON public.gallery_items FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND public.is_dashboard_member(dashboard_id, auth.uid()))
  WITH CHECK (user_id = auth.uid() AND public.is_dashboard_member(dashboard_id, auth.uid()));
CREATE POLICY "Members delete their own gallery items"
  ON public.gallery_items FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND public.is_dashboard_member(dashboard_id, auth.uid()));

-- messages
DROP POLICY IF EXISTS "Authenticated users can read all messages" ON public.messages;
DROP POLICY IF EXISTS "Authenticated users can insert their own messages" ON public.messages;
DROP POLICY IF EXISTS "Admins can delete any message" ON public.messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;
CREATE POLICY "Members read messages"
  ON public.messages FOR SELECT TO authenticated
  USING (public.is_dashboard_member(dashboard_id, auth.uid()));
CREATE POLICY "Members send messages"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.is_dashboard_member(dashboard_id, auth.uid()));
CREATE POLICY "Author or admin delete messages"
  ON public.messages FOR DELETE TO authenticated
  USING (sender_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- =========================
-- 7) SIGNUP TRIGGER: personal dashboard + consume invitations
-- =========================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_dashboard_id uuid;
BEGIN
  INSERT INTO public.profiles (id, nom, qualificatif)
  VALUES (NEW.id, '', '')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Personal dashboard
  INSERT INTO public.dashboards (name, owner_id, is_personal)
  VALUES ('Mon espace perso', NEW.id, true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO new_dashboard_id;

  IF new_dashboard_id IS NOT NULL THEN
    INSERT INTO public.dashboard_members (dashboard_id, user_id)
    VALUES (new_dashboard_id, NEW.id)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Consume pending invitations for this email
  INSERT INTO public.dashboard_members (dashboard_id, user_id)
  SELECT di.dashboard_id, NEW.id
  FROM public.dashboard_invitations di
  WHERE lower(di.email) = lower(NEW.email) AND di.accepted_at IS NULL
  ON CONFLICT DO NOTHING;

  UPDATE public.dashboard_invitations
  SET accepted_at = now()
  WHERE lower(email) = lower(NEW.email) AND accepted_at IS NULL;

  RETURN NEW;
END;
$$;

-- Ensure trigger exists (may already be set, recreate to be safe)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================
-- 8) Realtime for new content tables (messages already in publication)
-- =========================
DO $$
BEGIN
  -- Ensure messages still published (no-op if already)
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
