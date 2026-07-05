import { useMemo, useState } from "react";
import { useExcludedPeriods, useAttendances } from "@/hooks/use-sport";
import { useDashboardMembers } from "@/hooks/use-dashboards";

const MONTHS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const DAYS = ["L","M","M","J","V","S","D"];

const pad = (n: number) => String(n).padStart(2, "0");
const fmtDate = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

interface Props {
  title?: string | null;
  dashboardId: string | undefined;
}

export function CalendarWidget({ title, dashboardId }: Props) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const today = new Date();
  const isToday = (d: number) =>
    today.getFullYear() === cursor.y && today.getMonth() === cursor.m && today.getDate() === d;

  const firstDay = new Date(cursor.y, cursor.m, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const { data: periods = [] } = useExcludedPeriods();
  const { data: members = [] } = useDashboardMembers(dashboardId);

  // Sport sessions in this month (lundi=1, jeudi=4), excluding excluded periods
  const sessionDates = useMemo(() => {
    const set = new Set<string>();
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(cursor.y, cursor.m, d);
      const dow = dt.getDay();
      if (dow !== 1 && dow !== 4) continue;
      const ds = fmtDate(cursor.y, cursor.m, d);
      const excluded = periods.some((p) => ds >= p.start_date && ds <= p.end_date);
      if (!excluded) set.add(ds);
    }
    return Array.from(set);
  }, [cursor.y, cursor.m, daysInMonth, periods]);

  const { data: attendances = [] } = useAttendances(sessionDates);

  const memberLabel = (uid: string) => {
    const m = members.find((x) => x.user_id === uid);
    if (!m) return "Membre";
    return m.alias || m.qualificatif || m.nom || "Membre";
  };

  const byDate = useMemo(() => {
    const map = new Map<string, { present: string[]; absent: string[]; pending: string[] }>();
    for (const ds of sessionDates) {
      const present: string[] = [];
      const absent: string[] = [];
      const responded = new Set<string>();
      for (const a of attendances) {
        if (a.session_date !== ds) continue;
        responded.add(a.user_id);
        (a.status === "present" ? present : absent).push(memberLabel(a.user_id));
      }
      const pending = members
        .filter((m) => !responded.has(m.user_id))
        .map((m) => memberLabel(m.user_id));
      map.set(ds, { present, absent, pending });
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionDates, attendances, members]);

  const shift = (delta: number) => {
    const nm = cursor.m + delta;
    setCursor({
      y: cursor.y + Math.floor(nm / 12),
      m: ((nm % 12) + 12) % 12,
    });
  };

  const [hover, setHover] = useState<string | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={() => shift(-1)} style={navBtn}>‹</button>
        <div style={{ fontWeight: 600, fontSize: 13 }}>
          {title ? `${title} — ` : ""}{MONTHS[cursor.m]} {cursor.y}
        </div>
        <button onClick={() => shift(1)} style={navBtn}>›</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, fontSize: 11 }}>
        {DAYS.map((d, i) => (
          <div key={i} style={{ textAlign: "center", color: "var(--text-dim)", padding: 4 }}>{d}</div>
        ))}
        {cells.map((d, i) => {
          const ds = d ? fmtDate(cursor.y, cursor.m, d) : null;
          const session = ds ? byDate.get(ds) : undefined;
          const todayCell = !!d && isToday(d);
          return (
            <div
              key={i}
              onMouseEnter={() => session && ds && setHover(ds)}
              onMouseLeave={() => setHover((cur) => (cur === ds ? null : cur))}
              style={{
                position: "relative",
                textAlign: "center",
                padding: 6,
                borderRadius: 6,
                fontSize: 12,
                background: todayCell ? "var(--orange)" : "transparent",
                color: todayCell ? "#fff" : "var(--text)",
                fontWeight: todayCell ? 600 : 400,
                cursor: session ? "help" : "default",
              }}
            >
              {d ?? ""}
              {session && (
                <span
                  style={{
                    position: "absolute",
                    bottom: 2,
                    left: "50%",
                    transform: "translateX(-50%)",
                    fontSize: 9,
                    lineHeight: 1,
                  }}
                  aria-label="Session de sport"
                >
                  🏃
                </span>
              )}
              {hover === ds && session && (
                <SessionTooltip data={session} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SessionTooltip({ data }: { data: { present: string[]; absent: string[]; pending: string[] } }) {
  return (
    <div
      style={{
        position: "absolute",
        zIndex: 50,
        top: "100%",
        left: "50%",
        transform: "translateX(-50%)",
        marginTop: 4,
        minWidth: 180,
        maxWidth: 240,
        background: "var(--bg-elev)",
        border: "1px solid var(--violet-border)",
        borderRadius: 8,
        padding: 10,
        textAlign: "left",
        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        fontSize: 11,
        color: "var(--text)",
        pointerEvents: "none",
      }}
    >
      <Group emoji="✅" label="Présents" color="#22c55e" names={data.present} />
      <Group emoji="❌" label="Absents" color="#ef4444" names={data.absent} />
      <Group emoji="❔" label="Sans réponse" color="var(--text-muted)" names={data.pending} />
    </div>
  );
}

function Group({ emoji, label, color, names }: { emoji: string; label: string; color: string; names: string[] }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ color, fontWeight: 600, marginBottom: 2 }}>
        {emoji} {label} ({names.length})
      </div>
      {names.length > 0 ? (
        <div style={{ color: "var(--text-muted)", lineHeight: 1.4 }}>{names.join(", ")}</div>
      ) : (
        <div style={{ color: "var(--text-dim)", fontStyle: "italic" }}>—</div>
      )}
    </div>
  );
}

const navBtn: React.CSSProperties = {
  background: "var(--violet-soft)",
  border: "1px solid var(--violet-border)",
  color: "var(--text)",
  width: 26,
  height: 26,
  borderRadius: 6,
  fontSize: 14,
};
