"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/services/auth";
import {
  addIncidentUpdateSchema,
  createIncidentSchema,
  updateIncidentAssigneeSchema,
  updateIncidentStatusSchema,
} from "@/lib/validations/incident";
import { fromZodError, type FormState } from "@/lib/form-state";
import { getMyRoleForProject, getProjectById } from "@/services/projects";
import {
  addIncidentUpdate as addIncidentUpdateService,
  createIncident as createIncidentService,
  deleteIncident as deleteIncidentService,
  getIncident,
  updateIncidentAssignee as updateIncidentAssigneeService,
  updateIncidentStatus as updateIncidentStatusService,
} from "@/services/incidents";
import { can } from "@/config/permissions";
import type { IncidentStatus } from "@/types/database";

export async function createIncidentAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = createIncidentSchema.safeParse({
    projectId: formData.get("projectId"),
    title: formData.get("title"),
    description: formData.get("description"),
    service: formData.get("service"),
    severity: formData.get("severity") || undefined,
    relatedDeployment: formData.get("relatedDeployment"),
  });
  if (!parsed.success) return fromZodError(parsed.error);

  const role = await getMyRoleForProject(parsed.data.projectId, user.id);
  if (!can(role, "incident:create")) {
    return { status: "error", message: "You don't have permission to report incidents here." };
  }

  const project = await getProjectById(parsed.data.projectId);
  if (!project) return { status: "error", message: "Project not found." };

  try {
    await createIncidentService({
      project,
      title: parsed.data.title,
      description: parsed.data.description,
      service: parsed.data.service,
      severity: parsed.data.severity,
      relatedDeployment: parsed.data.relatedDeployment,
      reporterId: user.id,
    });
    revalidatePath("/incidents");
    return { status: "success", message: "Incident reported." };
  } catch (error) {
    return { status: "error", message: errorMessage(error) };
  }
}

export async function updateIncidentStatusAction(input: {
  incidentId: string;
  status: IncidentStatus;
}) {
  const user = await requireUser();
  const parsed = updateIncidentStatusSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid status.");

  const existing = await getIncident(parsed.data.incidentId);
  if (!existing) throw new Error("Incident not found.");

  const role = await getMyRoleForProject(existing.project_id, user.id);
  if (!can(role, "incident:update")) {
    throw new Error("You don't have permission to update this incident.");
  }

  const project = await getProjectById(existing.project_id);
  if (!project) throw new Error("Project not found.");

  await updateIncidentStatusService({
    project,
    incidentId: parsed.data.incidentId,
    title: existing.title,
    status: parsed.data.status,
    previousStatus: existing.status,
    actorId: user.id,
  });

  revalidatePath("/incidents");
}

export async function updateIncidentAssigneeAction(input: {
  incidentId: string;
  assigneeId: string | null;
}) {
  const user = await requireUser();
  const parsed = updateIncidentAssigneeSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid assignee.");

  const existing = await getIncident(parsed.data.incidentId);
  if (!existing) throw new Error("Incident not found.");

  const role = await getMyRoleForProject(existing.project_id, user.id);
  if (!can(role, "incident:update")) {
    throw new Error("You don't have permission to update this incident.");
  }

  const project = await getProjectById(existing.project_id);
  if (!project) throw new Error("Project not found.");

  await updateIncidentAssigneeService({
    project,
    incidentId: parsed.data.incidentId,
    title: existing.title,
    assigneeId: parsed.data.assigneeId,
    actorId: user.id,
  });

  revalidatePath("/incidents");
}

export async function addIncidentUpdateAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = addIncidentUpdateSchema.safeParse({
    incidentId: formData.get("incidentId"),
    message: formData.get("message"),
    severity: formData.get("severity") || undefined,
    rootCause: formData.get("rootCause"),
    resolution: formData.get("resolution"),
  });
  if (!parsed.success) return fromZodError(parsed.error);

  const existing = await getIncident(parsed.data.incidentId);
  if (!existing) return { status: "error", message: "Incident not found." };

  const role = await getMyRoleForProject(existing.project_id, user.id);
  if (!can(role, "incident:update")) {
    return { status: "error", message: "You don't have permission to update this incident." };
  }

  const project = await getProjectById(existing.project_id);
  if (!project) return { status: "error", message: "Project not found." };

  try {
    await addIncidentUpdateService({
      project,
      incidentId: parsed.data.incidentId,
      title: existing.title,
      message: parsed.data.message,
      previousSeverity: parsed.data.severity ? existing.severity : undefined,
      newSeverity: parsed.data.severity || undefined,
      rootCause: parsed.data.rootCause,
      resolution: parsed.data.resolution,
      actorId: user.id,
    });
    revalidatePath("/incidents");
    return { status: "success", message: "Update posted." };
  } catch (error) {
    return { status: "error", message: errorMessage(error) };
  }
}

export async function deleteIncidentAction(input: { incidentId: string }) {
  const user = await requireUser();
  const existing = await getIncident(input.incidentId);
  if (!existing) throw new Error("Incident not found.");

  const role = await getMyRoleForProject(existing.project_id, user.id);
  if (!can(role, "incident:delete")) {
    throw new Error("You don't have permission to delete this incident.");
  }

  const project = await getProjectById(existing.project_id);
  if (!project) throw new Error("Project not found.");

  await deleteIncidentService({
    project,
    incidentId: input.incidentId,
    title: existing.title,
    actorId: user.id,
  });

  revalidatePath("/incidents");
}

function errorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Something went wrong. Please try again.";
}
