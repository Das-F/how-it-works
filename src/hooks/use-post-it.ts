import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function usePostIt(dashboardId: string | undefined) {
  return useQuery({
    queryKey: ["post-it", dashboardId],
    enabled: !!dashboardId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("post_its")
        .select("*")
        .eq("dashboard_id", dashboardId!)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertPostIt(dashboardId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id?: string; content: string; userId: string }) => {
      if (!dashboardId) throw new Error("Pas de dashboard");
      if (args.id) {
        const { error } = await supabase
          .from("post_its")
          .update({ content: args.content, updated_by: args.userId })
          .eq("id", args.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("post_its")
          .insert({
            dashboard_id: dashboardId,
            content: args.content,
            updated_by: args.userId,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["post-it", dashboardId] }),
  });
}
