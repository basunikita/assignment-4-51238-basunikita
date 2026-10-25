import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Sending signed-out visitors to sign-in here gives them a clean redirect,
// but it is not the access check: path matching can miss routes, so every
// page and server action that touches someone's data checks auth itself.
export default clerkMiddleware(async (auth, request) => {
  const { pathname } = request.nextUrl;
  if (pathname === "/mood" || pathname.startsWith("/mood/")) {
    await auth.protect();
  } else if (pathname === "/") {
    const { userId } = await auth();
    if (userId) return NextResponse.redirect(new URL("/mood", request.url));
  }
});

export const config = {
  matcher: [
    // /art/ serves public museum images, so Clerk has nothing to do there.
    "/((?!_next|art/|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
