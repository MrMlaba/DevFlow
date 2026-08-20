import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { OrganizationSettingsForm } from "@/features/projects/components/organization-settings-form";
import { getActiveOrganization } from "@/services/organizations";
import { can } from "@/config/permissions";

export const metadata: Metadata = { title: "Organization settings" };

export default async function OrganizationSettingsPage() {
  const active = await getActiveOrganization();
  if (!active || !can(active.role, "organization:manage")) {
    redirect("/settings");
  }

  return (
    <div>
      <PageHeader
        title="Organization settings"
        description="Manage your organization's name and description."
      />
      <OrganizationSettingsForm organization={active.organization} />
    </div>
  );
}
