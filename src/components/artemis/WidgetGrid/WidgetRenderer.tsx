import { SportSessionsWidget } from "@/components/artemis/widgets/SportSessions/SportSessionsWidget";
import { CalendarWidget } from "@/components/artemis/widgets/Calendar/CalendarWidget";

interface Props {
  type: string;
  title: string | null;
  userId: string;
  dashboardId: string | undefined;
  isSportAdmin: boolean;
  isGlobalAdmin: boolean;
}

export function WidgetRenderer({ type, title, userId, dashboardId, isSportAdmin, isGlobalAdmin }: Props) {
  switch (type) {
    case "sport_sessions":
      return (
        <SportSessionsWidget
          userId={userId}
          isSportAdmin={isSportAdmin}
          isGlobalAdmin={isGlobalAdmin}
          title={title}
        />
      );
    case "calendar":
      return <CalendarWidget title={title} dashboardId={dashboardId} />;
    default:
      return (
        <div>
          <div style={{ fontSize: 10, textTransform: "uppercase", color: "var(--orange)" }}>{type}</div>
          <div style={{ fontWeight: 600, marginTop: 8 }}>{title || "Widget"}</div>
        </div>
      );
  }
}

