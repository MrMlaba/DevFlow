import type { Metadata } from "next";
import { Rocket } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listUserProjects } from "@/services/projects";
import { listVisibleDeployments } from "@/services/github";
import { DEPLOYMENT_STATUS_META } from "@/config/status";
import { formatRelativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Deployments" };

export default async function DeploymentsPage() {
  const projects = await listUserProjects();
  const deployments = await listVisibleDeployments(projects.map((p) => p.project));

  return (
    <div>
      <PageHeader
        title="Deployments"
        description="Deployment history across Staging and Production, synced live from GitHub."
      />
      {deployments.length === 0 ? (
        <EmptyState
          icon={Rocket}
          title="No deployments yet"
          description="Push to main once .github/workflows/deploy.yml and its Vercel secrets are set up (Settings -> Secrets and variables -> Actions)."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Environment</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Commit</TableHead>
                <TableHead>Deployer</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deployments.map((d) => {
                const status = DEPLOYMENT_STATUS_META[d.status];
                return (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium capitalize">{d.environment}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {d.projectName}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{d.commitSha}</TableCell>
                    <TableCell className="text-sm">{d.deployedBy}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatRelativeTime(d.createdAt)}
                    </TableCell>
                    <TableCell>
                      {d.environmentUrl ? (
                        <a href={d.environmentUrl} target="_blank" rel="noopener noreferrer">
                          <StatusBadge tone={status.tone} className="hover:underline">
                            {status.label}
                          </StatusBadge>
                        </a>
                      ) : (
                        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
