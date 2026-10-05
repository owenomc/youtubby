"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CognitoUserPool } from "amazon-cognito-identity-js";

const userPool = new CognitoUserPool({
  UserPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
  ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
});

export default function HomeAuth({ showCta = false }: { showCta?: boolean }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const applyTheme = (loggedIn: boolean) => {
      if (!loggedIn) {
        // Logged out users are always in light mode.
        document.documentElement.classList.remove("dark");
        return;
      }

      // Logged in users get their saved theme.
      const savedTheme = localStorage.getItem("youtubby-theme");

      if (savedTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    };

    const currentUser = userPool.getCurrentUser();

    if (!currentUser) {
      applyTheme(false);
      return;
    }

    currentUser.getSession((err: Error | null, session: unknown) => {
      const loggedIn = !err && !!session;

      setIsLoggedIn(loggedIn);
      applyTheme(loggedIn);
    });
  }, []);

  if (isLoggedIn) {
    return null;
  }

  if (showCta) {
    return (
      <section className="bg-[#2326e8]">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-5 py-14 sm:px-8 md:flex-row md:items-center">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Ready to post your first video?
            </h2>

            <p className="mt-2 text-lg text-white">
              Creating an account is free and takes a minute.
            </p>
          </div>

          <Link
            href="/signup"
            className="rounded-full bg-white px-8 py-4 text-lg font-semibold text-black transition hover:scale-105"
          >
            Start posting today!
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div className="mx-auto hidden max-w-7xl items-center gap-12 px-5 pt-16 sm:px-8 md:flex">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-5xl font-extrabold leading-[1.02] tracking-tight text-black sm:text-6xl lg:text-7xl">
          Share videos with the world.
        </h1>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/upload"
            className="rounded-full bg-[#2326e8] px-7 py-3.5 text-lg text-white transition hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Upload a video
          </Link>

          <Link
            href="#trending"
            className="rounded-full border-2 border-slate-200 bg-slate-200 px-7 py-3.5 text-lg text-black transition hover:scale-105"
          >
            Browse videos
          </Link>
        </div>
      </div>
    </div>
  );
}