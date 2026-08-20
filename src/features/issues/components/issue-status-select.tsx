"use client";

import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateIssueStatusAction } from "@/features/issues/actions";
import { ISSUE_STATUS_META } from "@/config/status";
import type { IssueStatus } from "@/types/database";

const ORDER: IssueStatus[] = ["open", "in_progress", "resolved", "closed", "wont_fix"];

export function IssueStatusSelect({
  issueId,
  status,
}: {
  issueId: string;
  status: IssueStatus;
}) {
  async function onChange(next: string | null) {
    if (!next) return;
    try {
      await updateIssueStatusAction({ issueId, status: next as IssueStatus });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't update status.");
    }
  }

  return (
    <Select value={status} onValueChange={onChange}>
      <SelectTrigger size="sm" className="w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ORDER.map((s) => (
          <SelectItem key={s} value={s}>
            {ISSUE_STATUS_META[s].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
