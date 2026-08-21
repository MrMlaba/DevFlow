import { ExternalLink, GitBranch, FolderGit2, Tag, Ticket, Users2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { initials, formatRelativeTime } from "@/lib/utils";
import type {
  GitHubBranch,
  GitHubContributor,
  GitHubIssue,
  GitHubRelease,
} from "@/lib/github";
import type { ProjectRepository } from "@/services/github";

export function RepositorySnapshot({
  repository,
  snapshot,
}: {
  repository: ProjectRepository;
  snapshot: {
    branches: GitHubBranch[];
    contributors: GitHubContributor[];
    releases: GitHubRelease[];
    issues: GitHubIssue[];
  };
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <FolderGit2 className="size-4" />
          Repository
        </CardTitle>
        <a
          href={repository.html_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground flex items-center gap-1 text-xs hover:text-foreground"
        >
          {repository.full_name}
          <ExternalLink className="size-3" />
        </a>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-muted-foreground mb-1.5 flex items-center gap-1.5 text-xs">
            <GitBranch className="size-3.5" />
            Branches
          </p>
          <div className="flex flex-wrap gap-1.5">
            {snapshot.branches.slice(0, 8).map((branch) => (
              <Badge key={branch.name} variant="outline" className="font-mono text-[11px] font-normal">
                {branch.name}
              </Badge>
            ))}
            {snapshot.branches.length === 0 && (
              <span className="text-muted-foreground text-xs">No branches found.</span>
            )}
          </div>
        </div>

        <div>
          <p className="text-muted-foreground mb-1.5 flex items-center gap-1.5 text-xs">
            <Users2 className="size-3.5" />
            Contributors
          </p>
          <div className="flex -space-x-2">
            {snapshot.contributors.slice(0, 10).map((c) => (
              <a key={c.login} href={c.html_url} target="_blank" rel="noopener noreferrer">
                <Avatar className="border-background size-7 border-2">
                  <AvatarImage src={c.avatar_url} alt={c.login} />
                  <AvatarFallback className="text-[10px]">{initials(c.login)}</AvatarFallback>
                </Avatar>
              </a>
            ))}
            {snapshot.contributors.length === 0 && (
              <span className="text-muted-foreground text-xs">No contributors found.</span>
            )}
          </div>
        </div>

        {snapshot.issues.length > 0 && (
          <div>
            <p className="text-muted-foreground mb-1.5 flex items-center gap-1.5 text-xs">
              <Ticket className="size-3.5" />
              GitHub issues
            </p>
            <ul className="space-y-1">
              {snapshot.issues.slice(0, 5).map((issue) => (
                <li key={issue.number}>
                  <a
                    href={issue.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-2 text-sm hover:underline"
                  >
                    <span className="line-clamp-1">
                      #{issue.number} {issue.title}
                    </span>
                    <Badge
                      variant={issue.state === "open" ? "default" : "secondary"}
                      className="shrink-0 font-normal"
                    >
                      {issue.state}
                    </Badge>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {snapshot.releases.length > 0 && (
          <div>
            <p className="text-muted-foreground mb-1.5 flex items-center gap-1.5 text-xs">
              <Tag className="size-3.5" />
              Releases
            </p>
            <ul className="space-y-1">
              {snapshot.releases.slice(0, 3).map((release) => (
                <li key={release.id}>
                  <a
                    href={release.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-2 text-sm hover:underline"
                  >
                    <span>{release.name ?? release.tag_name}</span>
                    <span className="text-muted-foreground text-xs">
                      {release.published_at ? formatRelativeTime(release.published_at) : ""}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-muted-foreground border-t pt-3 text-xs">
          See the Commits and Pull Requests tabs for full history.
        </p>
      </CardContent>
    </Card>
  );
}
