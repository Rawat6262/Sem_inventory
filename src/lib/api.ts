// Browser-side helper for calling the backend through this app's proxy.

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

type Options = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  formData?: FormData;
};

async function request<T>(url: string, { method = "GET", body, formData }: Options = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: body !== undefined ? { "content-type": "application/json" } : undefined,
      body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
  } catch {
    throw new ApiError("Cannot reach the server. Check your connection.", 0);
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // Some endpoints return no body.
  }

  if (!res.ok) {
    const raw = data && typeof data === "object" ? (data as { message?: unknown }).message : undefined;
    const message = typeof raw === "string" && raw ? raw : `Request failed (${res.status})`;
    throw new ApiError(message, res.status);
  }
  return data as T;
}

// Calls a backend route, e.g. api("getAllClients") or api(`signup/${id}`, { method: "PUT", body }).
export function api<T = unknown>(path: string, options?: Options): Promise<T> {
  return request<T>(`/api/backend/${path.replace(/^\/+/, "")}`, options);
}

// Calls this app's own auth routes (login, verify-otp, logout, me).
export function authApi<T = unknown>(path: string, options?: Options): Promise<T> {
  return request<T>(`/api/auth/${path}`, options);
}

// Only allow redirects back into this app after login (no //evil.com).
export function safeNext(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}
