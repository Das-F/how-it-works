-- Swap the meaning of nom and qualificatif: qualificatif becomes the display name (prénom),
-- nom becomes the qualificatif. Physically swap existing values so nothing changes visually.
UPDATE public.profiles
SET nom = qualificatif, qualificatif = nom;

-- Allow the inviter to pre-fill the invitee's names before they sign up.
ALTER TABLE public.dashboard_invitations
  ADD COLUMN IF NOT EXISTS prefill_nom text,
  ADD COLUMN IF NOT EXISTS prefill_qualificatif text;

-- Consume the prefills when the invited user signs up for the first time.
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_dashboard_id uuid;
  v_prefill_nom text;
  v_prefill_qualificatif text;
BEGIN
  -- Take the most recent non-null prefill values from pending invitations for this email
  SELECT
    (ARRAY_AGG(di.prefill_nom ORDER BY di.created_at DESC) FILTER (WHERE di.prefill_nom IS NOT NULL))[1],
    (ARRAY_AGG(di.prefill_qualificatif ORDER BY di.created_at DESC) FILTER (WHERE di.prefill_qualificatif IS NOT NULL))[1]
  INTO v_prefill_nom, v_prefill_qualificatif
  FROM public.dashboard_invitations di
  WHERE lower(di.email) = lower(NEW.email) AND di.accepted_at IS NULL;

  INSERT INTO public.profiles (id, nom, qualificatif)
  VALUES (NEW.id, COALESCE(v_prefill_nom, ''), COALESCE(v_prefill_qualificatif, ''))
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
$function$;