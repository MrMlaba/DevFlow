import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CreateProjectDialog } from "@/features/projects/components/create-project-dialog";
import { createProjectAction } from "@/features/projects/actions";

// The real action calls Supabase and redirect() - mock it for a pure
// component test (Project creation).
jest.mock("@/features/projects/actions", () => ({
  createProjectAction: jest.fn(),
}));

const mockCreateProject = createProjectAction as jest.Mock;
const ORG_ID = "11111111-1111-4111-8111-111111111111";

describe("CreateProjectDialog", () => {
  beforeEach(() => {
    mockCreateProject.mockReset();
    mockCreateProject.mockResolvedValue({ status: "idle" });
  });

  it("opens the dialog and shows the form when the trigger is clicked", async () => {
    const user = userEvent.setup();
    render(<CreateProjectDialog organizationId={ORG_ID} />);

    expect(screen.queryByText("Create a project")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /new project/i }));

    expect(await screen.findByText("Create a project")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Slug")).toBeInTheDocument();
  });

  it("auto-generates a slug from the project name until the slug is edited directly", async () => {
    const user = userEvent.setup();
    render(<CreateProjectDialog organizationId={ORG_ID} />);
    await user.click(screen.getByRole("button", { name: /new project/i }));

    const nameInput = await screen.findByLabelText("Name");
    const slugInput = screen.getByLabelText("Slug") as HTMLInputElement;

    await user.type(nameInput, "Student Portal");
    expect(slugInput.value).toBe("student-portal");

    // Once the slug is edited by hand, typing more into the name field
    // shouldn't overwrite the user's manual slug.
    await user.clear(slugInput);
    await user.type(slugInput, "custom-slug");
    await user.type(nameInput, " 2024");
    expect(slugInput.value).toBe("custom-slug");
  });

  it("shows the server action's error message after a failed submit", async () => {
    mockCreateProject.mockResolvedValue({
      status: "error",
      message: "That slug is already taken - choose another.",
    });

    const user = userEvent.setup();
    render(<CreateProjectDialog organizationId={ORG_ID} />);
    await user.click(screen.getByRole("button", { name: /new project/i }));

    await user.type(await screen.findByLabelText("Name"), "Student Portal");
    await user.click(screen.getByRole("button", { name: "Create project" }));

    expect(
      await screen.findByText("That slug is already taken - choose another."),
    ).toBeInTheDocument();
  });
});
