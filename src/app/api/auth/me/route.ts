import { cookies } from "next/headers";
import { callBackend, pickUser, SESSION_COOKIE, tokenUserId } from "@/lib/server/backend";

// Returns the signed-in user, fresh from the backend, so a role change made
// by an admin shows up without logging out.
export async function GET() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const userId = token ? tokenUserId(token) : null;

  if (!token || !userId) {
    return Response.json({ success: false, message: "Not signed in" }, { status: 401 });
  }

  let result;
  try {
    result = await callBackend(`signup/${encodeURIComponent(userId)}`, { token });
  } catch {
    return Response.json({ success: false, message: "Cannot reach the server. Please try again." }, { status: 502 });
  }

  const user = result.status < 400 ? pickUser(result.data.data) : null;

  if (!user) {
    // Token rejected, account deleted or no longer verified: end the session.
    if ([401, 403, 404].includes(result.status) || result.status < 400) {
      store.delete(SESSION_COOKIE);
      return Response.json({ success: false, message: "Session ended. Please log in again." }, { status: 401 });
    }
    return Response.json({ success: false, message: String(result.data.message ?? "Could not load your account") }, { status: result.status });
  }

  return Response.json({ success: true, user });
}
