import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useWidgets(dashboardId: string | undefined) {
  return useQuery({
    queryKey: ["widgets", dashboardId],
    enabled: !!dashboardId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("widgets")
        .select("*")
        .eq("dashboard_id", dashboardId!)
        .eq("is_active", true)
        .order("slot", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}
