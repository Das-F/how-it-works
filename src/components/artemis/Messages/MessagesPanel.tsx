import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMessages, useSendMessage, useDeleteMessage } from "@/hooks/use-messages";
import { useAllProfiles } from "@/hooks/use-profile";
import styles from "./MessagesPanel.module.css";

interface Props {
  userId: string;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MessagesPanel({ userId }: Props) {
  const { data: messages, isLoading } = useMessages();
  const { data: profiles } = useAllProfiles();
  const send = useSendMessage(userId);
  const remove = useDeleteMessage();
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const nameFor = (id: string) => {
    const p = profiles?.find((x) => x.id === id);
    if (!p) return "…";
    return p.qualificatif || p.nom || "Anonyme";
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || send.isPending) return;
    send.mutate(draft, {
      onSuccess: () => setDraft(""),
    });
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>💬 Messagerie</span>
        <span className={styles.count}>
          {messages?.length ?? 0} message{(messages?.length ?? 0) > 1 ? "s" : ""}
        </span>
      </div>

      <div ref={scrollRef} className={styles.scroll}>
        {isLoading && <div className={styles.empty}>Chargement…</div>}
        {!isLoading && (!messages || messages.length === 0) && (
          <div className={styles.empty}>
            Aucun message pour le moment. Lance la conversation !
          </div>
        )}
        {messages?.map((m) => {
          const mine = m.sender_id === userId;
          return (
            <div
              key={m.id}
              className={`${styles.row} ${mine ? styles.rowMine : styles.rowOther}`}
            >
              <div
                className={`${styles.bubble} ${mine ? styles.bubbleMine : styles.bubbleOther}`}
              >
                {m.content}
                <span
                  className={`${styles.meta} ${mine ? styles.metaMine : styles.metaOther}`}
                >
                  {mine ? "Moi" : nameFor(m.sender_id)} · {formatTime(m.created_at)}
                  {mine && (
                    <button
                      type="button"
                      className={styles.deleteBtn}
                      onClick={() => remove.mutate(m.id)}
                      aria-label="Supprimer"
                    >
                      ✕
                    </button>
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {send.isError && (
        <div className={styles.error}>
          {(send.error as Error)?.message ?? "Erreur lors de l'envoi"}
        </div>
      )}

      <form className={styles.form} onSubmit={handleSubmit}>
        <input
          type="text"
          className={styles.input}
          placeholder="Écris un message…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={1000}
          disabled={send.isPending}
        />
        <button
          type="submit"
          className={styles.send}
          disabled={!draft.trim() || send.isPending}
        >
          {send.isPending ? "…" : "Envoyer"}
        </button>
      </form>
    </div>
  );
}
