import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listUserProjects, listProjectMembers } from "@/services/projects";
import { listIncidentUpdates, listVisibleIncidents } from "@/services/incidents";
import { INCIDENT_SEVERITY_META } from "@/config/status";
import { formatRelativeTime } from "@/lib/utils";
import { CreateIncidentDialog } from "@/features/incidents/components/create-incident-dialog";
import { IncidentStatusSelect } from "@/features/incidents/components/incident-status-select";
import { IncidentAssigneeSelect } from "@/features/incidents/components/incident-assignee-select";
import { AddIncidentUpdateDialog } from "@/features/incidents/components/add-incident-update-dialog";
import { IncidentTimeline } from "@/features/incidents/components/incident-timeline";

export const metadata: Metadata = { title: "Incidents" };

export default async function IncidentsPage() {
  const [incidents, projectsWithRole] = await Promise.all([
    listVisibleIncidents(),
    listUserProjects(),
  ]);

  const projectIds = [...new Set(incidents.map((i) => i.project_id))];
  const [membersByProject, updatesByIncident] = await Promise.all([
    Promise.all(projectIds.map((id) => listProjectMembers(id))),
    Promise.all(incidents.map((i) => listIncidentUpdates(i.id))),
  ]);
  const membersMap = new Map(projectIds.map((id, i) => [id, membersByProject[i]!]));

  const resolved = incidents.filter((i) => i.status === "resolved" && i.resolved_at);
  const mttrHours =
    resolved.length === 0
      ? null
      : Math.round(
          resolved.reduce((sum, i) => {
            const start = new Date(i.detected_at).getTime();
            const end = new Date(i.resolved_at!).getTime();
            return sum + (end - start) / 1000 / 60 / 60;
          }, 0) / resolved.length,
        );

  return (
    <div>
      <PageHeader
        title="Incidents"
        description="Production incidents, from detection to resolution."
        actions={
          <CreateIncidentDialog
            projects={projectsWithRole.map(({ project }) => ({
              id: project.id,
              name: project.name,
            }))}
          />
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Open incidents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {incidents.filter((i) => i.status !== "resolved").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Total incidents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{incidents.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">MTTR</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {mttrHours === null ? "-" : `${mttrHours}h`}
            </p>
          </CardContent>
        </Card>
      </div>

      {incidents.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="No incidents"
          description="Nothing reported yet - or this project's operations genuinely haven't hit a snag."
        />
      ) : (
        <div className="space-y-3">
          {incidents.map((incident, index) => {
            const severity = INCIDENT_SEVERITY_META[incident.severity];
            const members = (membersMap.get(incident.project_id) ?? []).map((m) => ({
              id: m.profile.id,
              name: m.profile.full_name ?? m.profile.email,
            }));
            const updates = updatesByIncident[index]!;

            return (
              <Card key={incident.id}>
                <CardContent className="space-y-3 pt-6">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="text-muted-foreground size-4" />
                        <span className="font-medium">{incident.title}</span>
                      </div>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {incident.project.name}
                        {incident.service ? ` · ${incident.service}` : ""} · detected{" "}
                        {formatRelativeTime(incident.detected_at)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge tone={severity.tone}>{severity.label}</StatusBadge>
                      <IncidentStatusSelect incidentId={incident.id} status={incident.status} />
                      <IncidentAssigneeSelect
                        incidentId={incident.id}
                        assigneeId={incident.assignee_id}
                        members={members}
                      />
                    </div>
                  </div>
                  {incident.description && <p className="text-sm">{incident.description}</p>}
                  {incident.related_deployment && (
                    <p className="text-sm">
                      <span className="font-medium">Related deployment: </span>
                      {incident.related_deployment}
                    </p>
                  )}
                  {incident.root_cause && (
                    <p className="text-sm">
                      <span className="font-medium">Root cause: </span>
                      {incident.root_cause}
                    </p>
                  )}
                  {incident.resolution && (
                    <p className="text-sm">
                      <span className="font-medium">Resolution: </span>
                      {incident.resolution}
                    </p>
                  )}
                  <IncidentTimeline updates={updates} />
                  <div className="flex justify-end">
                    <AddIncidentUpdateDialog
                      incidentId={incident.id}
                      currentSeverity={incident.severity}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
