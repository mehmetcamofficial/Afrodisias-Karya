import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { clerkPreviewConfigured } from "./lib/clerk-preview";

const authorizedParties = [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL]
  .filter((hostname): hostname is string => Boolean(hostname))
  .map((hostname) => `https://${hostname}`);

const authenticate = clerkMiddleware({ authorizedParties });

export function proxy(request: NextRequest, event: NextFetchEvent) {
  if (!clerkPreviewConfigured()) return NextResponse.next();
  return authenticate(request, event);
}

export const config = {
  matcher: ["/admin/:path*", "/api/orders/:path*", "/api/products/:path*", "/api/admin/:path*"],
};
