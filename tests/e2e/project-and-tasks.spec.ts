import { expect, test } from "@playwright/test";

import { DEMO_USERS, loginAs } from "./helpers/auth";

// Only org admins can create projects (RLS: "Org admins can create projects"),
// and admin@devflow.dev is the seeded org administrator.
test.describe("Project creation, tasks, assignment, and activity", () => {
  test("creates a project, adds a task, assigns it, and logs an activity event", async ({
    page,
  }) => {
    await loginAs(page, DEMO_USERS.admin.email);

    const stamp = Date.now();
    const projectName = `E2E Project ${stamp}`;
    const taskTitle = `E2E task ${stamp}`;

    // --- Project creation ---
    await page.goto("/projects");
    await page.getByRole("button", { name: "New project" }).click();
    await page.getByLabel("Name").fill(projectName);
    await page.getByRole("button", { name: "Create project" }).click();

    await page.waitForURL(/\/projects\/[0-9a-f-]+$/);
    await expect(page.getByRole("link", { name: projectName })).toBeVisible();

    // The sidebar nav and the project tabs both have links named e.g.
    // "Tasks"/"Overview" - navigate by URL instead of by link text to
    // avoid strict-mode ambiguity between them.
    const projectId = page.url().split("/").pop()!;

    // --- Task creation + assignment ---
    await page.goto(`/projects/${projectId}/tasks`);
    await page.getByRole("button", { name: "New task" }).click();
    await page.getByLabel("Title").fill(taskTitle);
    // Priority combobox, then Assignee combobox - assign to the project
    // creator (admin), the only member of a brand-new project.
    await page.getByRole("combobox").nth(1).click();
    await page.getByRole("option", { name: "Amara Ndlovu" }).click();
    await page.getByRole("button", { name: "Create task" }).click();

    const taskCard = page.getByText(taskTitle, { exact: true });
    await expect(taskCard).toBeVisible();

    // --- Task assignment reflected in the detail view ---
    await taskCard.click();
    await expect(page.getByRole("heading", { name: taskTitle })).toBeVisible();
    await expect(page.getByText("Amara Ndlovu", { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");

    // --- Activity events ---
    await page.goto(`/projects/${projectId}`);
    await expect(page.getByText(`created task "${taskTitle}"`)).toBeVisible();
  });
});
