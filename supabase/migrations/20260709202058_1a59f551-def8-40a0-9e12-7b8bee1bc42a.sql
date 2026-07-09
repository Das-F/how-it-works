
CREATE TABLE public.notepad_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_id uuid NOT NULL REFERENCES public.widgets(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notepad_notes_widget_id_idx ON public.notepad_notes(widget_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notepad_notes TO authenticated;
GRANT ALL ON public.notepad_notes TO service_role;

ALTER TABLE public.notepad_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view notes"
ON public.notepad_notes FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.widgets w
    WHERE w.id = notepad_notes.widget_id
      AND public.is_dashboard_member(w.dashboard_id, auth.uid())
  )
);

CREATE POLICY "Members can insert notes"
ON public.notepad_notes FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.widgets w
    WHERE w.id = notepad_notes.widget_id
      AND public.is_dashboard_member(w.dashboard_id, auth.uid())
  )
);

CREATE POLICY "Members can update notes"
ON public.notepad_notes FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.widgets w
    WHERE w.id = notepad_notes.widget_id
      AND public.is_dashboard_member(w.dashboard_id, auth.uid())
  )
);

CREATE POLICY "Members can delete notes"
ON public.notepad_notes FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.widgets w
    WHERE w.id = notepad_notes.widget_id
      AND public.is_dashboard_member(w.dashboard_id, auth.uid())
  )
);

CREATE TRIGGER notepad_notes_updated_at
BEFORE UPDATE ON public.notepad_notes
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
