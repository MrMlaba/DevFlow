import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { PreviewDataBanner } from "@/components/preview-data-banner";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MOCK_ENVIRONMENTS } from "@/lib/mock-data";
import { HEALTH_STATUS_META } from "@/config/status";
import { formatRelativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Environments" };

export default function EnvironmentsPage() {
  return (
    <div>
      <PageHeader
        title="Environments"
        description="Development, Staging, and Production at a glance."
      />
      <PreviewDataBanner phase="Phase 10 (Deployment Environments)" />
      <div className="grid gap-4 sm:grid-cols-3">
        {MOCK_ENVIRONMENTS.map((env) => {
          const status = HEALTH_STATUS_META[env.status];
          return (
            <Card key={env.name}>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">{env.name}</CardTitle>
                <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">
                  <p className="font-mono text-xs">{env.version}</p>
                  <p className="text-muted-foreground text-xs">{env.commitSha}</p>
                </div>
                <div className="space-y-1.5">
                  {env.services.map((service) => {
                    const serviceStatus = HEALTH_STATUS_META[service.status];
                    return (
                      <div
                        key={service.name}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-muted-foreground">{service.name}</span>
                        <StatusBadge tone={serviceStatus.tone}>
                          {serviceStatus.label}
                        </StatusBadge>
                      </div>
                    );
                  })}
                </div>
                <p className="text-muted-foreground text-xs">
                  Last deployed {formatRelativeTime(env.lastDeployment)} ·{" "}
                  {env.deploymentDurationSeconds}s
                </p>
                {env.requiresApproval && (
                  <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                    <ShieldCheck className="size-3.5" />
                    Requires deployment approval
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
