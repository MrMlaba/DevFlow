import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  GitPullRequest,
  Kanban,
  Rocket,
  ShieldCheck,
  Workflow,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/services/auth";

const PIPELINE = [
  "Idea",
  "Project",
  "Tasks",
  "Code",
  "Pull Request",
  "CI",
  "Security",
  "Docker",
  "Deployment",
  "Monitoring",
  "Incident",
  "Resolution",
];

const FEATURES = [
  {
    icon: Kanban,
    title: "Project & task management",
    description:
      "Organizations, projects, tasks, and issues with role-based access for owners, developers, reviewers, and lecturers.",
  },
  {
    icon: GitPullRequest,
    title: "GitHub-aware activity",
    description:
      "Every meaningful action - task moves, comments, invites, and (soon) commits and pull requests - lands in one activity feed.",
  },
  {
    icon: Rocket,
    title: "A DevOps platform, in phases",
    description:
      "CI, security scanning, containers, deployments, and observability are being built incrementally - see the roadmap in the docs.",
  },
  {
    icon: ShieldCheck,
    title: "Built on row-level security",
    description:
      "Access control is enforced in Postgres, not just the UI, so permissions hold no matter how the data is reached.",
  },
];

export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect("/overview");

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex h-16 items-center justify-between border-b px-4 md:px-6">
        <span className="flex items-center gap-2 font-semibold">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Workflow className="size-4" />
          </span>
          DevFlow
        </span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" render={<Link href="/login" />}>
            Sign in
          </Button>
          <Button render={<Link href="/register" />}>Get started</Button>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-4 py-20 text-center md:px-6">
          <h1 className="text-4xl font-semibold tracking-tight text-balance md:text-5xl">
            One platform for the whole software development lifecycle
          </h1>
          <p className="text-muted-foreground mt-4 text-lg text-balance">
            DevFlow connects project management, GitHub activity, CI/CD,
            deployments, monitoring, and incidents - built as a progressive
            DevOps learning project, phase by phase.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" render={<Link href="/register" />}>
              Create your account
              <ArrowRight />
            </Button>
            <Button size="lg" variant="outline" render={<Link href="/login" />}>
              Sign in
            </Button>
          </div>
        </section>

        <section className="border-y bg-card py-10">
          <div className="mx-auto max-w-5xl px-4 md:px-6">
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-3 text-sm">
              {PIPELINE.map((step, i) => (
                <span key={step} className="flex items-center gap-2">
                  <span className="rounded-md border bg-background px-2.5 py-1 font-medium">
                    {step}
                  </span>
                  {i < PIPELINE.length - 1 && (
                    <ArrowRight className="text-muted-foreground size-3.5" />
                  )}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-16 md:px-6">
          <div className="grid gap-8 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="flex gap-4">
                <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
                  <feature.icon className="size-5" />
                </span>
                <div>
                  <h3 className="font-medium">{feature.title}</h3>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="text-muted-foreground border-t px-4 py-6 text-center text-sm md:px-6">
        DevFlow is an open, phase-by-phase DevOps learning project. See{" "}
        <span className="font-mono">docs/devops-roadmap.md</span> for what
        ships next.
      </footer>
    </div>
  );
}
