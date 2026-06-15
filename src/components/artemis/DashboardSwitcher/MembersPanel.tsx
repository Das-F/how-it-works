import { useState, type FormEvent } from "react";
import {
  useDashboardInvitations,
  useDashboardMembers,
  useInviteToDashboard,
  useRemoveMember,
} from "@/hooks/use-dashboards";
import styles from "./MembersPanel.module.css";

interface Props {
  dashboardId: string;
  ownerId: string;
  userId: string;
}

export function MembersPanel({ dashboardId, ownerId, userId }: Props) {
  const { data: members = [] } = useDashboardMembers(dashboardId);
  const { data: invitations = [] } = useDashboardInvitations(dashboardId);
  const invite = useInviteToDashboard(userId);
  const removeMember = useRemoveMember(dashboardId);
  const [email, setEmail] = useState("");

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || invite.isPending) return;
    try {
      await invite.mutateAsync({ dashboardId, email });
      setEmail("");
    } catch {
      /* error shown below */
    }
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>Membres du dashboard</span>
        <span className={styles.subtitle}>{members.length} membre{members.length > 1 ? "s" : ""}</span>
      </div>

      <div className={styles.list}>
        {members.map((m) => {
          const isOwner = m.user_id === ownerId;
          const label = m.qualificatif || m.nom || "Membre";
          return (
            <div key={m.user_id} className={styles.row}>
              <div>
                <div className={styles.rowName}>
                  {label}
                  {isOwner && <span style={{ marginLeft: 8, fontSize: 10, color: "var(--orange)" }}>OWNER</span>}
                </div>
              </div>
              {!isOwner && (
                <button
                  className={styles.removeBtn}
                  onClick={() => {
                    if (confirm(`Retirer ${label} du dashboard ?`)) {
                      removeMember.mutate(m.user_id);
                    }
                  }}
                  aria-label="Retirer"
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
        {invitations.map((inv) => (
          <div key={inv.id} className={styles.row}>
            <div>
              <div className={styles.rowName}>{inv.email}</div>
              <div className={styles.rowEmail}>Invitation envoyée</div>
            </div>
            <span className={styles.pendingBadge}>En attente</span>
          </div>
        ))}
      </div>

      <form className={styles.form} onSubmit={handleInvite}>
        <input
          type="email"
          className={styles.input}
          placeholder="email@exemple.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit" className={styles.send} disabled={!email.trim() || invite.isPending}>
          {invite.isPending ? "…" : "Inviter"}
        </button>
      </form>

      {invite.isError && (
        <div className={styles.error}>{(invite.error as Error).message}</div>
      )}
      <div style={{ fontSize: 11, color: "var(--text-dim)", lineHeight: 1.5 }}>
        Une fois invité, partage-lui le lien de connexion. À sa première connexion avec
        cet email, il rejoindra automatiquement ce dashboard.
      </div>
    </div>
  );
}
