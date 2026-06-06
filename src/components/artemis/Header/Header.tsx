import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import styles from "./Header.module.css";

interface Props {
  qualificatif?: string | null;
  nom?: string | null;
  isAdmin?: boolean;
}

export function Header({ qualificatif, nom, isAdmin }: Props) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const displayQualif = qualificatif?.trim() || "ami(e)";
  const displayNom = nom?.trim() || "";

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <div className={styles.logo}>A</div>
        <div>
          <div className={styles.brandName}>Artemis Community</div>
          <div className={styles.brandSub}>Dashboard</div>
        </div>
      </div>

      <div className={styles.greeting}>
        <div className={styles.greetingMain}>
          Bonjour, <span className={styles.qualif}>{displayQualif}</span>
          {displayNom && <> <span className={styles.nom}>{displayNom}</span></>}
        </div>
      </div>

      <div className={styles.actions}>
        {isAdmin && <span className={styles.adminBadge}>Admin</span>}
        <button className={styles.logout} onClick={handleLogout}>
          Déconnexion
        </button>
      </div>
    </header>
  );
}
