import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAddWidget(dashboardId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { slot: number; type: string; title?: string }) => {
      if (!dashboardId) throw new Error("Pas de dashboard");
      const { error } = await supabase.from("widgets").insert({
        dashboard_id: dashboardId,
        slot: args.slot,
        type: args.type,
        title: args.title?.trim() || null,
        is_active: true,
        config: {},
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["widgets", dashboardId] }),
  });
}

export function useDeleteWidget(dashboardId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (widgetId: string) => {
      const { error } = await supabase.from("widgets").delete().eq("id", widgetId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["widgets", dashboardId] }),
  });
}
