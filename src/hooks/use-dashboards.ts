import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Dashboard {
  id: string;
  name: string;
  owner_id: string;
  is_personal: boolean;
  created_at: string;
}

export function useDashboards(userId: string | undefined) {
  return useQuery({
    queryKey: ["dashboards", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Dashboard[]> => {
      const { data, error } = await supabase
        .from("dashboards")
        .select("id, name, owner_id, is_personal, created_at")
        .order("is_personal", { ascending: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateDashboard(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      if (!userId) throw new Error("Non connecté");
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Nom requis");
      const { data, error } = await supabase
        .from("dashboards")
        .insert({ name: trimmed, owner_id: userId, is_personal: false })
        .select("id, name, owner_id, is_personal, created_at")
        .single();
      if (error) throw error;
      // Owner auto-membership
      await supabase
        .from("dashboard_members")
        .insert({ dashboard_id: data.id, user_id: userId });
      return data as Dashboard;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboards"] });
    },
  });
}

export interface DashboardMember {
  user_id: string;
  joined_at: string;
  nom: string;
  qualificatif: string;
}

export function useDashboardMembers(dashboardId: string | undefined) {
  return useQuery({
    queryKey: ["dashboard-members", dashboardId],
    enabled: !!dashboardId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dashboard_members")
        .select("user_id, joined_at")
        .eq("dashboard_id", dashboardId!);
      if (error) throw error;
      if (!data?.length) return [] as DashboardMember[];

      const ids = data.map((m) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, nom, qualificatif")
        .in("id", ids);
      const byId = new Map(profiles?.map((p) => [p.id, p]) ?? []);
      return data.map((m) => {
        const p = byId.get(m.user_id);
        return {
          user_id: m.user_id,
          joined_at: m.joined_at,
          nom: p?.nom ?? "",
          qualificatif: p?.qualificatif ?? "",
        };
      });
    },
  });
}

export function useDashboardInvitations(dashboardId: string | undefined) {
  return useQuery({
    queryKey: ["dashboard-invitations", dashboardId],
    enabled: !!dashboardId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dashboard_invitations")
        .select("id, email, created_at, accepted_at")
        .eq("dashboard_id", dashboardId!)
        .is("accepted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useInviteToDashboard(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { dashboardId: string; email: string }) => {
      if (!userId) throw new Error("Non connecté");
      const email = args.email.trim().toLowerCase();
      if (!email || !email.includes("@")) throw new Error("Email invalide");

      // Try to find an existing profile/user via profiles join (admin path).
      // For simplicity, we attempt the invitation first; the trigger will pick it up at signup.
      const { error } = await supabase
        .from("dashboard_invitations")
        .insert({ dashboard_id: args.dashboardId, email, invited_by: userId });
      if (error) {
        if (error.code === "23505") {
          throw new Error("Cet email est déjà invité sur ce dashboard");
        }
        throw error;
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["dashboard-invitations", vars.dashboardId] });
    },
  });
}

export function useRemoveMember(dashboardId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (memberUserId: string) => {
      if (!dashboardId) throw new Error("Pas de dashboard");
      const { error } = await supabase
        .from("dashboard_members")
        .delete()
        .eq("dashboard_id", dashboardId)
        .eq("user_id", memberUserId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard-members", dashboardId] });
    },
  });
}
