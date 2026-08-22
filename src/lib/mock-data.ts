/**
 * Realistic placeholder data for DevOps surfaces that don't have a real
 * backend yet (incidents are Phase 16). Every page that renders this data
 * shows a <PreviewDataBanner /> so it's never mistaken for something
 * DevFlow actually measured. See docs/devops-roadmap.md.
 */

export interface MockIncident {
  id: number;
  title: string;
  severity: "low" | "medium" | "high" | "critical";
  service: string;
  status: "investigating" | "identified" | "monitoring" | "resolved";
  description: string;
  assignee: string;
  startedAt: string;
  detectedAt: string;
  resolvedAt: string | null;
  rootCause?: string;
  resolution?: string;
  relatedDeployment?: string;
}

export const MOCK_INCIDENTS: MockIncident[] = [
  {
    id: 27,
    title: "Backend Production Failure",
    severity: "high",
    service: "Backend API",
    status: "resolved",
    description:
      "Error rate on the backend jumped from 0.3% to 8% shortly after a production deploy.",
    assignee: "Liam Carter",
    startedAt: daysAgo(4),
    detectedAt: daysAgo(4),
    resolvedAt: daysAgo(4),
    rootCause:
      "A missing environment variable caused the new rate-limiter middleware to fail open on every request.",
    resolution: "Rolled back deploy-309, added the missing variable, redeployed.",
    relatedDeployment: "deploy-309",
  },
  {
    id: 28,
    title: "Redis latency spike on Production",
    severity: "medium",
    service: "Redis",
    status: "monitoring",
    description: "Cache hit latency is elevated; investigating a noisy-neighbor cause.",
    assignee: "Sipho Dlamini",
    startedAt: hoursAgo(20),
    detectedAt: hoursAgo(20),
    resolvedAt: null,
  },
];

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

function hoursAgo(n: number) {
  return new Date(Date.now() - n * 60 * 60 * 1000).toISOString();
}
