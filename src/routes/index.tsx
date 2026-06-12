import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useProfile } from "@/hooks/use-profile";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { DashboardLayout } from "@/components/artemis/Layout/DashboardLayout";
import { Header } from "@/components/artemis/Header/Header";
import { PostItWidget } from "@/components/artemis/PostIt/PostItWidget";
import { WidgetGrid } from "@/components/artemis/WidgetGrid/WidgetGrid";
import { GalleryColumn } from "@/components/artemis/Gallery/GalleryColumn";
import { MessagesPanel } from "@/components/artemis/Messages/MessagesPanel";

export const Route = createFileRoute("/")({
  ssr: false,
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

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", replace: true });
  }, [loading, user, navigate]);

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

  return (
    <DashboardLayout
      header={
        <Header
          qualificatif={profile?.qualificatif}
          nom={profile?.nom}
          isAdmin={!!isAdmin}
        />
      }
      left={<PostItWidget isAdmin={!!isAdmin} userId={user.id} />}
      center={
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", minWidth: 0 }}>
          <WidgetGrid />
          <MessagesPanel userId={user.id} />
        </div>
      }
      right={<GalleryColumn userId={user.id} />}
    />
  );
}
