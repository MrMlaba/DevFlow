"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/services/auth";
import { getMyRoleForProject, getProjectById } from "@/services/projects";
import {
  connectRepository as connectRepositoryService,
  disconnectGitHubAccount as disconnectGitHubAccountService,
  disconnectRepository as disconnectRepositoryService,
  getGitHubAccount,
  getProjectRepository,
  listPullRequestsLinkedToTask,
  syncRepository as syncRepositoryService,
  updatePullRequestLinkedTask,
} from "@/services/github";
import {
  connectRepositorySchema,
  linkPullRequestSchema,
} from "@/lib/validations/github";
import { fromZodError, type FormState } from "@/lib/form-state";
import { can } from "@/config/permissions";

async function requireProjectUpdatePermission(projectId: string, userId: string) {
  const role = await getMyRoleForProject(projectId, userId);
  if (!can(role, "project:update")) {
    throw new Error("You don't have permission to manage this project's repository.");
  }
}

export async function disconnectGitHubAccountAction() {
  const user = await requireUser();
  await disconnectGitHubAccountService(user.id);
  revalidatePath("/settings");
}

export async function connectRepositoryAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = connectRepositorySchema.safeParse({
    projectId: formData.get("projectId"),
    ownerRepo: formData.get("ownerRepo"),
  });
  if (!parsed.success) return fromZodError(parsed.error);

  try {
    await requireProjectUpdatePermission(parsed.data.projectId, user.id);

    const account = await getGitHubAccount(user.id);
    if (!account) {
      return {
        status: "error",
        message: "Connect your GitHub account first (see Settings).",
      };
    }

    const project = await getProjectById(parsed.data.projectId);
    if (!project) return { status: "error", message: "Project not found." };

    await connectRepositoryService({
      project,
      ownerRepo: parsed.data.ownerRepo,
      actorId: user.id,
      githubToken: account.access_token,
    });

    revalidatePath(`/projects/${project.id}`);
    revalidatePath(`/projects/${project.id}/settings`);
    return { status: "success", message: "Repository connected." };
  } catch (error) {
    return { status: "error", message: errorMessage(error) };
  }
}

export async function disconnectRepositoryAction(input: { projectId: string }) {
  const user = await requireUser();
  await requireProjectUpdatePermission(input.projectId, user.id);

  const [project, repository, account] = await Promise.all([
    getProjectById(input.projectId),
    getProjectRepository(input.projectId),
    getGitHubAccount(user.id),
  ]);
  if (!project) throw new Error("Project not found.");
  if (!repository) throw new Error("No repository connected.");

  await disconnectRepositoryService({
    project,
    repository,
    actorId: user.id,
    githubToken: account?.access_token,
  });

  revalidatePath(`/projects/${project.id}`);
  revalidatePath(`/projects/${project.id}/settings`);
}

export async function syncRepositoryAction(input: { projectId: string }) {
  const user = await requireUser();
  await requireProjectUpdatePermission(input.projectId, user.id);

  const [project, account] = await Promise.all([
    getProjectById(input.projectId),
    getGitHubAccount(user.id),
  ]);
  if (!project) throw new Error("Project not found.");
  if (!account) throw new Error("Connect your GitHub account first.");

  const result = await syncRepositoryService({ project, githubToken: account.access_token });

  revalidatePath(`/projects/${project.id}`);
  revalidatePath(`/projects/${project.id}/commits`);
  revalidatePath(`/projects/${project.id}/pull-requests`);
  return result;
}

export async function listPullRequestsLinkedToTaskAction(taskId: string) {
  await requireUser();
  return listPullRequestsLinkedToTask(taskId);
}

export async function linkPullRequestToTaskAction(input: {
  pullRequestId: string;
  linkedTaskId: string | null;
}) {
  await requireUser();
  const parsed = linkPullRequestSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid task link.");

  await updatePullRequestLinkedTask(parsed.data);
  revalidatePath("/pull-requests");
}

function errorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Something went wrong. Please try again.";
}
