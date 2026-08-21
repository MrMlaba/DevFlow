export const AUDIT_ACTIONS = [
  "auth.login",
  "auth.password_changed",
  "member.added",
  "member.invited",
  "member.role_changed",
  "member.removed",
  "task.deleted",
  "issue.deleted",
  "comment.deleted",
] as const;

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  "auth.login": "Login",
  "auth.password_changed": "Password changed",
  "member.added": "Member added",
  "member.invited": "Member invited",
  "member.role_changed": "Role changed",
  "member.removed": "Member removed",
  "task.deleted": "Task deleted",
  "issue.deleted": "Issue deleted",
  "comment.deleted": "Comment deleted",
};
