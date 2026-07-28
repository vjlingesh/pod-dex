/** Same-origin base — Vite proxies /api to the Hono server in development. */
const BASE = "/api";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    ...init,
    headers: {
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new ApiError(res.status, detail || `Request failed: ${res.status}`);
  }

  return (await res.json()) as T;
}

export type Health = { ok: boolean; db: boolean };

export const getHealth = () => apiFetch<Health>("/health");
