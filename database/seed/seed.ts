/**
 * Development seed script. Creates a demo organization with one user per
 * role, two projects, and a handful of tasks/issues/comments/activity
 * events so the UI has something real to render.
 *
 * This talks directly to Supabase with the service-role key (bypassing
 * RLS entirely) because it needs the Auth Admin API to create users - it
 * does NOT go through src/services/*, which are Next.js-request-scoped
 * (they read cookies() for the current session).
 *
 * Usage:
 *   npm run db:seed
 *
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * and SEED_USER_PASSWORD set. See .env.example.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SEED_PASSWORD = process.env.SEED_USER_PASSWORD;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !SEED_PASSWORD) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or SEED_USER_PASSWORD.\n" +
      "Copy .env.example to .env.local, fill in your Supabase project's values, and set a local-only SEED_USER_PASSWORD.",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface DemoUser {
  email: string;
  fullName: string;
  orgRole: "administrator" | "developer";
  projectRole:
    | "administrator"
    | "project_owner"
    | "developer"
    | "reviewer"
    | "lecturer";
}

const DEMO_USERS: DemoUser[] = [
  {
    email: "admin@devflow.dev",
    fullName: "Amara Ndlovu",
    orgRole: "administrator",
    projectRole: "administrator",
  },
  {
    email: "owner@devflow.dev",
    fullName: "Liam Carter",
    orgRole: "developer",
    projectRole: "project_owner",
  },
  {
    email: "dev@devflow.dev",
    fullName: "Priya Naidu",
    orgRole: "developer",
    projectRole: "developer",
  },
  {
    email: "reviewer@devflow.dev",
    fullName: "Sipho Dlamini",
    orgRole: "developer",
    projectRole: "reviewer",
  },
  {
    email: "lecturer@devflow.dev",
    fullName: "Dr. Elena Novak",
    orgRole: "developer",
    projectRole: "lecturer",
  },
];

async function getOrCreateUser(user: DemoUser) {
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .ilike("email", user.email)
    .maybeSingle();

  if (existing) return existing.id as string;

  const { data, error } = await supabase.auth.admin.createUser({
    email: user.email,
    password: SEED_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: user.fullName },
  });

  if (error || !data.user) {
    throw new Error(`Failed to create user ${user.email}: ${error?.message}`);
  }

  return data.user.id;
}

async function main() {
  console.log("Seeding DevFlow demo data...\n");

  const userIds: Record<string, string> = {};
  for (const user of DEMO_USERS) {
    const id = await getOrCreateUser(user);
    userIds[user.email] = id;
    console.log(`  user       ${user.email} (${user.fullName})`);
  }

  const adminId = userIds["admin@devflow.dev"];

  let { data: org } = await supabase
    .from("organizations")
    .select("*")
    .eq("slug", "devflow-university")
    .maybeSingle();

  if (!org) {
    const { data, error } = await supabase
      .from("organizations")
      .insert({
        name: "DevFlow University",
        slug: "devflow-university",
        description:
          "Demo organization seeded for local development - a computer science department running student software projects.",
        created_by: adminId,
      })
      .select()
      .single();
    if (error) throw error;
    org = data;
    console.log(`  org        ${org.name}`);
  }

  for (const user of DEMO_USERS) {
    if (user.email === "admin@devflow.dev") continue;
    await supabase
      .from("organization_members")
      .upsert(
        {
          organization_id: org.id,
          user_id: userIds[user.email],
          role: user.orgRole,
          invited_by: adminId,
        },
        { onConflict: "organization_id,user_id" },
      );
  }

  const projectsToSeed = [
    {
      slug: "devflow-platform",
      name: "DevFlow Platform",
      description:
        "The DevFlow application itself - the reference project for this course.",
      repository_url: "https://github.com/devflow-university/devflow-platform",
      tech_stack: ["Next.js", "TypeScript", "Supabase", "Tailwind CSS"],
      created_by: adminId,
    },
    {
      slug: "capstone-student-portal",
      name: "Capstone: Student Portal",
      description:
        "A student-team capstone project: a portal for course registration and grade tracking.",
      repository_url: "https://github.com/devflow-university/student-portal",
      tech_stack: ["React", "Node.js", "PostgreSQL"],
      created_by: userIds["owner@devflow.dev"],
    },
  ];

  const projectIds: Record<string, string> = {};
  for (const p of projectsToSeed) {
    let { data: project } = await supabase
      .from("projects")
      .select("*")
      .eq("organization_id", org.id)
      .eq("slug", p.slug)
      .maybeSingle();

    if (!project) {
      const { data, error } = await supabase
        .from("projects")
        .insert({ ...p, organization_id: org.id })
        .select()
        .single();
      if (error) throw error;
      project = data;
      console.log(`  project    ${project.name}`);
    }
    projectIds[p.slug] = project.id;

    for (const user of DEMO_USERS) {
      await supabase.from("project_members").upsert(
        {
          project_id: project.id,
          user_id: userIds[user.email],
          role: user.projectRole,
          invited_by: adminId,
        },
        { onConflict: "project_id,user_id" },
      );
    }
  }

  const platformProjectId = projectIds["devflow-platform"];

  const { count: existingTaskCount } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("project_id", platformProjectId);

  if (!existingTaskCount) {
    const tasks = [
      {
        title: "Design database schema for RBAC",
        description:
          "Model organizations, projects, members, and roles with row-level security.",
        status: "done",
        priority: "high",
        labels: ["backend", "database"],
        assignee_id: userIds["owner@devflow.dev"],
        reporter_id: adminId,
      },
      {
        title: "Build authentication flow",
        description:
          "Registration, login, logout, password reset, and session handling via Supabase Auth.",
        status: "done",
        priority: "high",
        labels: ["backend", "auth"],
        assignee_id: userIds["dev@devflow.dev"],
        reporter_id: adminId,
      },
      {
        title: "Implement project Kanban board",
        description: "Drag-and-drop task board grouped by status.",
        status: "in_progress",
        priority: "medium",
        labels: ["frontend"],
        assignee_id: userIds["dev@devflow.dev"],
        reporter_id: userIds["owner@devflow.dev"],
      },
      {
        title: "Write onboarding docs for new contributors",
        description: "docs/development.md walkthrough for local setup.",
        status: "code_review",
        priority: "low",
        labels: ["docs"],
        assignee_id: userIds["reviewer@devflow.dev"],
        reporter_id: userIds["owner@devflow.dev"],
      },
      {
        title: "Fix session refresh race condition",
        description: "Intermittent logout when a token refresh overlaps a navigation.",
        status: "testing",
        priority: "urgent",
        labels: ["bug", "auth"],
        assignee_id: userIds["dev@devflow.dev"],
        reporter_id: userIds["reviewer@devflow.dev"],
      },
      {
        title: "Plan CI pipeline stages",
        description: "Draft lint/type-check/test/build stages for Phase 7.",
        status: "todo",
        priority: "medium",
        labels: ["devops"],
        assignee_id: null,
        reporter_id: userIds["lecturer@devflow.dev"],
      },
      {
        title: "Evaluate hosting options for staging",
        status: "backlog",
        priority: "low",
        labels: ["devops"],
        assignee_id: null,
        reporter_id: adminId,
      },
    ];

    const { data: insertedTasks, error: taskError } = await supabase
      .from("tasks")
      .insert(tasks.map((t) => ({ ...t, project_id: platformProjectId })))
      .select();
    if (taskError) throw taskError;
    console.log(`  tasks      ${insertedTasks.length} seeded`);

    const firstTask = insertedTasks[0];
    await supabase.from("comments").insert([
      {
        project_id: platformProjectId,
        commentable_type: "task",
        commentable_id: firstTask.id,
        author_id: userIds["reviewer@devflow.dev"],
        body: "RLS policies look solid. Left a note about the org-admin bypass helper functions.",
      },
      {
        project_id: platformProjectId,
        commentable_type: "task",
        commentable_id: firstTask.id,
        author_id: userIds["owner@devflow.dev"],
        body: "Addressed, thanks for the review!",
      },
    ]);

    const activityRows = insertedTasks.map((t) => ({
      project_id: platformProjectId,
      organization_id: org!.id,
      actor_id: t.reporter_id,
      event_type: "task.created",
      object_type: "task",
      object_id: t.id,
      description: `created task "${t.title}"`,
    }));
    await supabase.from("activity_events").insert(activityRows);
  }

  const { count: existingIssueCount } = await supabase
    .from("issues")
    .select("id", { count: "exact", head: true })
    .eq("project_id", platformProjectId);

  if (!existingIssueCount) {
    const issues = [
      {
        title: "Password reset email sometimes lands in spam",
        description: "Investigate SPF/DKIM configuration for the Supabase project.",
        status: "open",
        priority: "medium",
        reporter_id: userIds["dev@devflow.dev"],
        assignee_id: null,
      },
      {
        title: "Kanban board is slow with 100+ tasks",
        description: "Needs pagination or virtualization - tracked for Phase 2.",
        status: "open",
        priority: "low",
        reporter_id: userIds["lecturer@devflow.dev"],
        assignee_id: null,
      },
      {
        title: "Invite flow doesn't handle duplicate emails gracefully",
        status: "closed",
        priority: "low",
        reporter_id: userIds["reviewer@devflow.dev"],
        assignee_id: userIds["dev@devflow.dev"],
      },
    ];

    const { data: insertedIssues, error: issueError } = await supabase
      .from("issues")
      .insert(issues.map((i) => ({ ...i, project_id: platformProjectId })))
      .select();
    if (issueError) throw issueError;
    console.log(`  issues     ${insertedIssues.length} seeded`);

    const activityRows = insertedIssues.map((i) => ({
      project_id: platformProjectId,
      organization_id: org!.id,
      actor_id: i.reporter_id,
      event_type: "issue.created",
      object_type: "issue",
      object_id: i.id,
      description: `opened issue "${i.title}"`,
    }));
    await supabase.from("activity_events").insert(activityRows);
  }

  console.log("\nDone. Demo accounts (password = SEED_USER_PASSWORD):");
  for (const user of DEMO_USERS) {
    console.log(`  ${user.email.padEnd(24)} ${user.projectRole}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
