import type { AppRole } from "@/types/database";

export const ALL_ROLES: AppRole[] = [
  "administrator",
  "project_owner",
  "developer",
  "reviewer",
  "lecturer",
];

export const ROLE_LABELS: Record<AppRole, string> = {
  administrator: "Administrator",
  project_owner: "Project Owner",
  developer: "Developer",
  reviewer: "Reviewer",
  lecturer: "Lecturer / Project Manager",
};

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  administrator:
    "Full control over the organization: billing, membership, and every project within it.",
  project_owner:
    "Owns a specific project: manages its members, settings, tasks, and issues.",
  developer:
    "Contributes to a project: creates and updates tasks, issues, and comments.",
  reviewer:
    "Reviews work on a project: comments, moves tasks through review/testing, can't delete or manage members.",
  lecturer:
    "Read-heavy oversight role for a project, typically used by lecturers or external project managers.",
};

// Badge color tokens, mapped to Tailwind classes in components that render
// a role badge (kept here so the mapping only lives in one place).
export const ROLE_BADGE_VARIANT: Record<
  AppRole,
  "default" | "secondary" | "outline" | "destructive"
> = {
  administrator: "destructive",
  project_owner: "default",
  developer: "secondary",
  reviewer: "outline",
  lecturer: "outline",
};
