import { z } from "zod";

export const createCommentSchema = z.object({
  projectId: z.string().uuid(),
  commentableType: z.enum(["task", "issue"]),
  commentableId: z.string().uuid(),
  body: z.string().trim().min(1, "Comment can't be empty").max(5000),
});

export const deleteCommentSchema = z.object({
  commentId: z.string().uuid(),
  projectId: z.string().uuid(),
});
