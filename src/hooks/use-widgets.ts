import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useWidgets() {
  return useQuery({
    queryKey: ["widgets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("widgets")
        .select("*")
        .eq("is_active", true)
        .order("slot", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}
