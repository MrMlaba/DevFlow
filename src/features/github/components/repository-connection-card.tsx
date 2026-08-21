"use client";

import { useActionState, useTransition } from "react";
import { toast } from "sonner";
import { ExternalLink, FolderGit2, RefreshCw } from "lucide-react";

import {
  connectRepositoryAction,
  disconnectRepositoryAction,
  syncRepositoryAction,
} from "@/features/github/actions";
import { initialFormState } from "@/lib/form-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { FieldError } from "@/components/field-error";
import type { ProjectRepository } from "@/services/github";

export function RepositoryConnectionCard({
  projectId,
  repository,
  hasGitHubAccount,
}: {
  projectId: string;
  repository: ProjectRepository | null;
  hasGitHubAccount: boolean;
}) {
  const [state, formAction] = useActionState(connectRepositoryAction, initialFormState);
  const [isPending, startTransition] = useTransition();

  function sync() {
    startTransition(async () => {
      try {
        const result = await syncRepositoryAction({ projectId });
        toast.success(
          `Synced ${result.commits} commit(s) and ${result.pullRequests} pull request(s).`,
        );
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Sync failed.");
      }
    });
  }

  function disconnect() {
    startTransition(async () => {
      try {
        await disconnectRepositoryAction({ projectId });
        toast.success("Repository disconnected.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Couldn't disconnect.");
      }
    });
  }

  if (repository) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FolderGit2 className="text-muted-foreground size-5" />
            <div>
              <a
                href={repository.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm font-medium hover:underline"
              >
                {repository.full_name}
                <ExternalLink className="size-3" />
              </a>
              <p className="text-muted-foreground text-xs">
                Default branch: {repository.default_branch}
                {!repository.webhook_id && " · webhook not registered"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={isPending} onClick={sync}>
              <RefreshCw className={isPending ? "animate-spin" : undefined} />
              Sync now
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={disconnect}
            >
              Disconnect
            </Button>
          </div>
        </div>
        {!repository.webhook_id && (
          <p className="text-muted-foreground text-xs">
            GitHub couldn&apos;t reach this app to register a webhook (expected on
            localhost). Real-time updates need a public URL - use{" "}
            <span className="font-mono">Sync now</span> in the meantime.
          </p>
        )}
      </div>
    );
  }

  if (!hasGitHubAccount) {
    return (
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          Connect your GitHub account first (Settings) to link a repository.
        </p>
        <Button
          variant="outline"
          nativeButton={false}
          render={
            <a href={`/api/github/oauth/start?next=/projects/${projectId}/settings`} />
          }
        >
          <FolderGit2 />
          Connect GitHub
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="projectId" value={projectId} />
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-2">
          <Label htmlFor="ownerRepo">Repository</Label>
          <Input
            id="ownerRepo"
            name="ownerRepo"
            placeholder="octocat/hello-world"
            required
          />
          <FieldError messages={state.fieldErrors?.ownerRepo} />
        </div>
        <SubmitButton pendingText="Connecting...">Connect</SubmitButton>
      </div>
      {state.status === "error" && (
        <p className="text-destructive text-sm">{state.message}</p>
      )}
    </form>
  );
}
