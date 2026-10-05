// middleware.ts (named proxy.ts in Next.js 16)
export { auth as middleware } from "@/auth";

export const config = {
  matcher: ["/upload/:path*", "/studio/:path*", "/account/:path*"],
};