import { z } from "zod";

export const incidentSeverityEnum = z.enum(["low", "medium", "high", "critical"]);

export const incidentStatusEnum = z.enum([
  "investigating",
  "identified",
  "monitoring",
  "resolved",
]);

export const createIncidentSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().trim().min(2, "Enter a title").max(200),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  service: z.string().trim().max(100).optional().or(z.literal("")),
  severity: incidentSeverityEnum.default("medium"),
  relatedDeployment: z.string().trim().max(200).optional().or(z.literal("")),
});

export const updateIncidentStatusSchema = z.object({
  incidentId: z.string().uuid(),
  status: incidentStatusEnum,
});

export const updateIncidentAssigneeSchema = z.object({
  incidentId: z.string().uuid(),
  assigneeId: z.string().uuid().nullable(),
});

export const addIncidentUpdateSchema = z.object({
  incidentId: z.string().uuid(),
  message: z.string().trim().min(2, "Enter an update").max(2000),
  severity: incidentSeverityEnum.optional().or(z.literal("")),
  rootCause: z.string().trim().max(2000).optional().or(z.literal("")),
  resolution: z.string().trim().max(2000).optional().or(z.literal("")),
});
