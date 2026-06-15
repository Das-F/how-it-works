import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Message {
  id: string;
  sender_id: string;
  dashboard_id: string;
  content: string;
  created_at: string;
}

export function useMessages(dashboardId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["messages", dashboardId],
    enabled: !!dashboardId,
    queryFn: async (): Promise<Message[]> => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("dashboard_id", dashboardId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!dashboardId) return;
    const channel = supabase
      .channel(`messages-${dashboardId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `dashboard_id=eq.${dashboardId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["messages", dashboardId] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, dashboardId]);

  return query;
}

export function useSendMessage(userId: string | undefined, dashboardId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (content: string) => {
      if (!userId) throw new Error("Non connecté");
      if (!dashboardId) throw new Error("Pas de dashboard actif");
      const trimmed = content.trim();
      if (!trimmed) throw new Error("Message vide");
      const { error } = await supabase
        .from("messages")
        .insert({ sender_id: userId, dashboard_id: dashboardId, content: trimmed });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", dashboardId] });
    },
  });
}

export function useDeleteMessage(dashboardId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("messages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", dashboardId] });
    },
  });
}
