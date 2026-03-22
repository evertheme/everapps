/**
 * Unit tests for auth helper functions (login, register, logout, getMe).
 */
import MockAdapter from "axios-mock-adapter";
import { api } from "@/lib/api";
import { login, register, logout, getMe } from "@/lib/auth";

jest.mock("js-cookie", () => ({
  get: jest.fn(),
  set: jest.fn(),
  remove: jest.fn(),
}));

import Cookies from "js-cookie";

const mockAdapter = new MockAdapter(api);

const MOCK_USER = {
  id: "user-uuid-1",
  email: "test@example.com",
  full_name: "Test User",
  is_active: true,
  created_at: "2024-01-01T00:00:00Z",
};

const MOCK_AUTH_RESPONSE = {
  access_token: "jwt.token.here",
  token_type: "bearer",
  user: MOCK_USER,
};

afterEach(() => {
  mockAdapter.reset();
  jest.clearAllMocks();
});

describe("login()", () => {
  it("calls /auth/login and stores the token in a cookie", async () => {
    mockAdapter.onPost("/auth/login").reply(200, MOCK_AUTH_RESPONSE);

    const result = await login("test@example.com", "password");

    expect(result.access_token).toBe("jwt.token.here");
    expect(result.user.email).toBe("test@example.com");
    expect(Cookies.set).toHaveBeenCalledWith(
      "access_token",
      "jwt.token.here",
      expect.objectContaining({ expires: 1 })
    );
  });

  it("throws on invalid credentials (401)", async () => {
    mockAdapter.onPost("/auth/login").reply(401, { detail: "Invalid credentials" });
    await expect(login("bad@example.com", "wrong")).rejects.toThrow();
  });
});

describe("register()", () => {
  it("calls /auth/register and stores the token", async () => {
    mockAdapter.onPost("/auth/register").reply(201, MOCK_AUTH_RESPONSE);

    const result = await register("test@example.com", "password", "Test User");

    expect(result.user.full_name).toBe("Test User");
    expect(Cookies.set).toHaveBeenCalledWith(
      "access_token",
      "jwt.token.here",
      expect.anything()
    );
  });

  it("throws on duplicate email (409)", async () => {
    mockAdapter.onPost("/auth/register").reply(409, { detail: "Email already registered" });
    await expect(register("dup@example.com", "pass", "User")).rejects.toThrow();
  });
});

describe("getMe()", () => {
  it("fetches the current user", async () => {
    mockAdapter.onGet("/auth/me").reply(200, MOCK_USER);
    const user = await getMe();
    expect(user.email).toBe("test@example.com");
  });

  it("throws when not authenticated (401)", async () => {
    mockAdapter.onGet("/auth/me").reply(401);
    await expect(getMe()).rejects.toThrow();
  });
});

describe("logout()", () => {
  it("removes the access_token cookie", () => {
    // jsdom doesn't implement window.location.href assignment, so we just check the cookie removal
    logout();
    expect(Cookies.remove).toHaveBeenCalledWith("access_token");
  });
});
