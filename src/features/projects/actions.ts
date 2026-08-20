"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireUser } from "@/services/auth";
import {
  createOrganizationSchema,
  createProjectSchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
  updateOrganizationSchema,
  updateProjectSchema,
} from "@/lib/validations/project";
import { fromZodError, type FormState } from "@/lib/form-state";
import {
  createOrganization as createOrganizationService,
  getMyRoleForOrganization,
  updateOrganization as updateOrganizationService,
} from "@/services/organizations";
import { can } from "@/config/permissions";
import {
  createProject as createProjectService,
  getProjectById,
  getMyRoleForProject,
  updateProject as updateProjectService,
} from "@/services/projects";
import {
  inviteProjectMember,
  removeMember as removeMemberService,
  revokeInvitation as revokeInvitationService,
  updateMemberRole as updateMemberRoleService,
} from "@/services/members";

function parseTechStack(raw: string | undefined) {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function createOrganizationAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = createOrganizationSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description"),
  });
  if (!parsed.success) return fromZodError(parsed.error);

  try {
    const org = await createOrganizationService({
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description,
      userId: user.id,
    });
    revalidatePath("/", "layout");
    redirect(`/projects?org=${org.id}`);
  } catch (error) {
    if (isRedirect(error)) throw error;
    return { status: "error", message: dbErrorMessage(error) };
  }
}

export async function updateOrganizationAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = updateOrganizationSchema.safeParse({
    organizationId: formData.get("organizationId"),
    name: formData.get("name"),
    description: formData.get("description"),
  });
  if (!parsed.success) return fromZodError(parsed.error);

  const role = await getMyRoleForOrganization(parsed.data.organizationId, user.id);
  if (!can(role, "organization:manage")) {
    return { status: "error", message: "Only administrators can edit the organization." };
  }

  try {
    await updateOrganizationService({
      organizationId: parsed.data.organizationId,
      actorId: user.id,
      name: parsed.data.name,
      description: parsed.data.description,
    });
    revalidatePath("/settings/organization");
    revalidatePath("/", "layout");
    return { status: "success", message: "Organization updated." };
  } catch (error) {
    return { status: "error", message: dbErrorMessage(error) };
  }
}

export async function createProjectAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = createProjectSchema.safeParse({
    organizationId: formData.get("organizationId"),
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    repositoryUrl: formData.get("repositoryUrl"),
    techStack: formData.get("techStack"),
  });
  if (!parsed.success) return fromZodError(parsed.error);

  try {
    const project = await createProjectService({
      organizationId: parsed.data.organizationId,
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description,
      repositoryUrl: parsed.data.repositoryUrl,
      techStack: parseTechStack(parsed.data.techStack),
      userId: user.id,
    });
    revalidatePath("/projects");
    redirect(`/projects/${project.id}`);
  } catch (error) {
    if (isRedirect(error)) throw error;
    return { status: "error", message: dbErrorMessage(error) };
  }
}

export async function updateProjectAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = updateProjectSchema.safeParse({
    projectId: formData.get("projectId"),
    name: formData.get("name"),
    description: formData.get("description"),
    repositoryUrl: formData.get("repositoryUrl"),
    techStack: formData.get("techStack"),
    status: formData.get("status"),
  });
  if (!parsed.success) return fromZodError(parsed.error);

  const role = await getMyRoleForProject(parsed.data.projectId, user.id);
  if (!can(role, "project:update")) {
    return { status: "error", message: "You don't have permission to edit this project." };
  }

  try {
    await updateProjectService({
      projectId: parsed.data.projectId,
      actorId: user.id,
      name: parsed.data.name,
      description: parsed.data.description,
      repositoryUrl: parsed.data.repositoryUrl,
      techStack: parseTechStack(parsed.data.techStack),
      status: parsed.data.status,
    });
    revalidatePath(`/projects/${parsed.data.projectId}`);
    return { status: "success", message: "Project updated." };
  } catch (error) {
    return { status: "error", message: dbErrorMessage(error) };
  }
}

export async function inviteMemberAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = inviteMemberSchema.safeParse({
    projectId: formData.get("projectId"),
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) return fromZodError(parsed.error);

  const role = await getMyRoleForProject(parsed.data.projectId, user.id);
  if (!can(role, "project:manage_members")) {
    return { status: "error", message: "You don't have permission to invite members." };
  }

  const project = await getProjectById(parsed.data.projectId);
  if (!project) return { status: "error", message: "Project not found." };

  try {
    const result = await inviteProjectMember({
      project,
      email: parsed.data.email,
      role: parsed.data.role,
      invitedBy: user.id,
    });
    revalidatePath(`/projects/${project.id}/members`);
    return {
      status: "success",
      message:
        result.status === "added"
          ? "Member added to the project."
          : "Invitation sent - they'll be added automatically when they sign up.",
    };
  } catch (error) {
    return { status: "error", message: dbErrorMessage(error) };
  }
}

export async function updateMemberRoleAction(input: {
  projectId: string;
  memberId: string;
  memberUserId: string;
  memberName: string;
  role: FormDataEntryValue;
}) {
  const user = await requireUser();
  const parsed = updateMemberRoleSchema.safeParse({
    projectId: input.projectId,
    memberId: input.memberId,
    role: input.role,
  });
  if (!parsed.success) throw new Error("Invalid role change request.");

  const role = await getMyRoleForProject(parsed.data.projectId, user.id);
  if (!can(role, "project:manage_members")) {
    throw new Error("You don't have permission to change member roles.");
  }

  const project = await getProjectById(parsed.data.projectId);
  if (!project) throw new Error("Project not found.");

  await updateMemberRoleService({
    project,
    memberId: parsed.data.memberId,
    memberUserId: input.memberUserId,
    memberName: input.memberName,
    role: parsed.data.role,
    actorId: user.id,
  });

  revalidatePath(`/projects/${project.id}/members`);
}

export async function removeMemberAction(input: {
  projectId: string;
  memberId: string;
  memberUserId: string;
  memberName: string;
}) {
  const user = await requireUser();
  const role = await getMyRoleForProject(input.projectId, user.id);
  if (!can(role, "project:manage_members")) {
    throw new Error("You don't have permission to remove members.");
  }

  const project = await getProjectById(input.projectId);
  if (!project) throw new Error("Project not found.");

  await removeMemberService({
    project,
    memberId: input.memberId,
    memberUserId: input.memberUserId,
    memberName: input.memberName,
    actorId: user.id,
  });

  revalidatePath(`/projects/${project.id}/members`);
}

export async function revokeInvitationAction(input: {
  projectId: string;
  invitationId: string;
}) {
  const user = await requireUser();
  const role = await getMyRoleForProject(input.projectId, user.id);
  if (!can(role, "project:manage_members")) {
    throw new Error("You don't have permission to manage invitations.");
  }

  await revokeInvitationService(input.invitationId);
  revalidatePath(`/projects/${input.projectId}/members`);
}

function isRedirect(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

function dbErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message: unknown }).message);
    if (message.includes("duplicate key")) {
      return "That slug is already taken - choose another.";
    }
    return message;
  }
  return "Something went wrong. Please try again.";
}
