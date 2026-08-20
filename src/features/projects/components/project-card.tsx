import Link from "next/link";
import { Users2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ROLE_BADGE_VARIANT, ROLE_LABELS } from "@/config/roles";
import type { AppRole } from "@/types/database";
import type { Project } from "@/services/projects";

const PROJECT_STATUS_LABEL: Record<Project["status"], string> = {
  planning: "Planning",
  active: "Active",
  on_hold: "On Hold",
  completed: "Completed",
  archived: "Archived",
};

export function ProjectCard({
  project,
  role,
  memberCount,
}: {
  project: Project;
  role: AppRole;
  memberCount: number;
}) {
  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="h-full transition-colors hover:border-primary/40">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-1">{project.name}</CardTitle>
            <Badge variant="outline" className="shrink-0">
              {PROJECT_STATUS_LABEL[project.status]}
            </Badge>
          </div>
          <CardDescription className="line-clamp-2">
            {project.description || "No description yet."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1.5">
            {project.tech_stack.slice(0, 4).map((tech) => (
              <Badge key={tech} variant="secondary" className="font-normal">
                {tech}
              </Badge>
            ))}
          </div>
        </CardContent>
        <CardFooter className="justify-between">
          <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <Users2 className="size-3.5" />
            {memberCount} member{memberCount === 1 ? "" : "s"}
          </span>
          <Badge variant={ROLE_BADGE_VARIANT[role]} className="font-normal">
            {ROLE_LABELS[role]}
          </Badge>
        </CardFooter>
      </Card>
    </Link>
  );
}
