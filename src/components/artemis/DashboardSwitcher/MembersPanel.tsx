import { useState, type FormEvent } from "react";
import {
  useDashboardInvitations,
  useDashboardMembers,
  useInviteToDashboard,
  useRemoveMember,
  useRenameMember,
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
  const renameMember = useRenameMember(dashboardId);
  const [email, setEmail] = useState("");
  const [prefillNom, setPrefillNom] = useState("");
  const [prefillQualif, setPrefillQualif] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || invite.isPending) return;
    try {
      await invite.mutateAsync({
        dashboardId,
        email,
        prefillNom: prefillNom.trim() || undefined,
        prefillQualificatif: prefillQualif.trim() || undefined,
      });
      setEmail("");
      setPrefillNom("");
      setPrefillQualif("");
    } catch {
      /* error shown below */
    }
  };

  const startEdit = (memberUserId: string, current: string) => {
    setEditingId(memberUserId);
    setEditingValue(current);
  };

  const submitEdit = async (memberUserId: string) => {
    try {
      await renameMember.mutateAsync({ userId: memberUserId, alias: editingValue });
      setEditingId(null);
    } catch {
      /* noop */
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
          const baseLabel = m.qualificatif || m.nom || "Membre";
          const label = m.alias || baseLabel;
          const isEditing = editingId === m.user_id;
          const canRename = !isOwner && userId === ownerId;
          return (
            <div key={m.user_id} className={styles.row}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {isEditing ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      submitEdit(m.user_id);
                    }}
                    style={{ display: "flex", gap: 6 }}
                  >
                    <input
                      autoFocus
                      className={styles.input}
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      placeholder={baseLabel}
                      maxLength={60}
                      onBlur={() => submitEdit(m.user_id)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") setEditingId(null);
                      }}
                    />
                  </form>
                ) : (
                  <div className={styles.rowName}>
                    {m.alias ? (
                      <>
                        {m.alias}
                        {!isOwner && (
                          <span style={{ marginLeft: 8, fontSize: 11, color: "var(--text-muted)" }}>({baseLabel})</span>
                        )}
                      </>
                    ) : m.nom ? (
                      <>
                        <span style={{ color: "var(--orange)", fontWeight: 600 }}>{m.nom}</span>
                        {m.qualificatif && <> <span>{m.qualificatif}</span></>}
                        {isOwner && <span style={{ marginLeft: 8, fontSize: 10, color: "var(--orange)" }}>OWNER</span>}
                      </>
                    ) : (
                      <>
                        {m.qualificatif || "Membre"}
                        {isOwner && <span style={{ marginLeft: 8, fontSize: 10, color: "var(--orange)" }}>OWNER</span>}
                      </>
                    )}
                  </div>
                )}
              </div>
              {canRename && !isEditing && (
                <button
                  className={styles.removeBtn}
                  onClick={() => startEdit(m.user_id, m.alias ?? "")}
                  aria-label="Renommer"
                  title="Renommer"
                  style={{ fontSize: 13 }}
                >
                  ✎
                </button>
              )}
              {!isOwner && !isEditing && (
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
              <div className={styles.rowName}>
                {inv.prefill_nom ? (
                  <>
                    <span style={{ color: "var(--orange)", fontWeight: 600 }}>{inv.prefill_nom}</span>
                    {inv.prefill_qualificatif && <> <span>{inv.prefill_qualificatif}</span></>}
                  </>
                ) : (
                  <span>{inv.prefill_qualificatif || inv.email}</span>
                )}
              </div>
              <div className={styles.rowEmail}>{inv.email} — Invitation envoyée</div>
            </div>
            <span className={styles.pendingBadge}>En attente</span>
          </div>
        ))}
      </div>

      <form className={styles.form} onSubmit={handleInvite} style={{ flexDirection: "column", gap: 6 }}>
        <input
          type="email"
          className={styles.input}
          placeholder="email@exemple.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div style={{ display: "flex", gap: 6 }}>
          <input
            type="text"
            className={styles.input}
            placeholder="Prénom (optionnel)"
            value={prefillQualif}
            onChange={(e) => setPrefillQualif(e.target.value)}
            maxLength={60}
          />
          <input
            type="text"
            className={styles.input}
            placeholder="Qualificatif (optionnel)"
            value={prefillNom}
            onChange={(e) => setPrefillNom(e.target.value)}
            maxLength={60}
          />
        </div>
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
