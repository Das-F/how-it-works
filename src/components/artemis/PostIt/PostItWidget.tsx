import { useEffect, useState } from "react";
import { usePostIt, useUpdatePostIt } from "@/hooks/use-post-it";
import styles from "./PostIt.module.css";

interface Props {
  isAdmin: boolean;
  userId: string | undefined;
}

export function PostItWidget({ isAdmin, userId }: Props) {
  const { data: postIt, isLoading } = usePostIt();
  const updateMut = useUpdatePostIt();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (postIt) setDraft(postIt.content);
  }, [postIt]);

  const save = async () => {
    if (!postIt || !userId) return;
    await updateMut.mutateAsync({ id: postIt.id, content: draft, userId });
    setEditing(false);
  };

  return (
    <div className={styles.card}>
      <div className={styles.pin} />
      <div className={styles.label}>Rappel Admin</div>

      {editing ? (
        <div className={styles.editor}>
          <textarea
            className={styles.textarea}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
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
              disabled={updateMut.isPending}
            >
              {updateMut.isPending ? "..." : "Enregistrer"}
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
          {isAdmin && postIt && (
            <button className={styles.editToggle} onClick={() => setEditing(true)}>
              Modifier
            </button>
          )}
        </>
      )}
    </div>
  );
}
