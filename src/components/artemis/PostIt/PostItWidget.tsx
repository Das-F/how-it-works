import { useEffect, useState } from "react";
import { usePostIt, useUpsertPostIt } from "@/hooks/use-post-it";
import styles from "./PostItWidget.module.css";

interface Props {
  isOwner: boolean;
  userId: string | undefined;
  dashboardId: string | undefined;
}

export function PostItWidget({ isOwner, userId, dashboardId }: Props) {
  const { data: postIt, isLoading } = usePostIt(dashboardId);
  const upsertMut = useUpsertPostIt(dashboardId);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    setDraft(postIt?.content ?? "");
  }, [postIt]);

  const save = async () => {
    if (!userId) return;
    await upsertMut.mutateAsync({ id: postIt?.id, content: draft, userId });
    setEditing(false);
  };

  return (
    <div className={styles.card}>
      <div className={styles.pin} />
      <div className={styles.label}>Rappel</div>

      {editing ? (
        <div className={styles.editor}>
          <textarea
            className={styles.textarea}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
          />
          <div className={styles.actions}>
            <button
              className={`${styles.btn} ${styles.btnGhost}`}
              onClick={() => { setEditing(false); setDraft(postIt?.content ?? ""); }}
            >
              Annuler
            </button>
            <button
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={save}
              disabled={upsertMut.isPending}
            >
              {upsertMut.isPending ? "..." : "Enregistrer"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className={styles.content}>
            {isLoading
              ? "Chargement..."
              : postIt?.content
                ? postIt.content
                : <span className={styles.empty}>Aucun rappel pour l'instant.</span>}
          </div>
          {isOwner && (
            <button className={styles.editToggle} onClick={() => setEditing(true)}>
              {postIt ? "Modifier" : "+ Ajouter un rappel"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
