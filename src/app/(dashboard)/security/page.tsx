import type { Metadata } from "next";
import { ShieldAlert, ShieldCheck } from "lucide-react";

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
import { listVisibleSecurityFindings } from "@/services/github";
import { SECURITY_FINDING_STATUS_META, SECURITY_SEVERITY_META } from "@/config/status";
import { formatRelativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Security" };

export default async function SecurityPage() {
  const projects = await listUserProjects();
  const findings = await listVisibleSecurityFindings(projects.map((p) => p.project));

  return (
    <div>
      <PageHeader
        title="Security"
        description="Findings from Semgrep, Gitleaks, Trivy, and Dependabot, synced live from GitHub."
      />
      {findings.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No open findings"
          description="Connect a GitHub repository to a project (Settings tab) with .github/workflows/security.yml, then push a commit - or this project's scanners genuinely found nothing to report."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Finding</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Detected</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {findings.map((finding) => {
                const severity = SECURITY_SEVERITY_META[finding.severity];
                const status = SECURITY_FINDING_STATUS_META[finding.status];
                return (
                  <TableRow key={finding.id}>
                    <TableCell className="max-w-sm">
                      <a
                        href={finding.htmlUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="line-clamp-1 font-medium hover:underline"
                        title={finding.recommendation}
                      >
                        {finding.title}
                      </a>
                      <p className="text-muted-foreground text-xs">{finding.source}</p>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {finding.projectName}
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={severity.tone}>{severity.label}</StatusBadge>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate font-mono text-xs">
                      {finding.location}
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatRelativeTime(finding.detectedAt)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <p className="text-muted-foreground flex items-center gap-1.5 border-t px-4 py-2 text-xs">
            <ShieldAlert className="size-3.5" />
            Reporting only for now - findings don&apos;t block CI yet. See
            docs/devops-roadmap.md (Phase 8).
          </p>
        </div>
      )}
    </div>
  );
}
