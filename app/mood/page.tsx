import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";

export default async function MoodPage() {
  await auth.protect();
  return (
    <main className="flex flex-1 flex-col">
      <header className="flex justify-end p-4">
        <UserButton />
      </header>
      <p className="m-auto px-4 text-center text-zinc-600 dark:text-zinc-400">
        You&apos;re signed in. The pick screen arrives in Step 6.
      </p>
    </main>
  );
}
