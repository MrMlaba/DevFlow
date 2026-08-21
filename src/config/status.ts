import type { BadgeTone } from "@/components/status-badge";
import type {
  IssuePriority,
  IssueStatus,
  TaskPriority,
  TaskStatus,
} from "@/types/database";

export const TASK_STATUS_META: Record<TaskStatus, { label: string; tone: BadgeTone }> = {
  backlog: { label: "Backlog", tone: "neutral" },
  todo: { label: "To Do", tone: "info" },
  in_progress: { label: "In Progress", tone: "info" },
  code_review: { label: "Code Review", tone: "warning" },
  testing: { label: "Testing", tone: "warning" },
  blocked: { label: "Blocked", tone: "danger" },
  done: { label: "Done", tone: "success" },
};

export const TASK_STATUS_ORDER: TaskStatus[] = [
  "backlog",
  "todo",
  "in_progress",
  "code_review",
  "testing",
  "blocked",
  "done",
];

export const TASK_PRIORITY_META: Record<TaskPriority, { label: string; tone: BadgeTone }> = {
  low: { label: "Low", tone: "neutral" },
  medium: { label: "Medium", tone: "info" },
  high: { label: "High", tone: "warning" },
  urgent: { label: "Urgent", tone: "danger" },
};

export const ISSUE_STATUS_META: Record<IssueStatus, { label: string; tone: BadgeTone }> = {
  open: { label: "Open", tone: "info" },
  in_progress: { label: "In Progress", tone: "warning" },
  resolved: { label: "Resolved", tone: "success" },
  closed: { label: "Closed", tone: "neutral" },
  wont_fix: { label: "Won't Fix", tone: "neutral" },
};

export const ISSUE_PRIORITY_META: Record<IssuePriority, { label: string; tone: BadgeTone }> = {
  low: { label: "Low", tone: "neutral" },
  medium: { label: "Medium", tone: "info" },
  high: { label: "High", tone: "warning" },
  critical: { label: "Critical", tone: "danger" },
};

export const PIPELINE_STATUS_META: Record<string, { label: string; tone: BadgeTone }> = {
  queued: { label: "Queued", tone: "neutral" },
  running: { label: "Running", tone: "info" },
  success: { label: "Success", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

export const DEPLOYMENT_STATUS_META: Record<string, { label: string; tone: BadgeTone }> = {
  queued: { label: "Queued", tone: "neutral" },
  deploying: { label: "Deploying", tone: "info" },
  successful: { label: "Successful", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
  rolled_back: { label: "Rolled Back", tone: "warning" },
};

export const INCIDENT_STATUS_META: Record<string, { label: string; tone: BadgeTone }> = {
  investigating: { label: "Investigating", tone: "danger" },
  identified: { label: "Identified", tone: "warning" },
  monitoring: { label: "Monitoring", tone: "info" },
  resolved: { label: "Resolved", tone: "success" },
};

export const INCIDENT_SEVERITY_META: Record<string, { label: string; tone: BadgeTone }> = {
  low: { label: "Low", tone: "neutral" },
  medium: { label: "Medium", tone: "info" },
  high: { label: "High", tone: "warning" },
  critical: { label: "Critical", tone: "danger" },
};

export function pullRequestStatusMeta(state: string, isMerged: boolean) {
  if (isMerged) return { label: "Merged", tone: "info" as const };
  if (state === "closed") return { label: "Closed", tone: "neutral" as const };
  return { label: "Open", tone: "success" as const };
}

export const HEALTH_STATUS_META: Record<string, { label: string; tone: BadgeTone }> = {
  healthy: { label: "Healthy", tone: "success" },
  degraded: { label: "Degraded", tone: "warning" },
  down: { label: "Down", tone: "danger" },
};
