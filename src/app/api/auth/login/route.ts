import { cookies } from "next/headers";
import { callBackend, pickUser, SESSION_COOKIE, sessionCookieOptions } from "@/lib/server/backend";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  let result;
  try {
    result = await callBackend("login", {
      method: "POST",
      body: { gmail: body?.gmail, password: body?.password },
    });
  } catch {
    return Response.json({ success: false, message: "Cannot reach the server. Please try again." }, { status: 502 });
  }

  const { status, data } = result;
  const token = typeof data.token === "string" ? data.token : null;
  const user = pickUser(data.user);

  if (status >= 400 || !token || !user) {
    return Response.json(
      { success: false, message: String(data.message ?? "Login failed") },
      { status: status >= 400 ? status : 500 },
    );
  }

  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions);
  return Response.json({ success: true, user });
}
