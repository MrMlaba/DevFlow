import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { LoginForm } from "@/features/auth/components/login-form";
import { signIn } from "@/features/auth/actions";

// The real action talks to Supabase via next/headers' cookies(), which
// only works inside an actual Next.js request - mock it for a pure
// component test (Authentication).
jest.mock("@/features/auth/actions", () => ({
  signIn: jest.fn(),
}));

const mockSignIn = signIn as jest.Mock;

describe("LoginForm", () => {
  beforeEach(() => {
    mockSignIn.mockReset();
  });

  it("renders email and password fields", () => {
    render(<LoginForm />);

    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Forgot password?" })).toHaveAttribute(
      "href",
      "/forgot-password",
    );
  });

  it("includes a hidden redirect field when redirectTo is set", () => {
    const { container } = render(<LoginForm redirectTo="/projects/123" />);

    const hidden = container.querySelector('input[name="redirect"]');
    expect(hidden).toHaveValue("/projects/123");
  });

  it("shows the server action's error message after a failed submit", async () => {
    mockSignIn.mockResolvedValue({
      status: "error",
      message: "Incorrect email or password.",
    });

    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("Password"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByText("Incorrect email or password."),
    ).toBeInTheDocument();
    expect(mockSignIn).toHaveBeenCalledTimes(1);
  });
});
