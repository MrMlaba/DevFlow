import { GitCommitHorizontal } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/empty-state";
import { initials, formatRelativeTime } from "@/lib/utils";
import type { GitHubCommitRow } from "@/services/github";

export function CommitList({ commits }: { commits: GitHubCommitRow[] }) {
  if (commits.length === 0) {
    return (
      <EmptyState
        icon={GitCommitHorizontal}
        title="No commits yet"
        description="Connect a repository and sync it from the project's Settings tab."
      />
    );
  }

  return (
    <ol className="divide-y rounded-lg border bg-card">
      {commits.map((commit) => (
        <li key={commit.id} className="flex items-center gap-3 px-4 py-3">
          <Avatar className="size-7 shrink-0">
            <AvatarImage src={commit.author_avatar_url ?? undefined} alt="" />
            <AvatarFallback className="text-[10px]">
              {initials(commit.author_login ?? commit.author_name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <a
              href={commit.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="line-clamp-1 text-sm font-medium hover:underline"
            >
              {commit.message}
            </a>
            <p className="text-muted-foreground text-xs">
              {commit.author_login ?? commit.author_name} ·{" "}
              {formatRelativeTime(commit.committed_at)}
            </p>
          </div>
          <span className="text-muted-foreground shrink-0 font-mono text-xs">
            {commit.sha.slice(0, 7)}
          </span>
        </li>
      ))}
    </ol>
  );
}
