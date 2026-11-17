import "server-only";

// Base URL of the Express API. Server-only: the browser talks to this app's
// /api routes, never to the backend directly, so the login token can live in
// an httpOnly cookie that page scripts cannot read.
export function backendUrl(path: string): URL {
  const base = process.env.BACKEND_URL;
  if (!base) {
    throw new Error("BACKEND_URL is not set. Copy .env.example to .env.local.");
  }
  return new URL(path.replace(/^\/+/, ""), base.endsWith("/") ? base : `${base}/`);
}

export const SESSION_COOKIE = "sem_token";

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 30, // 30 days
};

// Calls the backend with JSON and returns the status plus parsed body.
export async function callBackend(
  path: string,
  init: { method?: string; body?: unknown; token?: string } = {},
): Promise<{ status: number; data: Record<string, unknown> }> {
  const headers: Record<string, string> = { accept: "application/json" };
  if (init.body !== undefined) headers["content-type"] = "application/json";
  if (init.token) headers.authorization = `Bearer ${init.token}`;

  const res = await fetch(backendUrl(path), {
    method: init.method ?? "GET",
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });

  let data: Record<string, unknown> = {};
  try {
    data = await res.json();
  } catch {
    data = { message: `Backend returned ${res.status}` };
  }
  return { status: res.status, data };
}

// The user fields the frontend needs. Never pass the raw backend user through:
// older backends include the password hash and OTPs in user responses.
export type SessionUser = {
  _id: string;
  full_name: string;
  gmail: string;
  role: string;
  mobile_number?: number | string;
  extraModules: string[];
};

export function pickUser(raw: unknown): SessionUser | null {
  if (!raw || typeof raw !== "object") return null;
  const u = raw as Record<string, unknown>;
  if (typeof u._id !== "string" || typeof u.role !== "string") return null;
  return {
    _id: u._id,
    full_name: String(u.full_name ?? ""),
    gmail: String(u.gmail ?? ""),
    role: u.role.toLowerCase(),
    mobile_number: (u.mobile_number as number | string | undefined) ?? undefined,
    extraModules: Array.isArray(u.extraModules) ? u.extraModules.filter((m): m is string => typeof m === "string") : [],
  };
}

// Reads the user id from the token payload without verifying it. Safe here:
// the id is only used to ask the backend for that user WITH the same token,
// and the backend verifies the signature.
export function tokenUserId(token: string): string | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    return typeof payload?._id === "string" ? payload._id : null;
  } catch {
    return null;
  }
}
