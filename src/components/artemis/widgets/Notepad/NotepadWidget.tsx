import { useEffect, useState, type FormEvent } from "react";
import {
  useAddNote,
  useDeleteNote,
  useNotepadNotes,
  useUpdateNote,
  useUpdateWidgetTitle,
} from "@/hooks/use-notepad";
import styles from "./NotepadWidget.module.css";

interface Props {
  widgetId: string;
  title: string | null;
  userId: string;
  dashboardId: string | undefined;
  canEdit: boolean;
}

export function NotepadWidget({ widgetId, title, userId, dashboardId, canEdit }: Props) {
  const { data: notes = [], isLoading } = useNotepadNotes(widgetId);
  const addNote = useAddNote(widgetId, userId);
  const updateNote = useUpdateNote(widgetId);
  const deleteNote = useDeleteNote(widgetId);
  const updateTitle = useUpdateWidgetTitle(dashboardId);

  const [draft, setDraft] = useState("");
  const [titleDraft, setTitleDraft] = useState(title ?? "");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");

  useEffect(() => {
    setTitleDraft(title ?? "");
  }, [title]);

  const handleAdd = (e: FormEvent) => {
    e.preventDefault();
    const v = draft.trim();
    if (!v || addNote.isPending) return;
    addNote.mutate(v, { onSuccess: () => setDraft("") });
  };

  const commitTitle = () => {
    const v = titleDraft.trim();
    if (v === (title ?? "")) return;
    updateTitle.mutate({ id: widgetId, title: v });
  };

  const startEdit = (id: string, content: string) => {
    setEditingId(id);
    setEditingValue(content);
  };

  const commitEdit = () => {
    if (!editingId) return;
    const v = editingValue.trim();
    if (!v) {
      setEditingId(null);
      return;
    }
    updateNote.mutate(
      { id: editingId, content: v },
      { onSuccess: () => setEditingId(null) },
    );
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.icon}>📝</span>
        {canEdit ? (
          <input
            className={styles.title}
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") setTitleDraft(title ?? "");
            }}
            placeholder="Titre du bloc-notes"
            maxLength={80}
          />
        ) : (
          <span className={styles.title}>{title || "Bloc-notes"}</span>
        )}
      </div>

      <div className={styles.list}>
        {isLoading && <div className={styles.empty}>Chargement…</div>}
        {!isLoading && notes.length === 0 && (
          <div className={styles.empty}>Aucune note. Commence par en ajouter une !</div>
        )}
        {notes.map((n) => {
          const isEditing = editingId === n.id;
          return (
            <div key={n.id} className={styles.note}>
              {isEditing ? (
                <textarea
                  autoFocus
                  className={styles.noteContent}
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setEditingId(null);
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commitEdit();
                  }}
                  rows={Math.min(6, Math.max(1, editingValue.split("\n").length))}
                />
              ) : (
                <div className={styles.noteContent}>{n.content}</div>
              )}
              {canEdit && !isEditing && (
                <div className={styles.noteActions}>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={() => startEdit(n.id, n.content)}
                    aria-label="Modifier"
                    title="Modifier"
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                    onClick={() => {
                      if (confirm("Supprimer cette note ?")) deleteNote.mutate(n.id);
                    }}
                    aria-label="Supprimer"
                    title="Supprimer"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {canEdit && (
        <form className={styles.form} onSubmit={handleAdd}>
          <textarea
            className={styles.textarea}
            placeholder="Ajouter une note…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleAdd(e as unknown as FormEvent);
              }
            }}
            rows={1}
            maxLength={2000}
          />
          <button
            type="submit"
            className={styles.addBtn}
            disabled={!draft.trim() || addNote.isPending}
          >
            {addNote.isPending ? "…" : "Ajouter"}
          </button>
        </form>
      )}
    </div>
  );
}
