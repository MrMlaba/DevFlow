import type { Metadata } from "next";
import { Rocket } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { PreviewDataBanner } from "@/components/preview-data-banner";
import { StatusBadge } from "@/components/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MOCK_DEPLOYMENTS } from "@/lib/mock-data";
import { DEPLOYMENT_STATUS_META } from "@/config/status";
import { formatRelativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Deployments" };

export default function DeploymentsPage() {
  return (
    <div>
      <PageHeader
        title="Deployments"
        description="Deployment history across Development, Staging, and Production."
      />
      <PreviewDataBanner phase="Phase 10 (Deployment Environments)" />
      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Rocket className="size-4" />
              </TableHead>
              <TableHead>Environment</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Commit</TableHead>
              <TableHead>Deployer</TableHead>
              <TableHead>Started</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_DEPLOYMENTS.map((d) => {
              const status = DEPLOYMENT_STATUS_META[d.status];
              return (
                <TableRow key={d.id}>
                  <TableCell className="text-muted-foreground text-xs">{d.id}</TableCell>
                  <TableCell className="font-medium">{d.environment}</TableCell>
                  <TableCell className="font-mono text-xs">{d.version}</TableCell>
                  <TableCell className="font-mono text-xs">{d.commitSha}</TableCell>
                  <TableCell className="text-sm">{d.deployer}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatRelativeTime(d.startedAt)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
