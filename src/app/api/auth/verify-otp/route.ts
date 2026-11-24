import { cookies } from "next/headers";
import { callBackend, pickUser, SESSION_COOKIE, sessionCookieOptions } from "@/lib/server/backend";

// Sign-up step 2. The backend logs the user in once the OTP is verified, so
// store its token the same way as a normal login.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  let result;
  try {
    result = await callBackend("otp", {
      method: "POST",
      body: { gmail: body?.gmail, otp: body?.otp },
    });
  } catch {
    return Response.json({ success: false, message: "Cannot reach the server. Please try again." }, { status: 502 });
  }

  const { status, data } = result;
  const token = typeof data.token === "string" ? data.token : null;
  const user = pickUser(data.user);

  if (status >= 400 || !token || !user) {
    return Response.json(
      { success: false, message: String(data.message ?? "Verification failed") },
      { status: status >= 400 ? status : 500 },
    );
  }

  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions);
  return Response.json({ success: true, user, mustResetPassword: data.mustResetPassword === true });
}
