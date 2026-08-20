import type { Metadata } from "next";
import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { PreviewDataBanner } from "@/components/preview-data-banner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MOCK_METRICS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Monitoring" };

export default function MonitoringPage() {
  return (
    <div>
      <PageHeader
        title="Monitoring"
        description="Application and infrastructure health."
      />
      <PreviewDataBanner phase="Phase 15 (Monitoring and Observability)" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MOCK_METRICS.map((metric) => {
          const goodTrend =
            metric.trend === "flat" || metric.trend === metric.goodDirection;
          const Icon =
            metric.trend === "up" ? ArrowUp : metric.trend === "down" ? ArrowDown : ArrowRight;
          return (
            <Card key={metric.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-muted-foreground text-sm font-medium">
                  {metric.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-semibold">{metric.value}</p>
                  <Icon
                    className={cn(
                      "size-4",
                      metric.trend === "flat"
                        ? "text-muted-foreground"
                        : goodTrend
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400",
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
