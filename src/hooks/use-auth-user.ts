import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useAuthUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Si l'URL contient des tokens du lien magique, attendre que Supabase les traite
    const hasAuthHash =
      typeof window !== "undefined" &&
      (window.location.hash.includes("access_token") ||
        window.location.hash.includes("error"));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });

    if (!hasAuthHash) {
      supabase.auth.getSession().then(({ data }) => {
        if (!mounted) return;
        setUser(data.session?.user ?? null);
        setLoading(false);
      });
    } else {
      // Filet de sécurité : si rien ne se passe au bout de 5s, on débloque
      const timeout = setTimeout(() => {
        if (!mounted) return;
        supabase.auth.getSession().then(({ data }) => {
          if (!mounted) return;
          setUser(data.session?.user ?? null);
          setLoading(false);
        });
      }, 5000);
      return () => {
        mounted = false;
        clearTimeout(timeout);
        subscription.unsubscribe();
      };
    }

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
