import axios from "axios";
import Cookies from "js-cookie";

// In production, the frontend and backend share the same origin (via Nginx),
// so a relative URL always works. In dev (docker-compose.dev.yml) the explicit
// NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1 env var overrides this.
const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = Cookies.get("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      Cookies.remove("access_token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);
