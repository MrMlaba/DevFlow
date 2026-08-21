import { z } from "zod";

export const connectRepositorySchema = z.object({
  projectId: z.string().uuid(),
  ownerRepo: z
    .string()
    .trim()
    .regex(/^[\w.-]+\/[\w.-]+$/, 'Enter a repository as "owner/name"'),
});

export const linkPullRequestSchema = z.object({
  pullRequestId: z.string().uuid(),
  linkedTaskId: z.string().uuid().nullable(),
});
