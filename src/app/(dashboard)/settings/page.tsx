import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "@/features/auth/components/profile-form";
import { requireProfile } from "@/services/auth";
import { getActiveOrganization } from "@/services/organizations";
import { can } from "@/config/permissions";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const profile = await requireProfile();
  const active = await getActiveOrganization();

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Settings" description="Manage your account." />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm profile={profile} />
        </CardContent>
      </Card>

      {active && can(active.role, "organization:manage") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Organization</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{active.organization.name}</p>
              <p className="text-muted-foreground text-xs">
                devflow.app/{active.organization.slug}
              </p>
            </div>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/settings/organization" />}
            >
              Manage
            </Button>
          </CardContent>
        </Card>
      )}

      {active && can(active.role, "organization:manage") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Audit log</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              Logins, role and membership changes, and deletions.
            </p>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/settings/audit-log" />}
            >
              View
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
