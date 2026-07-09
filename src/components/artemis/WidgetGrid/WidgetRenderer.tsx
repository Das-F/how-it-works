import { SportSessionsWidget } from "@/components/artemis/widgets/SportSessions/SportSessionsWidget";
import { CalendarWidget } from "@/components/artemis/widgets/Calendar/CalendarWidget";
import { NotepadWidget } from "@/components/artemis/widgets/Notepad/NotepadWidget";

interface Props {
  widgetId: string;
  type: string;
  title: string | null;
  userId: string;
  dashboardId: string | undefined;
  isSportAdmin: boolean;
  isGlobalAdmin: boolean;
  isOwner: boolean;
}

export function WidgetRenderer({ widgetId, type, title, userId, dashboardId, isSportAdmin, isGlobalAdmin, isOwner }: Props) {
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
    case "notepad":
      return (
        <NotepadWidget
          widgetId={widgetId}
          title={title}
          userId={userId}
          dashboardId={dashboardId}
          canEdit={isOwner || isGlobalAdmin}
        />
      );
    default:
      return (
        <div>
          <div style={{ fontSize: 10, textTransform: "uppercase", color: "var(--orange)" }}>{type}</div>
          <div style={{ fontWeight: 600, marginTop: 8 }}>{title || "Widget"}</div>
        </div>
      );
  }
}


