import { z } from "zod";

export const issueStatusEnum = z.enum([
  "open",
  "in_progress",
  "resolved",
  "closed",
  "wont_fix",
]);

export const issuePriorityEnum = z.enum(["low", "medium", "high", "critical"]);

export const createIssueSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().trim().min(2, "Enter a title").max(200),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  priority: issuePriorityEnum.default("medium"),
  assigneeId: z.string().uuid().optional().or(z.literal("")),
  linkedTaskId: z.string().uuid().optional().or(z.literal("")),
});

export const updateIssueSchema = z.object({
  issueId: z.string().uuid(),
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  status: issueStatusEnum,
  priority: issuePriorityEnum,
  assigneeId: z.string().uuid().optional().or(z.literal("")),
});

export const updateIssueStatusSchema = z.object({
  issueId: z.string().uuid(),
  status: issueStatusEnum,
});

export const updateIssueLinkedTaskSchema = z.object({
  issueId: z.string().uuid(),
  linkedTaskId: z.string().uuid().nullable(),
});
