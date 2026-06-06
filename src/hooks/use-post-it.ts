import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function usePostIt() {
  return useQuery({
    queryKey: ["post-it"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("post_its")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdatePostIt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; content: string; userId: string }) => {
      const { error } = await supabase
        .from("post_its")
        .update({ content: args.content, updated_by: args.userId })
        .eq("id", args.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["post-it"] }),
  });
}
