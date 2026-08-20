import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { ActivityFeed } from "@/features/activity/components/activity-feed";
import { getActiveOrganization } from "@/services/organizations";
import { listActivity } from "@/services/activity";

export const metadata: Metadata = { title: "Activity" };

export default async function ActivityPage() {
  const active = await getActiveOrganization();
  const events = active
    ? await listActivity({ organizationId: active.organization.id, limit: 100 })
    : [];

  return (
    <div>
      <PageHeader
        title="Activity"
        description="A timeline of everything that's happened across your organization."
      />
      <div className="max-w-2xl">
        <ActivityFeed events={events} />
      </div>
    </div>
  );
}
