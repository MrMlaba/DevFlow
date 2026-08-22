import { env } from "@/config/env";
import { metrics } from "@/lib/metrics";

/**
 * Prometheus scrape target. The Ingress (kubernetes/ingress.yaml) routes
 * every path to this app, so without a check here this would be public -
 * gated by a shared bearer token (Prometheus's scrape config supplies it,
 * see kubernetes/monitoring/prometheus-configmap.yaml) instead of leaving
 * it open, same instinct as the webhook route's HMAC check. Unset
 * METRICS_TOKEN (local dev, Vercel) means this route doesn't exist.
 */
export async function GET(request: Request) {
  const token = env.metricsToken();
  if (!token) {
    return new Response("Not found", { status: 404 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${token}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await metrics.registry.metrics();
  return new Response(body, {
    headers: { "content-type": metrics.registry.contentType },
  });
}
