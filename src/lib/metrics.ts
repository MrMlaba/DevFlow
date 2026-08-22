import "server-only";
import {
  Counter,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from "prom-client";

/**
 * Cached on globalThis, not a module-level const: Next.js dev mode
 * recompiles this module on every hot reload (a fresh module instance each
 * time), but prom-client's Registry throws "metric already registered" if
 * the same metric name is registered twice against the same process. The
 * globalThis cache survives across those recompiles the way a real restart
 * wouldn't.
 *
 * Deliberately NOT imported from proxy.ts: confirmed by testing (see
 * docs/devops-roadmap.md Phase 15) that proxy.ts runs in an isolated
 * context even when self-hosted - a counter incremented there never shows
 * up in a registry read from a route handler, matching the Next.js docs'
 * warning against relying on shared modules/globals in Proxy. Route
 * handlers and instrumentation.ts's onRequestError, by contrast, were
 * verified to share this registry correctly.
 */
declare global {
  var __devflowMetrics: ReturnType<typeof createMetrics> | undefined;
}

function createMetrics() {
  const registry = new Registry();
  collectDefaultMetrics({ register: registry });

  const httpRequestDurationSeconds = new Histogram({
    name: "devflow_route_handler_duration_seconds",
    help: "Duration of route.ts handlers wrapped with withMetrics, labeled by route and final status code.",
    labelNames: ["route", "method", "status"] as const,
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers: [registry],
  });

  const requestErrorsTotal = new Counter({
    name: "devflow_request_errors_total",
    help: "Uncaught server errors, labeled by where they occurred (instrumentation.ts onRequestError).",
    labelNames: ["route_type", "route_path"] as const,
    registers: [registry],
  });

  return {
    registry,
    httpRequestDurationSeconds,
    requestErrorsTotal,
  };
}

export const metrics = (globalThis.__devflowMetrics ??= createMetrics());

const UUID_SEGMENT =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

/**
 * Collapses per-record path segments (e.g. /projects/<uuid>/settings) to a
 * placeholder before using a path as a Prometheus label - otherwise every
 * distinct project ID becomes its own label value/time series, which is
 * the classic Prometheus cardinality-explosion mistake.
 */
export function normalizeRoute(pathname: string): string {
  return pathname.replace(UUID_SEGMENT, ":id");
}

/**
 * Real numbers for the in-app Monitoring page (src/app/(dashboard)/monitoring),
 * read straight out of this same process's registry - no network hop to
 * Prometheus, so it works identically wherever DevFlow is actually running
 * (Vercel, the EC2 instance, k3s), not just when a developer happens to have
 * `kubectl port-forward` open to the k3s-only Prometheus/Grafana this phase
 * also built. Deliberately snapshot values (a single reading), not rates -
 * a rate needs two points in time, which a single page render can't cheaply
 * produce without its own storage. "Average" latency (sum/count), not a
 * percentile: computing a real percentile means aggregating histogram
 * buckets across every route label first, more precision than a quick
 * snapshot card needs.
 */
export async function getSelfMetricsSnapshot() {
  const errors = await metrics.requestErrorsTotal.get();
  const errorCount = errors.values.reduce((sum, v) => sum + v.value, 0);

  const durations = await metrics.httpRequestDurationSeconds.get();
  const sum = durations.values.find((v) => v.metricName?.endsWith("_sum"));
  const count = durations.values.find((v) => v.metricName?.endsWith("_count"));
  const healthCount = durations.values.find(
    (v) => v.metricName?.endsWith("_count") && v.labels.route === "/api/health",
  );

  const memory = await metrics.registry.getSingleMetric("process_resident_memory_bytes")?.get();
  const memoryBytes = memory?.values[0]?.value ?? null;

  const cpu = await metrics.registry.getSingleMetric("process_cpu_seconds_total")?.get();
  const cpuSeconds = cpu?.values[0]?.value ?? null;

  const eventLoopLag = await metrics.registry.getSingleMetric("nodejs_eventloop_lag_seconds")?.get();
  const eventLoopLagMs = eventLoopLag ? eventLoopLag.values[0]!.value * 1000 : null;

  const startTime = await metrics.registry.getSingleMetric("process_start_time_seconds")?.get();
  const uptimeSeconds = startTime
    ? Date.now() / 1000 - startTime.values[0]!.value
    : null;

  return {
    uptimeSeconds,
    memoryBytes,
    cpuSeconds,
    eventLoopLagMs,
    avgRouteHandlerLatencyMs:
      sum && count && count.value > 0 ? (sum.value / count.value) * 1000 : null,
    healthChecksServed: healthCount?.value ?? 0,
    uncaughtErrors: errorCount,
  };
}

/**
 * Wraps a route.ts handler to record real status code and duration -
 * accurate because, unlike proxy.ts, a route handler sees the actual
 * Response it returns. Use for endpoints worth watching individually
 * (probed constantly, or an external integration point); not applied
 * project-wide since most of the app is Server Actions, which this can't
 * wrap the same way.
 */
export function withMetrics<Args extends unknown[]>(
  route: string,
  handler: (request: Request, ...args: Args) => Promise<Response>,
) {
  return async (request: Request, ...args: Args): Promise<Response> => {
    const stop = metrics.httpRequestDurationSeconds.startTimer({
      route,
      method: request.method,
    });
    let status = 500;
    try {
      const response = await handler(request, ...args);
      status = response.status;
      return response;
    } finally {
      stop({ status: String(status) });
    }
  };
}
