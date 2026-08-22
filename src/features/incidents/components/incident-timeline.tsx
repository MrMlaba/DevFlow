import type { IncidentUpdate } from "@/services/incidents";
import { formatRelativeTime } from "@/lib/utils";

export function IncidentTimeline({ updates }: { updates: IncidentUpdate[] }) {
  if (updates.length === 0) return null;

  return (
    <div className="space-y-2 border-t pt-3">
      {updates.map((update) => (
        <div key={update.id} className="text-sm">
          <span className="text-muted-foreground text-xs">
            {formatRelativeTime(update.created_at)} ·{" "}
            {update.author?.full_name ?? update.author?.email ?? "Someone"}
          </span>
          <p>{update.message}</p>
        </div>
      ))}
    </div>
  );
}
