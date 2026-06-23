import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAddSportAdmin, useRemoveSportAdmin, useSportAdmins } from "@/hooks/use-sport";

function useAllProfiles() {
  return useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nom, qualificatif");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function SportAdminsPanel({ userId }: { userId: string }) {
  const { data: admins = [] } = useSportAdmins();
  const { data: profiles = [] } = useAllProfiles();
  const add = useAddSportAdmin(userId);
  const remove = useRemoveSportAdmin();

  const adminProfiles = profiles.filter((p) => admins.includes(p.id));
  const others = profiles.filter((p) => !admins.includes(p.id));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, overflowY: "auto", maxHeight: 320 }}>
      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
        Les admins sport peuvent ajouter ou retirer des périodes sans sport.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {adminProfiles.length === 0 && (
          <div style={{ fontSize: 12, color: "var(--text-dim)", padding: 8 }}>Aucun admin sport pour l'instant.</div>
        )}
        {adminProfiles.map((p) => (
          <div key={p.id} style={row}>
            <div style={{ fontSize: 13 }}>{p.nom || p.qualificatif || "Membre"}</div>

            <button onClick={() => remove.mutate(p.id)} style={removeBtn}>Retirer</button>
          </div>
        ))}
      </div>

      <div style={{ borderTop: "1px solid var(--violet-border)", paddingTop: 10 }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>Ajouter un admin :</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {others.map((p) => (
            <div key={p.id} style={row}>
              <div style={{ fontSize: 13 }}>{p.nom || p.qualificatif || "Membre"}</div>
              <button onClick={() => add.mutate(p.id)} style={addBtn}>Promouvoir</button>
            </div>
          ))}
          {others.length === 0 && (
            <div style={{ fontSize: 12, color: "var(--text-dim)" }}>Tous les membres sont déjà admins sport.</div>
          )}
        </div>
      </div>
    </div>
  );
}

const row: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg)", border: "1px solid var(--violet-border)", borderRadius: 8, padding: "8px 12px" };
const removeBtn: React.CSSProperties = { background: "transparent", border: "1px solid var(--danger)", color: "var(--danger)", borderRadius: 6, padding: "4px 10px", fontSize: 11 };
const addBtn: React.CSSProperties = { background: "var(--orange-soft)", border: "1px solid var(--orange)", color: "var(--orange)", borderRadius: 6, padding: "4px 10px", fontSize: 11 };
