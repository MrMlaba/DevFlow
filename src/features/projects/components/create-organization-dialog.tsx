"use client";

import { useActionState, useState } from "react";

import { createOrganizationAction } from "@/features/projects/actions";
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
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/submit-button";
import { FieldError } from "@/components/field-error";
import { slugify } from "@/lib/slug";
import { Plus } from "lucide-react";

export function CreateOrganizationDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(
    createOrganizationAction,
    initialFormState,
  );
  const [name, setName] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [slug, setSlug] = useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus />
        New organization
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Create an organization</DialogTitle>
            <DialogDescription>
              Organizations hold your projects and team members.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="org-name">Name</Label>
            <Input
              id="org-name"
              name="name"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
              placeholder="Computer Science Department"
            />
            <FieldError messages={state.fieldErrors?.name} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-slug">Slug</Label>
            <Input
              id="org-slug"
              name="slug"
              required
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
              placeholder="computer-science-department"
            />
            <FieldError messages={state.fieldErrors?.slug} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-description">Description</Label>
            <Textarea id="org-description" name="description" rows={3} />
            <FieldError messages={state.fieldErrors?.description} />
          </div>
          {state.status === "error" && (
            <p className="text-destructive text-sm">{state.message}</p>
          )}
          <DialogFooter>
            <SubmitButton pendingText="Creating...">Create organization</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
