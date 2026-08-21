import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getActiveOrganization, listOrganizationMembers } from "@/services/organizations";
import { listAuditLog } from "@/services/audit";
import { can } from "@/config/permissions";
import { AUDIT_ACTIONS, AUDIT_ACTION_LABELS } from "@/config/audit";
import { initials, formatRelativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Audit log" };

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ actorId?: string; action?: string; from?: string; to?: string }>;
}) {
  const active = await getActiveOrganization();
  if (!active || !can(active.role, "organization:manage")) {
    redirect("/settings");
  }

  const params = await searchParams;
  const [entries, members] = await Promise.all([
    listAuditLog({
      organizationId: active.organization.id,
      actorId: params.actorId || undefined,
      action: params.action || undefined,
      from: params.from ? new Date(params.from).toISOString() : undefined,
      to: params.to ? new Date(params.to + "T23:59:59").toISOString() : undefined,
    }),
    listOrganizationMembers(active.organization.id),
  ]);

  const hasFilters = Boolean(params.actorId || params.action || params.from || params.to);

  return (
    <div>
      <PageHeader
        title="Audit log"
        description="Security-sensitive actions: logins, role and membership changes, deletions. Visible to organization administrators only."
      />

      <form className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border bg-card p-3">
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
          <label htmlFor="action" className="text-muted-foreground text-xs">
            Action
          </label>
          <select
            id="action"
            name="action"
            defaultValue={params.action ?? ""}
            className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
          >
            <option value="">All actions</option>
            {AUDIT_ACTIONS.map((action) => (
              <option key={action} value={action}>
                {AUDIT_ACTION_LABELS[action]}
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
            render={<a href="/settings/audit-log" />}
          >
            Clear
          </Button>
        )}
      </form>

      {entries.length === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title={hasFilters ? "No matching entries" : "No audit entries yet"}
          description={
            hasFilters
              ? "Try widening your filters."
              : "Sign-ins, role changes, membership changes, and deletions will show up here."
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    {entry.actor ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="size-6">
                          <AvatarImage src={entry.actor.avatar_url ?? undefined} alt="" />
                          <AvatarFallback className="text-[10px]">
                            {initials(entry.actor.full_name ?? entry.actor.email)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          {entry.actor.full_name ?? entry.actor.email}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">Unknown</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal">
                      {AUDIT_ACTION_LABELS[entry.action] ?? entry.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-md text-sm">{entry.description}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatRelativeTime(entry.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
