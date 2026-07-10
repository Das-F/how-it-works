import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Json } from "@/integrations/supabase/types";
import styles from "./GoogleSheetWidget.module.css";

interface Props {
  widgetId: string;
  title: string | null;
  config: Json | null;
  dashboardId: string | undefined;
  canEdit: boolean;
}

function normalizeUrl(raw: string): string {
  const u = raw.trim();
  if (!u) return "";
  if (!/^https?:\/\//i.test(u)) return `https://${u}`;
  return u;
}

function toEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("docs.google.com")) return null;
    // https://docs.google.com/spreadsheets/d/<id>/edit... -> /preview
    const m = u.pathname.match(/\/spreadsheets\/d\/([^/]+)/);
    if (!m) return null;
    return `https://docs.google.com/spreadsheets/d/${m[1]}/preview`;
  } catch {
    return null;
  }
}

export function GoogleSheetWidget({ widgetId, title, config, dashboardId, canEdit }: Props) {
  const qc = useQueryClient();
  const url = useMemo(() => {
    if (config && typeof config === "object" && !Array.isArray(config)) {
      const v = (config as Record<string, unknown>).url;
      return typeof v === "string" ? v : "";
    }
    return "";
  }, [config]);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(url);
  const [titleDraft, setTitleDraft] = useState(title ?? "");

  useEffect(() => setDraft(url), [url]);
  useEffect(() => setTitleDraft(title ?? ""), [title]);

  const save = useMutation({
    mutationFn: async (patch: { url?: string; title?: string }) => {
      const update: Record<string, unknown> = {};
      if (patch.url !== undefined) {
        const nextConfig =
          config && typeof config === "object" && !Array.isArray(config)
            ? { ...(config as Record<string, unknown>) }
            : {};
        nextConfig.url = patch.url;
        update.config = nextConfig;
      }
      if (patch.title !== undefined) update.title = patch.title;
      const { error } = await supabase.from("widgets").update(update).eq("id", widgetId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["widgets", dashboardId] }),
  });

  const embed = url ? toEmbedUrl(url) : null;

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.icon}>📊</span>
        {canEdit ? (
          <input
            className={styles.title}
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={() => {
              const v = titleDraft.trim();
              if (v !== (title ?? "")) save.mutate({ title: v });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") setTitleDraft(title ?? "");
            }}
            placeholder="Titre du Google Sheet"
            maxLength={80}
          />
        ) : (
          <span className={styles.title}>{title || "Google Sheet"}</span>
        )}
        {canEdit && url && !editing && (
          <button className={styles.iconBtn} onClick={() => setEditing(true)} title="Modifier le lien" type="button">
            ✎
          </button>
        )}
      </div>

      {(!url || editing) && canEdit ? (
        <div className={styles.editRow}>
          <input
            className={styles.input}
            placeholder="Colle l'URL de ton Google Sheet…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button
            className={styles.saveBtn}
            type="button"
            disabled={save.isPending}
            onClick={() => {
              const v = normalizeUrl(draft);
              save.mutate({ url: v }, { onSuccess: () => setEditing(false) });
            }}
          >
            {save.isPending ? "…" : "OK"}
          </button>
          {editing && (
            <button className={styles.cancelBtn} type="button" onClick={() => { setDraft(url); setEditing(false); }}>
              Annuler
            </button>
          )}
        </div>
      ) : null}

      {url ? (
        embed ? (
          <iframe className={styles.frame} src={embed} title={title || "Google Sheet"} loading="lazy" />
        ) : (
          <div className={styles.empty}>
            Lien enregistré, mais pas reconnu comme Google Sheet.{" "}
            <a href={url} target="_blank" rel="noreferrer" className={styles.link}>
              Ouvrir dans un nouvel onglet ↗
            </a>
          </div>
        )
      ) : !canEdit ? (
        <div className={styles.empty}>Aucun Google Sheet configuré.</div>
      ) : null}

      {url && (
        <a href={url} target="_blank" rel="noreferrer" className={styles.link}>
          Ouvrir dans Google Sheets ↗
        </a>
      )}
    </div>
  );
}
