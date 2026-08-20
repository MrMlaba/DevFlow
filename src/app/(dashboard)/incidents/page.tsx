import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { PreviewDataBanner } from "@/components/preview-data-banner";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MOCK_INCIDENTS } from "@/lib/mock-data";
import { INCIDENT_SEVERITY_META, INCIDENT_STATUS_META } from "@/config/status";
import { formatRelativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Incidents" };

export default function IncidentsPage() {
  const resolved = MOCK_INCIDENTS.filter((i) => i.status === "resolved");
  const mttrHours =
    resolved.length === 0
      ? null
      : Math.round(
          resolved.reduce((sum, i) => {
            const start = new Date(i.startedAt).getTime();
            const end = new Date(i.resolvedAt ?? i.startedAt).getTime();
            return sum + (end - start) / 1000 / 60 / 60;
          }, 0) / resolved.length,
        );

  return (
    <div>
      <PageHeader
        title="Incidents"
        description="Production incidents, from detection to resolution."
      />
      <PreviewDataBanner phase="Phase 16 (Incident Management)" />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Open incidents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {MOCK_INCIDENTS.filter((i) => i.status !== "resolved").length}
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
            <p className="text-2xl font-semibold">{MOCK_INCIDENTS.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              MTTR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {mttrHours === null ? "-" : `${mttrHours}h`}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        {MOCK_INCIDENTS.map((incident) => {
          const status = INCIDENT_STATUS_META[incident.status];
          const severity = INCIDENT_SEVERITY_META[incident.severity];
          return (
            <Card key={incident.id}>
              <CardContent className="space-y-3 pt-6">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="text-muted-foreground size-4" />
                      <span className="font-medium">
                        #{incident.id} {incident.title}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {incident.service} · assigned to {incident.assignee} · detected{" "}
                      {formatRelativeTime(incident.detectedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <StatusBadge tone={severity.tone}>{severity.label}</StatusBadge>
                    <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                  </div>
                </div>
                <p className="text-sm">{incident.description}</p>
                {incident.rootCause && (
                  <p className="text-sm">
                    <span className="font-medium">Root cause: </span>
                    {incident.rootCause}
                  </p>
                )}
                {incident.resolution && (
                  <p className="text-sm">
                    <span className="font-medium">Resolution: </span>
                    {incident.resolution}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
