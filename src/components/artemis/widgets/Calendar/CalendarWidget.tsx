import { useState } from "react";

const MONTHS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const DAYS = ["L","M","M","J","V","S","D"];

export function CalendarWidget({ title }: { title?: string | null }) {
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

  const shift = (delta: number) => {
    const nm = cursor.m + delta;
    setCursor({
      y: cursor.y + Math.floor(nm / 12),
      m: ((nm % 12) + 12) % 12,
    });
  };

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
        {cells.map((d, i) => (
          <div
            key={i}
            style={{
              textAlign: "center",
              padding: 6,
              borderRadius: 6,
              fontSize: 12,
              background: d && isToday(d) ? "var(--orange)" : "transparent",
              color: d && isToday(d) ? "#fff" : "var(--text)",
              fontWeight: d && isToday(d) ? 600 : 400,
            }}
          >
            {d ?? ""}
          </div>
        ))}
      </div>
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
