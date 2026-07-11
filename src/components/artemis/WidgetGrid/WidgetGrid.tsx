import { useState } from "react";
import { useWidgets } from "@/hooks/use-widgets";
import { useDeleteWidget } from "@/hooks/use-widget-mutations";
import { useIsSportAdmin } from "@/hooks/use-sport";
import { AddWidgetDialog } from "./AddWidgetDialog";
import { WidgetRenderer } from "./WidgetRenderer";
import styles from "./WidgetGrid.module.css";

const SLOT_COUNT = 6;

interface Props {
  dashboardId: string | undefined;
  userId: string;
  isOwner: boolean;
  isGlobalAdmin: boolean;
}

export function WidgetGrid({ dashboardId, userId, isOwner, isGlobalAdmin }: Props) {
  const { data: widgets = [] } = useWidgets(dashboardId);
  const deleteWidget = useDeleteWidget(dashboardId);
  const isSportAdmin = useIsSportAdmin(userId, isGlobalAdmin);
  const [dialogSlot, setDialogSlot] = useState<number | null>(null);

  return (
    <div>
      <div className={styles.sectionTitle}>Espace modulaire</div>
      <div className={styles.grid}>
        {Array.from({ length: SLOT_COUNT }).map((_, idx) => {
          const slot = idx + 1;
          const widget = widgets.find((w) => w.slot === slot);
          if (widget) {
            return (
              <div key={slot} className={styles.populated} style={{ position: "relative" }}>
                {isOwner && (
                  <button
                    onClick={() => {
                      if (confirm("Supprimer ce widget ?")) deleteWidget.mutate(widget.id);
                    }}
                    style={{
                      position: "absolute", top: 8, right: 8,
                      background: "transparent", border: "none",
                      color: "var(--text-dim)", cursor: "pointer",
                      fontSize: 16, lineHeight: 1, padding: 4,
                    }}
                    aria-label="Supprimer le widget"
                    title="Supprimer"
                  >×</button>
                )}
                <WidgetRenderer
                  widgetId={widget.id}
                  type={widget.type}
                  title={widget.title}
                  config={widget.config ?? null}
                  userId={userId}
                  dashboardId={dashboardId}
                  isSportAdmin={isSportAdmin}
                  isGlobalAdmin={isGlobalAdmin}
                  isOwner={isOwner}
                />


              </div>
            );
          }
          return (
            <button
              key={slot}
              className={styles.slot}
              onClick={() => isOwner && setDialogSlot(slot)}
              disabled={!isOwner}
              style={{ cursor: isOwner ? "pointer" : "not-allowed", font: "inherit", color: "inherit" }}
              type="button"
            >
              <div className={styles.slotIcon}>+</div>
              <div className={styles.slotLabel}>{isOwner ? "Ajouter un widget" : "Slot disponible"}</div>
              <div className={styles.slotNumber}>Emplacement #{slot}</div>
            </button>
          );
        })}
      </div>

      <AddWidgetDialog
        open={dialogSlot !== null}
        onOpenChange={(v) => { if (!v) setDialogSlot(null); }}
        slot={dialogSlot}
        dashboardId={dashboardId}
      />
    </div>
  );
}
