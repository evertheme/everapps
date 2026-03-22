import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("next/link", () => {
  const Link = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  );
  Link.displayName = "Link";
  return Link;
});
jest.mock("@/lib/auth", () => ({ register: jest.fn() }));
jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: { error: jest.fn() },
  error: jest.fn(),
}));

import RegisterPage from "@/app/(auth)/register/page";
import { register } from "@/lib/auth";
import toast from "react-hot-toast";

describe("RegisterPage", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders name, email, and password fields", () => {
    render(<RegisterPage />);
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("has a link to the login page", () => {
    render(<RegisterPage />);
    expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute("href", "/login");
  });

  it("calls register() with form data on submit", async () => {
    (register as jest.Mock).mockResolvedValue({ access_token: "tok", user: {} });
    render(<RegisterPage />);

    await userEvent.type(screen.getByLabelText(/full name/i), "Jane Smith");
    await userEvent.type(screen.getByLabelText(/email/i), "jane@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "Password123");
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(register).toHaveBeenCalledWith("jane@example.com", "Password123", "Jane Smith");
    });
  });

  it("redirects to /dashboard after successful registration", async () => {
    (register as jest.Mock).mockResolvedValue({ access_token: "tok", user: {} });
    render(<RegisterPage />);

    await userEvent.type(screen.getByLabelText(/full name/i), "Jane");
    await userEvent.type(screen.getByLabelText(/email/i), "jane@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "Password123");
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/dashboard"));
  });

  it("shows error toast on registration failure", async () => {
    (register as jest.Mock).mockRejectedValue({
      response: { data: { detail: "Email already registered" } },
    });
    render(<RegisterPage />);

    await userEvent.type(screen.getByLabelText(/full name/i), "Jane");
    await userEvent.type(screen.getByLabelText(/email/i), "dup@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "Password123");
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Email already registered");
    });
  });
});
