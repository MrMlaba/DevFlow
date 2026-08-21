/**
 * Realistic placeholder data for DevOps surfaces that don't have a real
 * backend yet (GitHub integration is Phase 4, CI is Phase 7, deployments
 * are Phase 10, monitoring is Phase 15, incidents are Phase 16). Every page
 * that renders this data shows a <PreviewDataBanner /> so it's never
 * mistaken for something DevFlow actually measured. See docs/devops-roadmap.md.
 */

export interface MockPipeline {
  id: string;
  commitSha: string;
  commitMessage: string;
  branch: string;
  author: string;
  status: "queued" | "running" | "success" | "failed" | "cancelled";
  stages: { name: string; status: "success" | "failed" | "running" | "pending" }[];
  startedAt: string;
  durationSeconds: number;
}

export const MOCK_PIPELINES: MockPipeline[] = [
  {
    id: "run-1042",
    commitSha: "a1b2c3d",
    commitMessage: "Add authentication",
    branch: "main",
    author: "Priya Naidu",
    status: "success",
    stages: [
      { name: "Checkout", status: "success" },
      { name: "Dependencies", status: "success" },
      { name: "Lint", status: "success" },
      { name: "Type Check", status: "success" },
      { name: "Tests", status: "success" },
      { name: "Build", status: "success" },
    ],
    startedAt: hoursAgo(6),
    durationSeconds: 184,
  },
  {
    id: "run-1043",
    commitSha: "e4f5a6b",
    commitMessage: "Kanban board drag-and-drop",
    branch: "feature/kanban-dnd",
    author: "Priya Naidu",
    status: "running",
    stages: [
      { name: "Checkout", status: "success" },
      { name: "Dependencies", status: "success" },
      { name: "Lint", status: "success" },
      { name: "Type Check", status: "running" },
      { name: "Tests", status: "pending" },
      { name: "Build", status: "pending" },
    ],
    startedAt: hoursAgo(0),
    durationSeconds: 61,
  },
  {
    id: "run-1041",
    commitSha: "9c8d7e6",
    commitMessage: "Fix session refresh race condition",
    branch: "fix/session-refresh",
    author: "Priya Naidu",
    status: "failed",
    stages: [
      { name: "Checkout", status: "success" },
      { name: "Dependencies", status: "success" },
      { name: "Lint", status: "success" },
      { name: "Type Check", status: "success" },
      { name: "Tests", status: "failed" },
      { name: "Build", status: "pending" },
    ],
    startedAt: hoursAgo(30),
    durationSeconds: 97,
  },
];

export interface MockEnvironment {
  name: "Development" | "Staging" | "Production";
  version: string;
  commitSha: string;
  status: "healthy" | "degraded" | "down";
  lastDeployment: string;
  deploymentDurationSeconds: number;
  services: { name: string; status: "healthy" | "degraded" | "down" }[];
  requiresApproval: boolean;
}

export const MOCK_ENVIRONMENTS: MockEnvironment[] = [
  {
    name: "Development",
    version: "0.4.0-dev.12",
    commitSha: "e4f5a6b",
    status: "healthy",
    lastDeployment: hoursAgo(1),
    deploymentDurationSeconds: 42,
    services: [
      { name: "Frontend", status: "healthy" },
      { name: "Database", status: "healthy" },
    ],
    requiresApproval: false,
  },
  {
    name: "Staging",
    version: "0.3.2",
    commitSha: "a1b2c3d",
    status: "healthy",
    lastDeployment: hoursAgo(6),
    deploymentDurationSeconds: 58,
    services: [
      { name: "Frontend", status: "healthy" },
      { name: "Database", status: "healthy" },
      { name: "Redis", status: "healthy" },
    ],
    requiresApproval: false,
  },
  {
    name: "Production",
    version: "0.3.1",
    commitSha: "7f2a9c1",
    status: "degraded",
    lastDeployment: daysAgo(2),
    deploymentDurationSeconds: 71,
    services: [
      { name: "Frontend", status: "healthy" },
      { name: "Database", status: "healthy" },
      { name: "Redis", status: "degraded" },
    ],
    requiresApproval: true,
  },
];

export interface MockDeployment {
  id: string;
  environment: MockEnvironment["name"];
  version: string;
  commitSha: string;
  pipelineId: string;
  deployer: string;
  startedAt: string;
  finishedAt: string | null;
  status: "queued" | "deploying" | "successful" | "failed" | "rolled_back";
}

export const MOCK_DEPLOYMENTS: MockDeployment[] = [
  {
    id: "deploy-318",
    environment: "Development",
    version: "0.4.0-dev.12",
    commitSha: "e4f5a6b",
    pipelineId: "run-1043",
    deployer: "Priya Naidu",
    startedAt: hoursAgo(1),
    finishedAt: hoursAgo(1),
    status: "successful",
  },
  {
    id: "deploy-317",
    environment: "Staging",
    version: "0.3.2",
    commitSha: "a1b2c3d",
    pipelineId: "run-1042",
    deployer: "Liam Carter",
    startedAt: hoursAgo(6),
    finishedAt: hoursAgo(6),
    status: "successful",
  },
  {
    id: "deploy-312",
    environment: "Production",
    version: "0.3.1",
    commitSha: "7f2a9c1",
    pipelineId: "run-1030",
    deployer: "Liam Carter",
    startedAt: daysAgo(2),
    finishedAt: daysAgo(2),
    status: "successful",
  },
  {
    id: "deploy-309",
    environment: "Production",
    version: "0.3.0",
    commitSha: "5b1e8d0",
    pipelineId: "run-1024",
    deployer: "Liam Carter",
    startedAt: daysAgo(5),
    finishedAt: daysAgo(5),
    status: "rolled_back",
  },
];

export interface MockMetric {
  label: string;
  value: string;
  trend: "up" | "down" | "flat";
  goodDirection: "up" | "down";
}

export const MOCK_METRICS: MockMetric[] = [
  { label: "Request rate", value: "412 req/min", trend: "up", goodDirection: "up" },
  { label: "P95 latency", value: "218 ms", trend: "flat", goodDirection: "down" },
  { label: "Error rate", value: "0.42%", trend: "up", goodDirection: "down" },
  { label: "CPU usage", value: "38%", trend: "flat", goodDirection: "down" },
  { label: "Memory usage", value: "61%", trend: "up", goodDirection: "down" },
  { label: "DB connections", value: "24 / 100", trend: "flat", goodDirection: "down" },
];

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
