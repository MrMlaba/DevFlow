import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { CommentableType, Tables } from "@/types/database";
import { logActivity } from "@/services/activity";
import { logAudit } from "@/services/audit";
import type { Project } from "@/services/projects";

export type Comment = Tables<"comments"> & {
  author: Pick<Tables<"profiles">, "id" | "full_name" | "email" | "avatar_url">;
};

export async function listComments(
  commentableType: CommentableType,
  commentableId: string,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("comments")
    .select("*, author:profiles(id, full_name, email, avatar_url)")
    .eq("commentable_type", commentableType)
    .eq("commentable_id", commentableId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as Comment[];
}

export async function createComment(input: {
  project: Project;
  commentableType: CommentableType;
  commentableId: string;
  objectTitle: string;
  body: string;
  authorId: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("comments")
    .insert({
      project_id: input.project.id,
      commentable_type: input.commentableType,
      commentable_id: input.commentableId,
      author_id: input.authorId,
      body: input.body,
    })
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    projectId: input.project.id,
    organizationId: input.project.organization_id,
    actorId: input.authorId,
    eventType: "comment.created",
    objectType: input.commentableType,
    objectId: input.commentableId,
    description: `commented on ${input.commentableType} "${input.objectTitle}"`,
  });

  return data as Tables<"comments">;
}

export async function deleteComment(input: {
  commentId: string;
  project: Project;
  actorId: string;
}) {
  const supabase = await createClient();
  // .select() after delete lets us tell "nothing matched" (not found, or
  // RLS silently excluded it - same thing from this session's view) apart
  // from a real error, and gives us the row for logging.
  const { data, error } = await supabase
    .from("comments")
    .delete()
    .eq("id", input.commentId)
    .select()
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error("Comment not found, or you don't have permission to delete it.");
  }

  await logActivity({
    projectId: input.project.id,
    organizationId: input.project.organization_id,
    actorId: input.actorId,
    eventType: "comment.deleted",
    objectType: data.commentable_type,
    objectId: data.commentable_id,
    description: `deleted a comment on ${data.commentable_type} "${data.commentable_id}"`,
  });

  await logAudit({
    actorId: input.actorId,
    organizationId: input.project.organization_id,
    projectId: input.project.id,
    action: "comment.deleted",
    targetType: "comment",
    targetId: data.id,
    description: `Deleted a comment on ${data.commentable_type} ${data.commentable_id}`,
  });

  return data;
}
