import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import styles from "./Header.module.css";

interface Props {
  userId?: string;
  qualificatif?: string | null;
  nom?: string | null;
  isAdmin?: boolean;
  switcher?: ReactNode;
}

export function Header({ userId, qualificatif, nom, isAdmin, switcher }: Props) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const displayNom = nom?.trim() || "";
  const displayQualif = qualificatif?.trim() || "";

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <div className={styles.logo}>A</div>
        <div>
          <div className={styles.brandName}>Artemis Community</div>
          <div className={styles.brandSub}>Dashboard</div>
        </div>
        {switcher && <div className={styles.switcherSlot}>{switcher}</div>}
      </div>

      <div className={styles.greeting}>
        <div className={styles.greetingMain}>
          Bonjour,{" "}
          {displayNom ? (
            <>
              <span className={styles.qualif}>{displayNom}</span>
              {displayQualif && <> <span className={styles.nom}>{displayQualif}</span></>}
            </>
          ) : (
            <span className={styles.nom}>{displayQualif || "ami(e)"}</span>
          )}
          {userId && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              title="Modifier mon nom"
              aria-label="Modifier mon nom"
              style={{
                marginLeft: 8,
                background: "transparent",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              ✎
            </button>
          )}
        </div>
      </div>

      <div className={styles.actions}>
        {isAdmin && <span className={styles.adminBadge}>Admin</span>}
        <button className={styles.logout} onClick={handleLogout}>
          Déconnexion
        </button>
      </div>

      {editing && userId && (
        <ProfileEditModal
          userId={userId}
          nom={nom ?? ""}
          qualificatif={qualificatif ?? ""}
          onClose={() => setEditing(false)}
        />
      )}
    </header>
  );
}

function ProfileEditModal({
  userId,
  nom,
  qualificatif,
  onClose,
}: {
  userId: string;
  nom: string;
  qualificatif: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [n, setN] = useState(nom);
  const [q, setQ] = useState(qualificatif);

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({ nom: n.trim(), qualificatif: q })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile", userId] });
      qc.invalidateQueries({ queryKey: ["dashboard-members"] });
      onClose();
    },
  });

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "grid",
        placeItems: "center",
        zIndex: 100,
      }}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
        style={{
          background: "var(--bg-elev)",
          border: "1px solid var(--violet-border)",
          borderRadius: "var(--radius)",
          padding: 22,
          minWidth: 320,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div style={{ fontWeight: 600, color: "var(--text)" }}>Mon nom</div>
        <label style={{ fontSize: 12, color: "var(--text-muted)" }}>
          Prénom / nom d'usage
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            maxLength={60}
            style={inputStyle}
          />
        </label>
        <label style={{ fontSize: 12, color: "var(--text-muted)" }}>
          Qualificatif (optionnel)
          <input
            value={n}
            onChange={(e) => setN(e.target.value)}
            maxLength={60}
            placeholder="laisser vide pour n'afficher que le prénom"
            style={inputStyle}
          />
        </label>
        {save.isError && (
          <div style={{ color: "var(--danger)", fontSize: 12 }}>
            {(save.error as Error).message}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={btnGhost}>
            Annuler
          </button>
          <button type="submit" disabled={save.isPending} style={btnPrimary}>
            {save.isPending ? "…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  display: "block",
  marginTop: 4,
  width: "100%",
  padding: "9px 12px",
  background: "var(--bg)",
  border: "1px solid var(--violet-border)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text)",
  fontSize: 13,
  outline: "none",
};

const btnGhost: React.CSSProperties = {
  padding: "8px 14px",
  background: "transparent",
  border: "1px solid var(--violet-border)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text)",
  fontSize: 13,
  cursor: "pointer",
};

const btnPrimary: React.CSSProperties = {
  padding: "8px 14px",
  background: "linear-gradient(135deg, var(--violet), var(--orange))",
  border: "none",
  borderRadius: "var(--radius-sm)",
  color: "white",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};
