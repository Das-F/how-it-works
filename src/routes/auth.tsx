import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import styles from "./auth.module.css";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Connexion — Artemis Community" },
      { name: "description", content: "Connecte-toi à Artemis Community par lien magique." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/", replace: true });
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) navigate({ to: "/", replace: true });
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      setStatus("error");
      setError(error.message);
    } else {
      setStatus("sent");
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>A</div>
        <h1 className={styles.title}>Artemis Community</h1>
        <p className={styles.subtitle}>Reçois un lien magique pour te connecter</p>

        {status === "sent" ? (
          <div className={styles.success}>
            <strong>Lien envoyé !</strong>
            <p>Vérifie ta boîte mail et clique sur le lien magique pour te connecter.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            <input
              type="email"
              placeholder="ton@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className={styles.input}
              disabled={status === "sending"}
            />
            <button
              type="submit"
              className={styles.button}
              disabled={status === "sending" || !email.trim()}
            >
              {status === "sending" ? "Envoi..." : "Envoyer le lien magique"}
            </button>
            {error && <div className={styles.error}>{error}</div>}
          </form>
        )}

        <div className={styles.footer}>
          Authentification sans mot de passe — sécurisée et instantanée.
        </div>
      </div>
    </div>
  );
}
