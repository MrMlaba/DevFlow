import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { CommentableType, Tables } from "@/types/database";
import { logActivity } from "@/services/activity";
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

export async function deleteComment(commentId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("comments").delete().eq("id", commentId);
  if (error) throw error;
}
