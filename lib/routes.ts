// Server actions are POSTs to the page's own URL. Redirecting one to sign-in
// would hand the browser a sign-in page instead of the action's answer, so
// actions check the session themselves and say "Your session ended".
export function redirectsSignedOutVisitors(pathname: string, isServerAction: boolean): boolean {
  if (isServerAction) return false;
  return pathname === "/mood" || pathname.startsWith("/mood/");
}
