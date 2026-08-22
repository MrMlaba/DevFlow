import type { Instrumentation } from "next";

/**
 * Fires on every uncaught server error - Server Component render, route
 * handler, Server Action, or proxy.ts (context.routeType covers all four).
 * This is the "error rate" side of Phase 15 monitoring: broader than
 * wrapping individual route handlers (most of the app is Server Actions,
 * which can't be wrapped the way route.ts can), but only catches thrown
 * exceptions - a handler that deliberately returns a non-2xx status
 * without throwing won't show up here.
 */
export const onRequestError: Instrumentation.onRequestError = async (
  _error,
  _request,
  context,
) => {
  const { metrics, normalizeRoute } = await import("@/lib/metrics");
  metrics.requestErrorsTotal.inc({
    route_type: context.routeType,
    route_path: normalizeRoute(context.routePath),
  });
};
