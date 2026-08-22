import type { Metadata } from "next";
import { Activity } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSelfMetricsSnapshot } from "@/lib/metrics";

export const metadata: Metadata = { title: "Monitoring" };

export default async function MonitoringPage() {
  const snapshot = await getSelfMetricsSnapshot();

  const cards = [
    { label: "Uptime", value: formatUptime(snapshot.uptimeSeconds) },
    { label: "Memory (RSS)", value: formatBytes(snapshot.memoryBytes) },
    { label: "CPU time (process)", value: formatSeconds(snapshot.cpuSeconds) },
    { label: "Event loop lag", value: formatMs(snapshot.eventLoopLagMs) },
    {
      label: "Avg latency (health/OAuth/webhook)",
      value: formatMs(snapshot.avgRouteHandlerLatencyMs),
    },
    { label: "Uncaught errors", value: String(snapshot.uncaughtErrors) },
  ];

  return (
    <div>
      <PageHeader
        title="Monitoring"
        description="This server process's own metrics - the same numbers Prometheus scrapes from /api/metrics, read directly rather than over the network."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                {card.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-muted-foreground mt-6 flex items-center gap-1.5 text-xs">
        <Activity className="size-3.5" />
        Cluster-wide request rate/latency/error-rate (Traefik), container
        CPU/memory (cAdvisor), and dashboards live in Grafana against the
        k3s cluster - not shown here since that data isn&apos;t reachable
        from wherever this page happens to be running. See
        docs/devops-roadmap.md (Phase 15).
      </p>
    </div>
  );
}

function formatUptime(seconds: number | null) {
  if (seconds === null) return "-";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatBytes(bytes: number | null) {
  if (bytes === null) return "-";
  return `${(bytes / 1024 / 1024).toFixed(0)} MB`;
}

function formatSeconds(seconds: number | null) {
  if (seconds === null) return "-";
  return `${seconds.toFixed(1)}s`;
}

function formatMs(ms: number | null) {
  if (ms === null) return "-";
  return `${ms.toFixed(1)} ms`;
}
