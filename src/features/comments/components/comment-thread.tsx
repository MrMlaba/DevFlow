"use client";

import { useEffect, useRef, useState } from "react";

import { createCommentAction, getCommentsAction } from "@/features/comments/actions";
import { initialFormState } from "@/lib/form-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/submit-button";
import { Skeleton } from "@/components/ui/skeleton";
import { initials, formatRelativeTime } from "@/lib/utils";
import type { Comment } from "@/services/comments";
import type { CommentableType } from "@/types/database";

export function CommentThread({
  projectId,
  commentableType,
  commentableId,
}: {
  projectId: string;
  commentableType: CommentableType;
  commentableId: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [state, setState] = useState(initialFormState);

  useEffect(() => {
    let cancelled = false;
    getCommentsAction(commentableType, commentableId).then((data) => {
      if (!cancelled) setComments(data);
    });
    return () => {
      cancelled = true;
    };
  }, [commentableType, commentableId]);

  async function onSubmit(formData: FormData) {
    const result = await createCommentAction(initialFormState, formData);
    setState(result);
    if (result.status === "success") {
      formRef.current?.reset();
      const fresh = await getCommentsAction(commentableType, commentableId);
      setComments(fresh);
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">
        Comments {comments && comments.length > 0 && `(${comments.length})`}
      </h3>
      {comments === null ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <Avatar className="size-8 shrink-0">
                <AvatarImage src={comment.author.avatar_url ?? undefined} alt="" />
                <AvatarFallback className="text-xs">
                  {initials(comment.author.full_name ?? comment.author.email)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium">
                    {comment.author.full_name ?? comment.author.email}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {formatRelativeTime(comment.created_at)}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{comment.body}</p>
              </div>
            </div>
          ))}
          {comments.length === 0 && (
            <p className="text-muted-foreground text-sm">No comments yet.</p>
          )}
        </div>
      )}
      <form ref={formRef} action={onSubmit} className="space-y-2">
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="commentableType" value={commentableType} />
        <input type="hidden" name="commentableId" value={commentableId} />
        <Textarea name="body" placeholder="Write a comment..." rows={2} required />
        {state.status === "error" && (
          <p className="text-destructive text-sm">{state.message}</p>
        )}
        <SubmitButton size="sm" pendingText="Posting...">
          Comment
        </SubmitButton>
      </form>
    </div>
  );
}
