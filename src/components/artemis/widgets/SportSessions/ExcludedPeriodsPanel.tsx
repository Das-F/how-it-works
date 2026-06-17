import { useState, type FormEvent } from "react";
import { useAddExcludedPeriod, useDeleteExcludedPeriod, useExcludedPeriods } from "@/hooks/use-sport";

interface Props {
  userId: string;
  canEdit: boolean;
}

export function ExcludedPeriodsPanel({ userId, canEdit }: Props) {
  const { data: periods = [] } = useExcludedPeriods();
  const add = useAddExcludedPeriod(userId);
  const del = useDeleteExcludedPeriod();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [label, setLabel] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!start || !end) return;
    try {
      await add.mutateAsync({ start_date: start, end_date: end, label });
      setStart(""); setEnd(""); setLabel("");
    } catch (err) {
      alert((err as Error).message);
    }
  };

  return (
    <div style={wrap}>
      <div style={list}>
        {periods.length === 0 && <div style={empty}>Aucune période sans sport.</div>}
        {periods.map((p) => (
          <div key={p.id} style={row}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{p.label || "Pause"}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {fmt(p.start_date)} → {fmt(p.end_date)}
              </div>
            </div>
            {canEdit && (
              <button onClick={() => del.mutate(p.id)} style={removeBtn} aria-label="Supprimer">×</button>
            )}
          </div>
        ))}
      </div>

      {canEdit && (
        <form onSubmit={submit} style={form}>
          <div style={{ display: "flex", gap: 6 }}>
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} style={input} required />
            <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} style={input} required />
          </div>
          <input type="text" placeholder="Libellé (ex: Vacances été)" value={label} onChange={(e) => setLabel(e.target.value)} style={input} />
          <button type="submit" disabled={add.isPending} style={submitBtn}>
            {add.isPending ? "…" : "Ajouter une période"}
          </button>
        </form>
      )}
    </div>
  );
}

const fmt = (s: string) => new Date(s + "T12:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

const wrap: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 12, overflowY: "auto", maxHeight: 320 };
const list: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6 };
const empty: React.CSSProperties = { padding: 16, textAlign: "center", color: "var(--text-muted)", fontSize: 12 };
const row: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg)", border: "1px solid var(--violet-border)", borderRadius: 8, padding: "8px 12px" };
const removeBtn: React.CSSProperties = { background: "transparent", border: "none", color: "var(--danger)", fontSize: 18, cursor: "pointer", width: 24, height: 24 };
const form: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6, paddingTop: 10, borderTop: "1px solid var(--violet-border)" };
const input: React.CSSProperties = { flex: 1, background: "var(--bg)", border: "1px solid var(--violet-border)", color: "var(--text)", borderRadius: 6, padding: "6px 8px", fontSize: 12, width: "100%" };
const submitBtn: React.CSSProperties = { background: "linear-gradient(135deg, var(--orange), var(--violet))", color: "white", border: "none", borderRadius: 6, padding: "8px 12px", fontSize: 12, fontWeight: 500 };
