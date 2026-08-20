import { History } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/empty-state";
import { initials, formatRelativeTime } from "@/lib/utils";
import type { ActivityEvent } from "@/services/activity";

export function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  if (events.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No activity yet"
        description="Actions across your projects - task updates, comments, invites - will show up here."
      />
    );
  }

  return (
    <ol className="space-y-5">
      {events.map((event) => (
        <li key={event.id} className="flex gap-3">
          <Avatar className="mt-0.5 size-8 shrink-0">
            <AvatarImage src={event.actor?.avatar_url ?? undefined} alt="" />
            <AvatarFallback className="text-xs">
              {event.actor
                ? initials(event.actor.full_name ?? event.actor.email)
                : "?"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-sm">
              <span className="font-medium">
                {event.actor?.full_name ?? event.actor?.email ?? "Someone"}
              </span>{" "}
              <span className="text-muted-foreground">{event.description}</span>
            </p>
            <p className="text-muted-foreground text-xs">
              {formatRelativeTime(event.created_at)}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
