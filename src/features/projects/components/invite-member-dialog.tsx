"use client";

import { useActionState, useState } from "react";

import { inviteMemberAction } from "@/features/projects/actions";
import { initialFormState } from "@/lib/form-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/submit-button";
import { FieldError } from "@/components/field-error";
import { ALL_ROLES, ROLE_LABELS } from "@/config/roles";
import { UserPlus } from "lucide-react";

export function InviteMemberDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState("developer");
  const [state, formAction] = useActionState(inviteMemberAction, initialFormState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <UserPlus />
        Invite member
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="projectId" value={projectId} />
          <DialogHeader>
            <DialogTitle>Invite a team member</DialogTitle>
            <DialogDescription>
              If they already have a DevFlow account they&apos;re added
              immediately; otherwise they join automatically when they
              register with this email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              name="email"
              type="email"
              required
              placeholder="teammate@university.edu"
            />
            <FieldError messages={state.fieldErrors?.email} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-role">Role</Label>
            <Select value={role} onValueChange={(v) => v && setRole(v)}>
              <SelectTrigger id="invite-role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="role" value={role} />
          </div>
          {state.status === "error" && (
            <p className="text-destructive text-sm">{state.message}</p>
          )}
          {state.status === "success" && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              {state.message}
            </p>
          )}
          <DialogFooter>
            <SubmitButton pendingText="Sending...">Send invite</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
