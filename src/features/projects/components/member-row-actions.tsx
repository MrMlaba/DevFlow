"use client";

import { useTransition } from "react";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

import {
  removeMemberAction,
  updateMemberRoleAction,
} from "@/features/projects/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ALL_ROLES, ROLE_LABELS } from "@/config/roles";
import type { AppRole } from "@/types/database";

export function MemberRowActions({
  projectId,
  memberId,
  memberUserId,
  memberName,
  currentRole,
  isCurrentUser,
}: {
  projectId: string;
  memberId: string;
  memberUserId: string;
  memberName: string;
  currentRole: AppRole;
  isCurrentUser: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function changeRole(role: AppRole) {
    startTransition(async () => {
      try {
        await updateMemberRoleAction({
          projectId,
          memberId,
          memberUserId,
          memberName,
          role,
        });
        toast.success(`${memberName}'s role updated to ${ROLE_LABELS[role]}.`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Couldn't update role.");
      }
    });
  }

  function remove() {
    startTransition(async () => {
      try {
        await removeMemberAction({ projectId, memberId, memberUserId, memberName });
        toast.success(`${memberName} removed from the project.`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Couldn't remove member.");
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            disabled={isPending}
            aria-label={`Actions for ${memberName}`}
          />
        }
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Change role</DropdownMenuLabel>
        {ALL_ROLES.map((role) => (
          <DropdownMenuItem
            key={role}
            disabled={role === currentRole}
            onClick={() => changeRole(role)}
          >
            {ROLE_LABELS[role]}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={isCurrentUser}
          onClick={remove}
        >
          Remove from project
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
