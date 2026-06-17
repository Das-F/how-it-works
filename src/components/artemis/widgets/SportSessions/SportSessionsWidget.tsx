import { useMemo, useState } from "react";
import {
  useAttendances,
  useExcludedPeriods,
  useSetAttendance,
  getUpcomingSportSessions,
} from "@/hooks/use-sport";
import { ExcludedPeriodsPanel } from "./ExcludedPeriodsPanel";
import { SportAdminsPanel } from "./SportAdminsPanel";
import styles from "./SportSessionsWidget.module.css";

interface Props {
  userId: string;
  isSportAdmin: boolean;
  isGlobalAdmin: boolean;
  title?: string | null;
}

const WEEKDAY_FULL = (s: string) => {
  const d = new Date(s + "T12:00:00");
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
};

export function SportSessionsWidget({ userId, isSportAdmin, isGlobalAdmin, title }: Props) {
  const { data: periods = [] } = useExcludedPeriods();
  const sessions = useMemo(() => getUpcomingSportSessions(periods, 24), [periods]);
  const dates = useMemo(() => sessions.map((s) => s.date), [sessions]);
  const { data: attendances = [] } = useAttendances(dates);
  const setAtt = useSetAttendance(userId);
  const [tab, setTab] = useState<"sessions" | "periods" | "admins">("sessions");

  const myStatus = (date: string) =>
    attendances.find((a) => a.session_date === date && a.user_id === userId)?.status;

  const counts = (date: string) => {
    const present = attendances.filter((a) => a.session_date === date && a.status === "present").length;
    const absent = attendances.filter((a) => a.session_date === date && a.status === "absent").length;
    return { present, absent };
  };

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.title}>
          🏃 {title || "Sessions de sport"}
        </div>
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${tab === "sessions" ? styles.tabActive : ""}`} onClick={() => setTab("sessions")}>Agenda</button>
          <button className={`${styles.tab} ${tab === "periods" ? styles.tabActive : ""}`} onClick={() => setTab("periods")}>Pauses</button>
          {isGlobalAdmin && (
            <button className={`${styles.tab} ${tab === "admins" ? styles.tabActive : ""}`} onClick={() => setTab("admins")}>Admins</button>
          )}
        </div>
      </div>

      <div className={styles.subtitle}>Lundis &amp; jeudis · 18h30 – 20h45</div>

      {tab === "sessions" && (
        <div className={styles.scroll}>
          {sessions.map((s) => {
            const mine = myStatus(s.date);
            const c = counts(s.date);
            return (
              <div key={s.date} className={styles.session}>
                <div className={styles.sessionInfo}>
                  <div className={styles.sessionDate}>{WEEKDAY_FULL(s.date)}</div>
                  <div className={styles.sessionMeta}>
                    <span className={styles.presentDot}>✓ {c.present}</span>
                    <span className={styles.absentDot}>✗ {c.absent}</span>
                  </div>
                </div>
                <div className={styles.actions}>
                  <button
                    className={`${styles.btn} ${styles.btnPresent} ${mine === "present" ? styles.btnActive : ""}`}
                    onClick={() => setAtt.mutate({ session_date: s.date, status: mine === "present" ? null : "present" })}
                  >Je viens</button>
                  <button
                    className={`${styles.btn} ${styles.btnAbsent} ${mine === "absent" ? styles.btnActive : ""}`}
                    onClick={() => setAtt.mutate({ session_date: s.date, status: mine === "absent" ? null : "absent" })}
                  >Absent</button>
                </div>
              </div>
            );
          })}
          {sessions.length === 0 && (
            <div style={{ padding: 20, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              Aucune session à venir.
            </div>
          )}
        </div>
      )}

      {tab === "periods" && (
        <ExcludedPeriodsPanel userId={userId} canEdit={isSportAdmin} />
      )}

      {tab === "admins" && isGlobalAdmin && (
        <SportAdminsPanel userId={userId} />
      )}
    </div>
  );
}
