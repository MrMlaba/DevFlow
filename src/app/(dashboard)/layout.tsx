import { requireProfile } from "@/services/auth";
import { getActiveOrganization } from "@/services/organizations";
import { Sidebar } from "@/features/navigation/components/sidebar";
import { Topbar } from "@/features/navigation/components/topbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();
  const active = await getActiveOrganization();

  return (
    <div className="flex min-h-screen">
      <Sidebar organization={active?.organization ?? null} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar profile={profile} />
        <main className="flex-1 overflow-x-hidden bg-muted/20 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
