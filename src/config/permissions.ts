import type { AppRole } from "@/types/database";

/**
 * Coarse-grained permission matrix for RBAC.
 *
 * Design decision (see docs/architecture.md "Authorization"): DevFlow does
 * not use a dynamic, database-driven permissions table. The five roles are
 * fixed and their capabilities are enforced in two places that must agree:
 *
 *   1. Postgres row-level security policies (database/migrations/) - the
 *      actual security boundary, enforced no matter how the data is
 *      accessed.
 *   2. This matrix - used by the UI to show/hide actions, and by server
 *      actions (src/features/*\/actions.ts) to fail fast with a clear
 *      error before hitting the database.
 *
 * A code-level matrix is simpler to reason about and test than a fully
 * dynamic ACL system, and the fixed five-role model is what the product
 * spec calls for. Revisit this if DevFlow ever needs custom/org-defined
 * roles.
 */
export type Permission =
  | "organization:manage"
  | "organization:invite_members"
  | "project:create"
  | "project:update"
  | "project:delete"
  | "project:manage_members"
  | "task:create"
  | "task:update"
  | "task:delete"
  | "issue:create"
  | "issue:update"
  | "issue:delete"
  | "comment:create"
  | "comment:delete_any"
  | "activity:view";

const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  administrator: [
    "organization:manage",
    "organization:invite_members",
    "project:create",
    "project:update",
    "project:delete",
    "project:manage_members",
    "task:create",
    "task:update",
    "task:delete",
    "issue:create",
    "issue:update",
    "issue:delete",
    "comment:create",
    "comment:delete_any",
    "activity:view",
  ],
  project_owner: [
    "project:update",
    "project:delete",
    "project:manage_members",
    "task:create",
    "task:update",
    "task:delete",
    "issue:create",
    "issue:update",
    "issue:delete",
    "comment:create",
    "comment:delete_any",
    "activity:view",
  ],
  developer: [
    "task:create",
    "task:update",
    "issue:create",
    "issue:update",
    "comment:create",
    "activity:view",
  ],
  reviewer: [
    "task:update",
    "issue:update",
    "comment:create",
    "activity:view",
  ],
  lecturer: ["comment:create", "activity:view"],
};

export function can(role: AppRole | null | undefined, permission: Permission) {
  if (!role) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function permissionsFor(role: AppRole): Permission[] {
  return ROLE_PERMISSIONS[role];
}
