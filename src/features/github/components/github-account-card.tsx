"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { FolderGit2 } from "lucide-react";

import { disconnectGitHubAccountAction } from "@/features/github/actions";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { GitHubAccount } from "@/services/github";

export function GitHubAccountCard({ account }: { account: GitHubAccount | null }) {
  const [isPending, startTransition] = useTransition();

  function disconnect() {
    startTransition(async () => {
      try {
        await disconnectGitHubAccountAction();
        toast.success("GitHub account disconnected.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Couldn't disconnect.");
      }
    });
  }

  if (!account) {
    return (
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          Connect GitHub to link repositories to your projects.
        </p>
        <Button
          nativeButton={false}
          render={<a href="/api/github/oauth/start?next=/settings" />}
        >
          <FolderGit2 />
          Connect GitHub
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <Avatar className="size-8">
          <AvatarImage src={account.avatar_url ?? undefined} alt="" />
          <AvatarFallback>
            <FolderGit2 className="size-4" />
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-medium">{account.github_username}</p>
          <p className="text-muted-foreground text-xs">Connected to GitHub</p>
        </div>
      </div>
      <Button variant="outline" disabled={isPending} onClick={disconnect}>
        Disconnect
      </Button>
    </div>
  );
}
