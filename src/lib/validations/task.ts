import { z } from "zod";

export const taskStatusEnum = z.enum([
  "backlog",
  "todo",
  "in_progress",
  "code_review",
  "testing",
  "blocked",
  "done",
]);

export const taskPriorityEnum = z.enum(["low", "medium", "high", "urgent"]);

export const createTaskSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().trim().min(2, "Enter a title").max(200),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  status: taskStatusEnum.default("backlog"),
  priority: taskPriorityEnum.default("medium"),
  labels: z.string().trim().max(300).optional().or(z.literal("")),
  assigneeId: z.string().uuid().optional().or(z.literal("")),
  dueDate: z.string().trim().optional().or(z.literal("")),
});

export const updateTaskSchema = z.object({
  taskId: z.string().uuid(),
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  status: taskStatusEnum,
  priority: taskPriorityEnum,
  labels: z.string().trim().max(300).optional().or(z.literal("")),
  assigneeId: z.string().uuid().optional().or(z.literal("")),
  dueDate: z.string().trim().optional().or(z.literal("")),
});

export const updateTaskStatusSchema = z.object({
  taskId: z.string().uuid(),
  status: taskStatusEnum,
});
