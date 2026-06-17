import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ---------- Sessions (deterministic, client-side) ----------

export interface SportSession {
  date: string; // YYYY-MM-DD
  weekday: "Lundi" | "Jeudi";
}

const pad = (n: number) => String(n).padStart(2, "0");
const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function getUpcomingSportSessions(
  periods: { start_date: string; end_date: string }[],
  limit = 30,
  from: Date = new Date(),
): SportSession[] {
  const out: SportSession[] = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  let safety = 0;
  while (out.length < limit && safety < 800) {
    safety++;
    const day = cursor.getDay(); // 1 = Mon, 4 = Thu
    if (day === 1 || day === 4) {
      const ds = fmt(cursor);
      const excluded = periods.some((p) => ds >= p.start_date && ds <= p.end_date);
      if (!excluded) {
        out.push({ date: ds, weekday: day === 1 ? "Lundi" : "Jeudi" });
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

// ---------- Excluded periods ----------

export interface ExcludedPeriod {
  id: string;
  start_date: string;
  end_date: string;
  label: string | null;
  created_at: string;
}

export function useExcludedPeriods() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["sport-periods"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sport_excluded_periods")
        .select("id, start_date, end_date, label, created_at")
        .order("start_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ExcludedPeriod[];
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel("sport-periods")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sport_excluded_periods" },
        () => qc.invalidateQueries({ queryKey: ["sport-periods"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  return query;
}

export function useAddExcludedPeriod(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { start_date: string; end_date: string; label?: string }) => {
      if (!userId) throw new Error("Non connecté");
      const { error } = await supabase.from("sport_excluded_periods").insert({
        start_date: args.start_date,
        end_date: args.end_date,
        label: args.label?.trim() || null,
        created_by: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sport-periods"] }),
  });
}

export function useDeleteExcludedPeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sport_excluded_periods").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sport-periods"] }),
  });
}

// ---------- Attendances ----------

export interface Attendance {
  session_date: string;
  user_id: string;
  status: "present" | "absent";
}

export function useAttendances(dates: string[]) {
  const qc = useQueryClient();
  const key = dates.join(",");
  const query = useQuery({
    queryKey: ["sport-attendances", key],
    enabled: dates.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sport_attendances")
        .select("session_date, user_id, status")
        .in("session_date", dates);
      if (error) throw error;
      return (data ?? []) as Attendance[];
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel("sport-attendances")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sport_attendances" },
        () => qc.invalidateQueries({ queryKey: ["sport-attendances"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  return query;
}

export function useSetAttendance(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { session_date: string; status: "present" | "absent" | null }) => {
      if (!userId) throw new Error("Non connecté");
      if (args.status === null) {
        const { error } = await supabase
          .from("sport_attendances")
          .delete()
          .eq("user_id", userId)
          .eq("session_date", args.session_date);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("sport_attendances")
          .upsert(
            { user_id: userId, session_date: args.session_date, status: args.status },
            { onConflict: "session_date,user_id" },
          );
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sport-attendances"] }),
  });
}

// ---------- Sport admins ----------

export function useSportAdmins() {
  return useQuery({
    queryKey: ["sport-admins"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sport_admins").select("user_id");
      if (error) throw error;
      return (data ?? []).map((r) => r.user_id);
    },
  });
}

export function useIsSportAdmin(userId: string | undefined, isGlobalAdmin: boolean) {
  const { data: admins = [] } = useSportAdmins();
  return isGlobalAdmin || (!!userId && admins.includes(userId));
}

export function useAddSportAdmin(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (targetUserId: string) => {
      const { error } = await supabase
        .from("sport_admins")
        .insert({ user_id: targetUserId, created_by: userId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sport-admins"] }),
  });
}

export function useRemoveSportAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (targetUserId: string) => {
      const { error } = await supabase.from("sport_admins").delete().eq("user_id", targetUserId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sport-admins"] }),
  });
}
