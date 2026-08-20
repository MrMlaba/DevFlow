import { z } from "zod";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2, "Enter an organization name").max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(60)
    .regex(slugPattern, "Use lowercase letters, numbers, and hyphens only"),
  description: z.string().trim().max(500).optional().or(z.literal("")),
});

export const updateOrganizationSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().trim().min(2, "Enter an organization name").max(120),
  description: z.string().trim().max(500).optional().or(z.literal("")),
});

export const createProjectSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().trim().min(2, "Enter a project name").max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(60)
    .regex(slugPattern, "Use lowercase letters, numbers, and hyphens only"),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  repositoryUrl: z
    .string()
    .trim()
    .url("Enter a valid URL")
    .optional()
    .or(z.literal("")),
  techStack: z.string().trim().max(300).optional().or(z.literal("")),
});

export const updateProjectSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  repositoryUrl: z
    .string()
    .trim()
    .url("Enter a valid URL")
    .optional()
    .or(z.literal("")),
  techStack: z.string().trim().max(300).optional().or(z.literal("")),
  status: z.enum([
    "planning",
    "active",
    "on_hold",
    "completed",
    "archived",
  ]),
});

export const inviteMemberSchema = z.object({
  projectId: z.string().uuid(),
  email: z.string().trim().email("Enter a valid email address"),
  role: z.enum([
    "administrator",
    "project_owner",
    "developer",
    "reviewer",
    "lecturer",
  ]),
});

export const updateMemberRoleSchema = z.object({
  projectId: z.string().uuid(),
  memberId: z.string().uuid(),
  role: z.enum([
    "administrator",
    "project_owner",
    "developer",
    "reviewer",
    "lecturer",
  ]),
});
