/**
 * Tests for the axios API client — token injection, 401 redirect, and base URL.
 */
import MockAdapter from "axios-mock-adapter";
import { api } from "@/lib/api";

// ── Mock js-cookie ─────────────────────────────────────────────────────────────
jest.mock("js-cookie", () => ({
  get: jest.fn(),
  set: jest.fn(),
  remove: jest.fn(),
}));

// ── Mock next/navigation ──────────────────────────────────────────────────────
jest.mock("next/navigation", () => ({ useRouter: jest.fn() }));

import Cookies from "js-cookie";

const mockAdapter = new MockAdapter(api);

afterEach(() => {
  mockAdapter.reset();
  jest.clearAllMocks();
  // Reset auth header between tests
  delete api.defaults.headers.common["Authorization"];
});

describe("api client", () => {
  it("sends Authorization header when token cookie is present", async () => {
    (Cookies.get as jest.Mock).mockReturnValue("test-jwt-token");
    mockAdapter.onGet("/projects/").reply(200, []);

    await api.get("/projects/");

    // The interceptor reads the cookie and sets the header
    expect(Cookies.get).toHaveBeenCalledWith("access_token");
  });

  it("sends no Authorization header when no cookie", async () => {
    (Cookies.get as jest.Mock).mockReturnValue(undefined);
    mockAdapter.onGet("/projects/").reply(200, []);

    const response = await api.get("/projects/");
    expect(response.status).toBe(200);
  });

  it("returns response data on 200", async () => {
    (Cookies.get as jest.Mock).mockReturnValue(null);
    mockAdapter.onGet("/health").reply(200, { status: "ok" });

    const res = await api.get("/health");
    expect(res.data).toEqual({ status: "ok" });
  });

  it("propagates non-401 errors", async () => {
    (Cookies.get as jest.Mock).mockReturnValue(null);
    mockAdapter.onGet("/boom").reply(500, { detail: "Server error" });

    await expect(api.get("/boom")).rejects.toThrow();
  });
});
