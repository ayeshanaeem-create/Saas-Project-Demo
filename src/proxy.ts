import { NextResponse, type NextRequest } from "next/server";

import { isAuthorized } from "@/lib/demo-auth";

/**
 * Optional password for a deployed demo. When DEMO_PASSWORD is set, every page and API
 * route asks for it through the browser's built-in sign-in prompt (HTTP Basic auth, any
 * username). Unset (the default, and in local development), everything is open.
 */
export function proxy(request: NextRequest) {
  const password = process.env.DEMO_PASSWORD;
  if (!password || isAuthorized(request.headers.get("authorization"), password)) return NextResponse.next();

  return new NextResponse("This BookMate AI demo is password protected.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="BookMate AI demo", charset="UTF-8"' },
  });
}

export const config = {
  // Everything except Next.js's own static files and the app icon.
  matcher: ["/((?!_next/static|_next/image|icon\\.svg).*)"],
};
