import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface NotepadNote {
  id: string;
  widget_id: string;
  content: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useNotepadNotes(widgetId: string | undefined) {
  return useQuery({
    queryKey: ["notepad-notes", widgetId],
    enabled: !!widgetId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notepad_notes")
        .select("*")
        .eq("widget_id", widgetId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as NotepadNote[];
    },
  });
}

export function useAddNote(widgetId: string | undefined, userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (content: string) => {
      if (!widgetId) throw new Error("Widget introuvable");
      const { error } = await supabase
        .from("notepad_notes")
        .insert({ widget_id: widgetId, content, created_by: userId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notepad-notes", widgetId] }),
  });
}

export function useUpdateNote(widgetId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; content: string }) => {
      const { error } = await supabase
        .from("notepad_notes")
        .update({ content: args.content })
        .eq("id", args.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notepad-notes", widgetId] }),
  });
}

export function useDeleteNote(widgetId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notepad_notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notepad-notes", widgetId] }),
  });
}

export function useUpdateWidgetTitle(dashboardId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; title: string }) => {
      const { error } = await supabase
        .from("widgets")
        .update({ title: args.title })
        .eq("id", args.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["widgets", dashboardId] }),
  });
}
