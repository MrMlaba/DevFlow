"use client";

import { useActionState, useState } from "react";

import { createProjectAction } from "@/features/projects/actions";
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
import { slugify, slugifyLive } from "@/lib/slug";
import { Plus } from "lucide-react";

export function CreateProjectDialog({ organizationId }: { organizationId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(createProjectAction, initialFormState);
  const [name, setName] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [slug, setSlug] = useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus />
        New project
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="organizationId" value={organizationId} />
          <DialogHeader>
            <DialogTitle>Create a project</DialogTitle>
            <DialogDescription>
              You&apos;ll automatically become its project owner.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="project-name">Name</Label>
            <Input
              id="project-name"
              name="name"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
              placeholder="Student Portal"
            />
            <FieldError messages={state.fieldErrors?.name} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-slug">Slug</Label>
            <Input
              id="project-slug"
              name="slug"
              required
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugifyLive(e.target.value));
              }}
              placeholder="student-portal"
            />
            <FieldError messages={state.fieldErrors?.slug} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-description">Description</Label>
            <Textarea id="project-description" name="description" rows={3} />
            <FieldError messages={state.fieldErrors?.description} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-repo">Repository URL</Label>
            <Input
              id="project-repo"
              name="repositoryUrl"
              placeholder="https://github.com/org/repo"
            />
            <FieldError messages={state.fieldErrors?.repositoryUrl} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-tech">Technology stack</Label>
            <Input
              id="project-tech"
              name="techStack"
              placeholder="Next.js, TypeScript, Supabase"
            />
            <p className="text-muted-foreground text-xs">Comma-separated</p>
          </div>
          {state.status === "error" && (
            <p className="text-destructive text-sm">{state.message}</p>
          )}
          <DialogFooter>
            <SubmitButton pendingText="Creating...">Create project</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
