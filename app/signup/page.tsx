"use client";

import { useState } from "react";
import Link from "next/link";

import {
  CognitoUser,
  CognitoUserPool,
  CognitoUserAttribute,
} from "amazon-cognito-identity-js";

const userPool = new CognitoUserPool({
  UserPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
  ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
});

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [confirmationCode, setConfirmationCode] = useState("");
  const [confirmationMode, setConfirmationMode] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();

    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const pool = userPool;

      const emailAttribute = new CognitoUserAttribute({
        Name: "email",
        Value: email,
      });

      pool.signUp(email, password, [emailAttribute], [], (err) => {
        setLoading(false);

        if (err) {
          setError(err.message || "Unable to create your account.");
          return;
        }

        setConfirmationMode(true);
      });
    } catch {
      setLoading(false);
      setError("Something went wrong. Please try again.");
    }
  }

  function handleConfirm(e: React.FormEvent) {
    e.preventDefault();

    setError("");
    setLoading(true);

    const pool = userPool;

    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: pool,
    });

    cognitoUser.confirmRegistration(
      confirmationCode,
      true,
      (err: Error | undefined) => {
        setLoading(false);

        if (err) {
          setError(err.message || "Invalid confirmation code.");
          return;
        }

        window.location.href = "/signin";
      },
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-5 py-10 font-[family-name:var(--font-body)] text-[var(--foreground)]">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center">
        <div className="w-full rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm sm:p-10">
          <Link
            href="/"
            className="font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-tight text-[var(--foreground)]"
          >
            YouTubby
          </Link>

          {!confirmationMode ? (
            <>
              <div className="mt-10">
                <h1 className="font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-tight">
                  Create your account
                </h1>

                <p className="mt-2 text-[var(--muted)]">
                  Start posting videos for free.
                </p>
              </div>

              <form onSubmit={handleSignUp} className="mt-8 space-y-5">
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Email
                  </label>

                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3.5 text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Password
                  </label>

                  <input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3.5 text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Confirm password
                  </label>

                  <input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3.5 text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                    placeholder="••••••••"
                  />
                </div>

                {error && (
                  <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="hover:cursor-pointer w-full rounded-full bg-[var(--primary)] px-6 py-3.5 text-lg font-semibold text-white transition hover:scale-[1.01] hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Creating account..." : "Create account"}
                </button>
              </form>

              <p className="mt-8 text-center text-sm text-[var(--muted)]">
                Already have an account?{" "}
                <Link
                  href="/signin"
                  className="font-semibold text-[var(--primary)] hover:text-[var(--primary-hover)] hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </>
          ) : (
            <>
              <div className="mt-10">
                <h1 className="font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-tight">
                  Check your email
                </h1>

                <p className="mt-2 text-[var(--muted)]">
                  We sent a verification code to{" "}
                  <strong className="text-[var(--foreground)]">{email}</strong>.
                </p>
              </div>

              <form onSubmit={handleConfirm} className="mt-8 space-y-5">
                <div>
                  <label
                    htmlFor="code"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Verification code
                  </label>

                  <input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                    value={confirmationCode}
                    onChange={(e) => setConfirmationCode(e.target.value)}
                    className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3.5 text-center text-2xl tracking-[0.3em] text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                    placeholder="123456"
                  />
                </div>

                {error && (
                  <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-[var(--primary)] px-6 py-3.5 text-lg font-semibold text-white transition hover:scale-[1.01] hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Verifying..." : "Verify email"}
                </button>
              </form>

              <p className="mt-8 text-center text-sm text-[var(--muted)]">
                Already verified?{" "}
                <Link
                  href="/signin"
                  className="font-semibold text-[var(--primary)] hover:text-[var(--primary-hover)] hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}