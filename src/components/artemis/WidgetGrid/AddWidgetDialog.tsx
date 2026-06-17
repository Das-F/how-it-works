import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAddWidget } from "@/hooks/use-widget-mutations";
import styles from "./AddWidgetDialog.module.css";

export const WIDGET_CATALOG = [
  {
    type: "sport_sessions",
    icon: "🏃",
    name: "Sessions de sport",
    description: "Agenda des sessions lundi & jeudi (18h30–20h45) avec présences des membres.",
  },
  {
    type: "calendar",
    icon: "📅",
    name: "Calendrier",
    description: "Vue mensuelle simple pour repérer rapidement les jours.",
  },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  slot: number | null;
  dashboardId: string | undefined;
}

export function AddWidgetDialog({ open, onOpenChange, slot, dashboardId }: Props) {
  const addWidget = useAddWidget(dashboardId);
  const [title, setTitle] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const handleAdd = async (type: string) => {
    if (slot === null) return;
    try {
      await addWidget.mutateAsync({ slot, type, title });
      setTitle("");
      setSelected(null);
      onOpenChange(false);
    } catch (e) {
      alert((e as Error).message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={styles.content}>
        <DialogHeader>
          <DialogTitle>Ajouter un widget</DialogTitle>
          <DialogDescription>Choisis un widget à placer dans l'emplacement #{slot}</DialogDescription>
        </DialogHeader>

        <input
          type="text"
          className={styles.input}
          placeholder="Titre personnalisé (optionnel)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <div className={styles.list}>
          {WIDGET_CATALOG.map((w) => (
            <button
              key={w.type}
              className={`${styles.card} ${selected === w.type ? styles.cardSelected : ""}`}
              onClick={() => setSelected(w.type)}
              type="button"
            >
              <div className={styles.icon}>{w.icon}</div>
              <div className={styles.cardBody}>
                <div className={styles.cardTitle}>{w.name}</div>
                <div className={styles.cardDesc}>{w.description}</div>
              </div>
            </button>
          ))}
        </div>

        <div className={styles.footer}>
          <button className={styles.cancel} onClick={() => onOpenChange(false)} type="button">
            Annuler
          </button>
          <button
            className={styles.add}
            onClick={() => selected && handleAdd(selected)}
            disabled={!selected || addWidget.isPending}
            type="button"
          >
            {addWidget.isPending ? "…" : "Ajouter"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
