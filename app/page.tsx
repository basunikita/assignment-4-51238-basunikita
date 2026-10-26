import { SignInButton, SignUpButton } from "@clerk/nextjs";

export default function LandingPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">Mood Tracker</h1>
      <p className="max-w-sm text-lg text-zinc-600 dark:text-zinc-400">
        Pick the painting that feels like you right now, and watch your moods add up.
      </p>
      <div className="flex gap-3">
        <SignInButton>
          <button className="rounded-full bg-zinc-900 px-5 py-2.5 font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300">
            Sign in
          </button>
        </SignInButton>
        <SignUpButton>
          <button className="rounded-full border border-zinc-300 px-5 py-2.5 font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
            Sign up
          </button>
        </SignUpButton>
      </div>
    </main>
  );
}
