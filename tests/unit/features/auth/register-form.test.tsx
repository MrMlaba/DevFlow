import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { RegisterForm } from "@/features/auth/components/register-form";
import { signUp } from "@/features/auth/actions";

jest.mock("@/features/auth/actions", () => ({
  signUp: jest.fn(),
}));

const mockSignUp = signUp as jest.Mock;

describe("RegisterForm", () => {
  beforeEach(() => {
    mockSignUp.mockReset();
  });

  it("renders all four registration fields", () => {
    render(<RegisterForm />);

    expect(screen.getByLabelText("Full name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm password")).toBeInTheDocument();
  });

  it("shows field-level errors from the server action without a generic message", async () => {
    mockSignUp.mockResolvedValue({
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors: { confirmPassword: ["Passwords do not match"] },
    });

    const user = userEvent.setup();
    render(<RegisterForm />);

    await user.type(screen.getByLabelText("Full name"), "Ada Lovelace");
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("Password"), "correcthorse");
    await user.type(screen.getByLabelText("Confirm password"), "different");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("Passwords do not match")).toBeInTheDocument();
    // The generic error banner is suppressed when there are field errors.
    expect(
      screen.queryByText("Please fix the highlighted fields."),
    ).not.toBeInTheDocument();
  });

  it("replaces the form with a confirmation message on success", async () => {
    mockSignUp.mockResolvedValue({
      status: "success",
      message: "Check your email to confirm your account before signing in.",
    });

    const user = userEvent.setup();
    render(<RegisterForm />);

    await user.type(screen.getByLabelText("Full name"), "Ada Lovelace");
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("Password"), "correcthorse");
    await user.type(screen.getByLabelText("Confirm password"), "correcthorse");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(
      await screen.findByText(
        "Check your email to confirm your account before signing in.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
  });
});
