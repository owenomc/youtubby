"use client";

import { useState } from "react";
import Link from "next/link";

import {
  CognitoUser,
  CognitoUserPool,
  AuthenticationDetails,
} from "amazon-cognito-identity-js";

const userPool = new CognitoUserPool({
  UserPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
  ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
});

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [resetMode, setResetMode] = useState(false);
  const [resetCodeSent, setResetCodeSent] = useState(false);
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  function getCognitoUser() {
    return new CognitoUser({
      Username: email,
      Pool: userPool,
    });
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const user = getCognitoUser();

      const authenticationDetails = new AuthenticationDetails({
        Username: email,
        Password: password,
      });

      user.authenticateUser(authenticationDetails, {
        onSuccess: () => {
          window.location.href = "/";
        },

        onFailure: (err) => {
          setError(err.message || "Unable to sign in.");
          setLoading(false);
        },

        newPasswordRequired: () => {
          setError("A new password is required.");
          setLoading(false);
        },
      });
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  function handleForgotPassword() {
    setError("");
    setSuccess("");
    setPassword("");
    setResetMode(true);
  }

  function handleSendResetCode(e: React.FormEvent) {
    e.preventDefault();

    setError("");
    setSuccess("");
    setLoading(true);

    const user = getCognitoUser();

    user.forgotPassword({
      onSuccess: () => {
        setLoading(false);
        setResetCodeSent(true);
        setSuccess(`A verification code was sent to ${email}.`);
      },

      onFailure: (err) => {
        setLoading(false);
        setError(err.message || "Unable to send password reset code.");
      },

      inputVerificationCode: () => {
        setLoading(false);
        setResetCodeSent(true);
        setSuccess(`A verification code was sent to ${email}.`);
      },
    });
  }

  function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (newPassword !== confirmNewPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!resetCode.trim()) {
      setError("Enter the verification code.");
      return;
    }

    setLoading(true);

    const user = getCognitoUser();

    user.confirmPassword(resetCode, newPassword, {
      onSuccess: () => {
        setLoading(false);
        setSuccess("Your password has been reset. You can now sign in.");
        setResetMode(false);
        setResetCodeSent(false);
        setResetCode("");
        setNewPassword("");
        setConfirmNewPassword("");
        setPassword("");
      },

      onFailure: (err) => {
        setLoading(false);
        setError(err.message || "Unable to reset your password.");
      },
    });
  }

  function handleBackToSignIn() {
    setResetMode(false);
    setResetCodeSent(false);
    setResetCode("");
    setNewPassword("");
    setConfirmNewPassword("");
    setError("");
    setSuccess("");
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

          {!resetMode ? (
            <>
              <div className="mt-10">
                <h1 className="font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-tight">
                  Welcome back
                </h1>

                <p className="mt-2 text-[var(--muted)]">
                  Sign in to continue to YouTubby.
                </p>
              </div>

              <form onSubmit={handleSignIn} className="mt-8 space-y-5">
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
                  <div className="mb-2 flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="block text-sm font-semibold"
                    >
                      Password
                    </label>

                    <button
                      type="button"
                      className="text-sm font-semibold text-[var(--primary)] hover:text-[var(--primary-hover)] hover:underline"
                      onClick={handleForgotPassword}
                    >
                      Forgot password?
                    </button>
                  </div>

                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3.5 text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                    placeholder="••••••••"
                  />
                </div>

                {error && (
                  <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-950/30 dark:text-green-300">
                    {success}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="hover:cursor-pointer w-full rounded-full bg-[var(--primary)] px-6 py-3.5 text-lg font-semibold text-white transition hover:scale-[1.01] hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Signing in..." : "Sign in"}
                </button>
              </form>

              <p className="mt-8 text-center text-sm text-[var(--muted)]">
                Don&apos;t have an account?{" "}
                <Link
                  href="/signup"
                  className="font-semibold text-[var(--primary)] hover:text-[var(--primary-hover)] hover:underline"
                >
                  Create one
                </Link>
              </p>
            </>
          ) : (
            <>
              <div className="mt-10">
                <h1 className="font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-tight">
                  {resetCodeSent ? "Reset your password" : "Forgot password?"}
                </h1>

                <p className="mt-2 text-[var(--muted)]">
                  {resetCodeSent
                    ? `Enter the verification code sent to ${email} and choose a new password.`
                    : "Enter your email and we'll send you a verification code."}
                </p>
              </div>

              {!resetCodeSent ? (
                <form
                  onSubmit={handleSendResetCode}
                  className="mt-8 space-y-5"
                >
                  <div>
                    <label
                      htmlFor="resetEmail"
                      className="mb-2 block text-sm font-semibold"
                    >
                      Email
                    </label>

                    <input
                      id="resetEmail"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3.5 text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                      placeholder="you@example.com"
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
                    {loading ? "Sending..." : "Send reset code"}
                  </button>
                </form>
              ) : (
                <form
                  onSubmit={handleResetPassword}
                  className="mt-8 space-y-5"
                >
                  <div>
                    <label
                      htmlFor="resetCode"
                      className="mb-2 block text-sm font-semibold"
                    >
                      Verification code
                    </label>

                    <input
                      id="resetCode"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      required
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value)}
                      className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3.5 text-center text-2xl tracking-[0.3em] text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                      placeholder="123456"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="newPassword"
                      className="mb-2 block text-sm font-semibold"
                    >
                      New password
                    </label>

                    <input
                      id="newPassword"
                      type="password"
                      autoComplete="new-password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3.5 text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                      placeholder="••••••••"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="confirmNewPassword"
                      className="mb-2 block text-sm font-semibold"
                    >
                      Confirm new password
                    </label>

                    <input
                      id="confirmNewPassword"
                      type="password"
                      autoComplete="new-password"
                      required
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3.5 text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                      placeholder="••••••••"
                    />
                  </div>

                  {error && (
                    <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-950/30 dark:text-green-300">
                      {success}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-full bg-[var(--primary)] px-6 py-3.5 text-lg font-semibold text-white transition hover:scale-[1.01] hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? "Resetting..." : "Reset password"}
                  </button>
                </form>
              )}

              <button
                type="button"
                onClick={handleBackToSignIn}
                className="mt-6 w-full text-center text-sm font-semibold text-[var(--primary)] hover:text-[var(--primary-hover)] hover:underline"
              >
                Back to sign in
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}