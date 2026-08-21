import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ActivityFeed } from "@/features/activity/components/activity-feed";
import { getActiveOrganization, listOrganizationMembers } from "@/services/organizations";
import { listActivity } from "@/services/activity";
import { listUserProjects } from "@/services/projects";
import { ACTIVITY_EVENT_LABELS, ACTIVITY_EVENT_TYPES } from "@/config/activity";

export const metadata: Metadata = { title: "Activity" };

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{
    actorId?: string;
    eventType?: string;
    projectId?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const active = await getActiveOrganization();
  const params = await searchParams;
  const hasFilters = Boolean(
    params.actorId || params.eventType || params.projectId || params.from || params.to,
  );

  if (!active) {
    return (
      <div>
        <PageHeader title="Activity" />
        <ActivityFeed events={[]} />
      </div>
    );
  }

  const [events, members, projects] = await Promise.all([
    listActivity({
      organizationId: active.organization.id,
      projectId: params.projectId || undefined,
      actorId: params.actorId || undefined,
      eventType: params.eventType || undefined,
      from: params.from ? new Date(params.from).toISOString() : undefined,
      to: params.to ? new Date(params.to + "T23:59:59").toISOString() : undefined,
      limit: 100,
    }),
    listOrganizationMembers(active.organization.id),
    listUserProjects(),
  ]);

  return (
    <div>
      <PageHeader
        title="Activity"
        description="A timeline of everything that's happened across your organization."
      />

      <form className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border bg-card p-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="actorId" className="text-muted-foreground text-xs">
            User
          </label>
          <select
            id="actorId"
            name="actorId"
            defaultValue={params.actorId ?? ""}
            className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
          >
            <option value="">Everyone</option>
            {members.map((m) => (
              <option key={m.profile.id} value={m.profile.id}>
                {m.profile.full_name ?? m.profile.email}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="eventType" className="text-muted-foreground text-xs">
            Event type
          </label>
          <select
            id="eventType"
            name="eventType"
            defaultValue={params.eventType ?? ""}
            className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
          >
            <option value="">All events</option>
            {ACTIVITY_EVENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {ACTIVITY_EVENT_LABELS[type]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="projectId" className="text-muted-foreground text-xs">
            Project
          </label>
          <select
            id="projectId"
            name="projectId"
            defaultValue={params.projectId ?? ""}
            className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
          >
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.project.id} value={p.project.id}>
                {p.project.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="from" className="text-muted-foreground text-xs">
            From
          </label>
          <input
            id="from"
            type="date"
            name="from"
            defaultValue={params.from ?? ""}
            className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="to" className="text-muted-foreground text-xs">
            To
          </label>
          <input
            id="to"
            type="date"
            name="to"
            defaultValue={params.to ?? ""}
            className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
          />
        </div>
        <Button type="submit" size="sm">
          Filter
        </Button>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<a href="/activity" />}
          >
            Clear
          </Button>
        )}
      </form>

      <div className="max-w-2xl">
        <ActivityFeed events={events} />
      </div>
    </div>
  );
}
