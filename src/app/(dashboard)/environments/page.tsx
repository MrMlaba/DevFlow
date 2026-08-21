import type { Metadata } from "next";
import { Laptop, ShieldCheck } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listUserProjects } from "@/services/projects";
import { listVisibleDeployments, type DeploymentRecord } from "@/services/github";
import { DEPLOYMENT_STATUS_META } from "@/config/status";
import { formatRelativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Environments" };

export default async function EnvironmentsPage() {
  const projects = await listUserProjects();
  const deployments = await listVisibleDeployments(projects.map((p) => p.project));

  // Already sorted newest-first by listVisibleDeployments - the first
  // match per environment name is its latest deployment.
  const staging = deployments.find((d) => d.environment === "staging");
  const production = deployments.find((d) => d.environment === "production");

  return (
    <div>
      <PageHeader
        title="Environments"
        description="Development, Staging, and Production at a glance."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Development</CardTitle>
            <Laptop className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Your own machine - <code className="text-xs">npm run dev</code>. Not hosted; every
              phase of this project has run here first.
            </p>
          </CardContent>
        </Card>

        <EnvironmentCard
          name="Staging"
          deployment={staging}
          description="A Vercel Preview deployment - auto-deploys on every push to main."
        />
        <EnvironmentCard
          name="Production"
          deployment={production}
          requiresApproval
          description="A Vercel Production deployment - gated behind a required reviewer in GitHub."
        />
      </div>
    </div>
  );
}

function EnvironmentCard({
  name,
  deployment,
  description,
  requiresApproval,
}: {
  name: string;
  deployment: DeploymentRecord | undefined;
  description: string;
  requiresApproval?: boolean;
}) {
  const status = deployment ? DEPLOYMENT_STATUS_META[deployment.status] : null;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">{name}</CardTitle>
        {status && <StatusBadge tone={status.tone}>{status.label}</StatusBadge>}
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-muted-foreground text-xs">{description}</p>
        {deployment ? (
          <>
            <p className="font-mono text-xs">{deployment.commitSha}</p>
            <p className="text-muted-foreground text-xs">
              Last deployed {formatRelativeTime(deployment.createdAt)} by {deployment.deployedBy}
            </p>
            {deployment.environmentUrl && (
              <a
                href={deployment.environmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary text-xs hover:underline"
              >
                Visit deployment
              </a>
            )}
          </>
        ) : (
          <p className="text-muted-foreground text-sm">Not deployed yet.</p>
        )}
        {requiresApproval && (
          <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
            <ShieldCheck className="size-3.5" />
            Requires deployment approval
          </p>
        )}
      </CardContent>
    </Card>
  );
}
