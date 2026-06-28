
-- Backfill: ensure each existing dashboard has a calendar widget
INSERT INTO public.widgets (dashboard_id, slot, type, title)
SELECT d.id,
       COALESCE((SELECT MIN(s) FROM generate_series(1,4) s
                 WHERE NOT EXISTS (SELECT 1 FROM public.widgets w
                                   WHERE w.dashboard_id = d.id AND w.slot = s)), 1),
       'calendar',
       'Agenda'
FROM public.dashboards d
WHERE NOT EXISTS (
  SELECT 1 FROM public.widgets w
  WHERE w.dashboard_id = d.id AND w.type = 'calendar'
)
AND EXISTS (
  SELECT 1 FROM generate_series(1,4) s
  WHERE NOT EXISTS (SELECT 1 FROM public.widgets w2
                    WHERE w2.dashboard_id = d.id AND w2.slot = s)
);

-- Trigger: auto-insert calendar widget on new dashboards
CREATE OR REPLACE FUNCTION public.add_default_calendar_widget()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.widgets (dashboard_id, slot, type, title)
  VALUES (NEW.id, 1, 'calendar', 'Agenda')
  ON CONFLICT (dashboard_id, slot) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS dashboards_add_default_calendar ON public.dashboards;
CREATE TRIGGER dashboards_add_default_calendar
AFTER INSERT ON public.dashboards
FOR EACH ROW EXECUTE FUNCTION public.add_default_calendar_widget();
