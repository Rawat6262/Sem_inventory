import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { backendUrl, SESSION_COOKIE } from "@/lib/server/backend";

// Forwards /api/backend/<path> to the Express API, attaching the login token
// from the httpOnly cookie. This also avoids CORS: the browser only ever talks
// to this app's own origin.

// These return a token in the response body. They go through /api/auth/* so
// the token is stored in the cookie and never handed to page scripts.
const BLOCKED = new Set(["login", "otp"]);

async function handle(req: NextRequest, ctx: RouteContext<"/api/backend/[...path]">) {
  const { path } = await ctx.params;

  if (path.length === 1 && BLOCKED.has(path[0].toLowerCase())) {
    return Response.json({ success: false, message: "Not found" }, { status: 404 });
  }

  const url = backendUrl(path.map(encodeURIComponent).join("/"));
  url.search = req.nextUrl.search;

  const headers = new Headers({ accept: req.headers.get("accept") ?? "application/json" });
  const contentType = req.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) headers.set("authorization", `Bearer ${token}`);

  const hasBody = req.method !== "GET" && req.method !== "HEAD";

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: req.method,
      headers,
      body: hasBody ? await req.arrayBuffer() : undefined,
      cache: "no-store",
      redirect: "manual",
    });
  } catch {
    return Response.json(
      { success: false, message: "Cannot reach the server. Please try again." },
      { status: 502 },
    );
  }

  const out = new Headers();
  for (const name of ["content-type", "content-disposition"]) {
    const value = upstream.headers.get(name);
    if (value) out.set(name, value);
  }
  return new Response(upstream.body, { status: upstream.status, headers: out });
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
