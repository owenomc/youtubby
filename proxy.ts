// proxy.ts
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((request) => {
  const pathname = request.nextUrl.pathname;

  // Public profile routes:
  // /@username -> /profile/username
  if (pathname.startsWith("/@")) {
    const username = pathname.slice(2);

    if (username && !username.includes("/")) {
      const url = request.nextUrl.clone();
      url.pathname = `/profile/${username}`;

      return NextResponse.rewrite(url);
    }
  }

  // Let Auth.js handle protected routes.
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/upload/:path*",
    "/studio/:path*",
    "/account/:path*",
    "/@:path*",
  ],
};