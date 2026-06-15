import { useWidgets } from "@/hooks/use-widgets";
import styles from "./WidgetGrid.module.css";

const SLOT_COUNT = 4;

interface Props {
  dashboardId: string | undefined;
}

export function WidgetGrid({ dashboardId }: Props) {
  const { data: widgets = [] } = useWidgets(dashboardId);

  return (
    <div>
      <div className={styles.sectionTitle}>Espace modulaire</div>
      <div className={styles.grid}>
        {Array.from({ length: SLOT_COUNT }).map((_, idx) => {
          const slot = idx + 1;
          const widget = widgets.find((w) => w.slot === slot);
          if (widget) {
            return (
              <div key={slot} className={styles.populated}>
                <div className={styles.popType}>{widget.type}</div>
                <div className={styles.popTitle}>{widget.title ?? `Widget ${slot}`}</div>
              </div>
            );
          }
          return (
            <div key={slot} className={styles.slot}>
              <div className={styles.slotIcon}>+</div>
              <div className={styles.slotLabel}>Slot disponible</div>
              <div className={styles.slotNumber}>Emplacement #{slot}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
