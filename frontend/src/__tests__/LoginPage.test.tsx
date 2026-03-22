import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── Mocks ──────────────────────────────────────────────────────────────────────
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("next/link", () => {
  const Link = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  );
  Link.displayName = "Link";
  return Link;
});
jest.mock("@/lib/auth", () => ({
  login: jest.fn(),
}));
jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
  error: jest.fn(),
}));

import LoginPage from "@/app/(auth)/login/page";
import { login } from "@/lib/auth";
import toast from "react-hot-toast";

describe("LoginPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders email and password fields", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("renders a sign-in button", () => {
    render(<LoginPage />);
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("has a link to the register page", () => {
    render(<LoginPage />);
    const link = screen.getByRole("link", { name: /create one/i });
    expect(link).toHaveAttribute("href", "/register");
  });

  it("calls login() with entered credentials on submit", async () => {
    (login as jest.Mock).mockResolvedValue({ access_token: "tok", user: { email: "x@x.com" } });
    render(<LoginPage />);

    await userEvent.type(screen.getByLabelText(/email/i), "user@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "mypassword");
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith("user@example.com", "mypassword");
    });
  });

  it("redirects to /dashboard on success", async () => {
    (login as jest.Mock).mockResolvedValue({ access_token: "tok", user: {} });
    render(<LoginPage />);

    await userEvent.type(screen.getByLabelText(/email/i), "user@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "password");
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("shows error toast on login failure", async () => {
    (login as jest.Mock).mockRejectedValue(new Error("Unauthorized"));
    render(<LoginPage />);

    await userEvent.type(screen.getByLabelText(/email/i), "bad@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "wrongpass");
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Invalid email or password");
    });
  });

  it("disables the submit button while loading", async () => {
    let resolve!: () => void;
    (login as jest.Mock).mockImplementation(
      () => new Promise((res) => { resolve = () => res({ access_token: "tok", user: {} }); })
    );
    render(<LoginPage />);

    await userEvent.type(screen.getByLabelText(/email/i), "user@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "pass");
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(screen.getByRole("button", { name: /signing in/i })).toBeDisabled();
    resolve();
  });
});
