// components/AuthButton.tsx (server component, no "use client" needed)
import { auth, signIn, signOut } from "@/auth";

export default async function AuthButton() {
  const session = await auth();

  if (!session?.user) {
    return (
      <form
        action={async () => {
          "use server";
          await signIn("cognito");
        }}
      >
        <button className="rounded-full border-2 border-black px-4 py-2 text-black">
          Sign in
        </button>
      </form>
    );
  }

  return (
    <form
      action={async () => {
        "use server";
        await signOut();
      }}
    >
      <button className="rounded-full border-2 border-black px-4 py-2 text-black">
        Sign out ({session.user.name ?? session.user.email})
      </button>
    </form>
  );
}