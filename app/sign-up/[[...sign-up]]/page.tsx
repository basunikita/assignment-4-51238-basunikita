import { SignUp } from "@clerk/nextjs";
import { Suspense } from "react";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Suspense fallback={<p className="text-zinc-500">Loading sign-up…</p>}>
        <SignUp />
      </Suspense>
    </div>
  );
}
