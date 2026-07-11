import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { z } from "zod";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useProfile } from "@/hooks/use-profile";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { useDashboards } from "@/hooks/use-dashboards";
import { DashboardLayout } from "@/components/artemis/Layout/DashboardLayout";
import { Header } from "@/components/artemis/Header/Header";
import { PostItWidget } from "@/components/artemis/PostIt/PostItWidget";
import { WidgetGrid } from "@/components/artemis/WidgetGrid/WidgetGrid";
import { GalleryColumn } from "@/components/artemis/Gallery/GalleryColumn";
import { MessagesPanel } from "@/components/artemis/Messages/MessagesPanel";
import { DashboardSwitcher } from "@/components/artemis/DashboardSwitcher/DashboardSwitcher";
import { MembersPanel } from "@/components/artemis/DashboardSwitcher/MembersPanel";

const searchSchema = z.object({
  dashboard: z.string().uuid().optional(),
});

export const Route = createFileRoute("/")({
  ssr: false,
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Artemis Community" },
      { name: "description", content: "Dashboard personnel modulable de la communauté Artemis." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const { user, loading } = useAuthUser();
  const { data: profile } = useProfile(user?.id);
  const { data: isAdmin } = useIsAdmin(user?.id);
  const { data: dashboards = [] } = useDashboards(user?.id);
  const { dashboard: dashboardParam } = Route.useSearch();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", replace: true });
  }, [loading, user, navigate]);

  // Pick active dashboard: URL param if valid, else personal, else first available
  const activeDashboard = useMemo(() => {
    if (!dashboards.length) return undefined;
    if (dashboardParam) {
      const match = dashboards.find((d) => d.id === dashboardParam);
      if (match) return match;
    }
    return dashboards.find((d) => d.is_personal) ?? dashboards[0];
  }, [dashboards, dashboardParam]);

  // Persist active dashboard in URL once resolved
  useEffect(() => {
    if (activeDashboard && activeDashboard.id !== dashboardParam) {
      navigate({ to: "/", search: { dashboard: activeDashboard.id }, replace: true });
    }
  }, [activeDashboard, dashboardParam, navigate]);

  if (loading || !user) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        color: "var(--text-muted)",
      }}>
        Chargement...
      </div>
    );
  }

  const isOwner = !!activeDashboard && activeDashboard.owner_id === user.id;
  const dashboardId = activeDashboard?.id;

  return (
    <DashboardLayout
      header={
        <Header
          userId={user.id}
          qualificatif={profile?.qualificatif}
          nom={profile?.nom}
          isAdmin={!!isAdmin}
          switcher={
            <DashboardSwitcher
              userId={user.id}
              activeDashboardId={dashboardId}
              isAdmin={!!isAdmin}
            />
          }
        />

      }
      left={
        <>
          <PostItWidget isOwner={isOwner} userId={user.id} dashboardId={dashboardId} />
          {isOwner && activeDashboard && !activeDashboard.is_personal && (
            <MembersPanel
              dashboardId={activeDashboard.id}
              ownerId={activeDashboard.owner_id}
              userId={user.id}
            />
          )}
          <MessagesPanel userId={user.id} dashboardId={dashboardId} />
        </>
      }
      center={
        <WidgetGrid
          dashboardId={dashboardId}
          userId={user.id}
          isOwner={isOwner}
          isGlobalAdmin={!!isAdmin}
        />
      }
      right={
        <GalleryColumn
          userId={user.id}
          dashboardId={dashboardId}
          driveUrl={activeDashboard?.google_drive_url ?? null}
          canEditDrive={isOwner}
        />
      }
    />
  );
}
