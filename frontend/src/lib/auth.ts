import Cookies from "js-cookie";
import { api } from "./api";
import type { AuthResponse, User } from "@/types";

export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/auth/login", { email, password });
  Cookies.set("access_token", data.access_token, { expires: 1, sameSite: "strict" });
  return data;
}

export async function register(
  email: string,
  password: string,
  full_name: string
): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/auth/register", { email, password, full_name });
  Cookies.set("access_token", data.access_token, { expires: 1, sameSite: "strict" });
  return data;
}

export function logout(): void {
  Cookies.remove("access_token");
  window.location.href = "/login";
}

export async function getMe(): Promise<User> {
  const { data } = await api.get<User>("/auth/me");
  return data;
}
