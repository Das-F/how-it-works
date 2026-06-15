import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useCreateDashboard, useDashboards, type Dashboard } from "@/hooks/use-dashboards";
import styles from "./DashboardSwitcher.module.css";

interface Props {
  userId: string;
  activeDashboardId: string | undefined;
  isAdmin: boolean;
}

export function DashboardSwitcher({ userId, activeDashboardId, isAdmin }: Props) {
  const { data: dashboards = [] } = useDashboards(userId);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const active = dashboards.find((d) => d.id === activeDashboardId);

  const goToDashboard = (id: string) => {
    navigate({ to: "/", search: { dashboard: id } });
    setOpen(false);
  };

  const renderBadge = (d: Dashboard) => {
    if (d.is_personal) return <span className={`${styles.badge} ${styles.badgePerso}`}>Perso</span>;
    if (d.owner_id === userId) return <span className={styles.badge}>Propriétaire</span>;
    return <span className={styles.badge}>Invité</span>;
  };

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <button className={styles.trigger} onClick={() => setOpen((v) => !v)}>
        <span className={styles.dot} />
        <span>{active?.name ?? "Choisir un dashboard"}</span>
        <span className={styles.caret}>▼</span>
      </button>

      {open && (
        <div className={styles.menu}>
          {dashboards.map((d) => (
            <button
              key={d.id}
              className={`${styles.item} ${d.id === activeDashboardId ? styles.itemActive : ""}`}
              onClick={() => goToDashboard(d.id)}
            >
              <span className={styles.itemName}>{d.name}</span>
              {renderBadge(d)}
            </button>
          ))}
          {isAdmin && (
            <>
              <div className={styles.divider} />
              <button
                className={styles.createBtn}
                onClick={() => {
                  setOpen(false);
                  setShowCreate(true);
                }}
              >
                + Créer un nouveau dashboard
              </button>
            </>
          )}
        </div>
      )}

      {showCreate && (
        <CreateDashboardModal
          userId={userId}
          onClose={() => setShowCreate(false)}
          onCreated={(d) => {
            setShowCreate(false);
            navigate({ to: "/", search: { dashboard: d.id } });
          }}
        />
      )}
    </div>
  );
}

function CreateDashboardModal({
  userId,
  onClose,
  onCreated,
}: {
  userId: string;
  onClose: () => void;
  onCreated: (d: Dashboard) => void;
}) {
  const [name, setName] = useState("");
  const createMut = useCreateDashboard(userId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || createMut.isPending) return;
    try {
      const d = await createMut.mutateAsync(name);
      onCreated(d);
    } catch {
      /* error displayed below */
    }
  };

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <form
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className={styles.modalTitle}>Nouveau dashboard partagé</div>
        <div className={styles.modalLabel}>Nom du dashboard</div>
        <input
          autoFocus
          className={styles.input}
          placeholder="ex : Famille, Amis Lyon…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
        />
        <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
          Le dashboard sera créé vide avec les mêmes emplacements de widgets. Tu pourras le
          personnaliser avant d'inviter des membres.
        </p>
        {createMut.isError && (
          <div className={styles.error}>{(createMut.error as Error).message}</div>
        )}
        <div className={styles.modalActions}>
          <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onClose}>
            Annuler
          </button>
          <button
            type="submit"
            className={`${styles.btn} ${styles.btnPrimary}`}
            disabled={!name.trim() || createMut.isPending}
          >
            {createMut.isPending ? "Création…" : "Créer"}
          </button>
        </div>
      </form>
    </div>
  );
}
