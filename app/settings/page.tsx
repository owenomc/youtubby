"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  CognitoUserAttribute,
  CognitoUserPool,
} from "amazon-cognito-identity-js";

const userPool = new CognitoUserPool({
  UserPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
  ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
});

type Theme = "light" | "dark" | "system";

const LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "German",
  "Portuguese",
  "Mandarin",
];

function applyTheme(theme: Theme) {
  const root = document.documentElement;

  if (theme === "dark") {
    root.classList.add("dark");
    return;
  }

  if (theme === "light") {
    root.classList.remove("dark");
    return;
  }

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  root.classList.toggle("dark", prefersDark);
}

function cleanUsername(value: string) {
  return value
    .trim()
    .replace(/^@/, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "");
}

const STORAGE_EVENT = "youtubby-storage";

function subscribeToStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(STORAGE_EVENT, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(STORAGE_EVENT, callback);
  };
}

// Reads a localStorage value without hydration mismatches: the server and the
// first client render use `null`, then React re-renders with the real value.
function useStoredValue(key: string): string | null {
  return useSyncExternalStore(
    subscribeToStorage,
    () => window.localStorage.getItem(key),
    () => null,
  );
}

function setStoredValue(key: string, value: string) {
  window.localStorage.setItem(key, value);
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

export default function SettingsPage() {
  const [email, setEmail] = useState("");

  const [username, setUsername] = useState("");
  const [originalUsername, setOriginalUsername] = useState("");

  const [displayName, setDisplayName] = useState("");
  const [originalDisplayName, setOriginalDisplayName] = useState("");

  const [profilePicture, setProfilePicture] = useState("");
  const [uploadingPicture, setUploadingPicture] = useState(false);

  const savedLanguage = useStoredValue("youtubby-language");
  const language =
    savedLanguage && LANGUAGES.includes(savedLanguage)
      ? savedLanguage
      : "English";

  const savedEmailUpdates = useStoredValue("youtubby-email-updates");
  const emailUpdates =
    savedEmailUpdates === null ? true : savedEmailUpdates === "true";

  const savedTheme = useStoredValue("youtubby-theme");
  const theme: Theme =
    savedTheme === "light" || savedTheme === "dark" || savedTheme === "system"
      ? savedTheme
      : "light";

  const [themeOpen, setThemeOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");

  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const pictureInputRef = useRef<HTMLInputElement>(null);

  const themeRef = useRef<HTMLDivElement>(null);
  const languageRef = useRef<HTMLDivElement>(null);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveRequestRef = useRef(0);
  const profileLoadedRef = useRef(false);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const currentUser = userPool.getCurrentUser();

    if (!currentUser) {
      window.location.href = "/signin";
      return;
    }

    currentUser.getSession((err: Error | null, session: unknown) => {
      if (err || !session) {
        window.location.href = "/signin";
        return;
      }

      currentUser.getUserAttributes((attributeError, attributes) => {
        if (attributeError || !attributes) {
          return;
        }

        const getAttribute = (name: string) =>
          attributes
            .find((attribute) => attribute.getName() === name)
            ?.getValue() || "";

        const currentEmail = getAttribute("email");

        const currentUsername =
          getAttribute("preferred_username") || currentEmail.split("@")[0];

        const currentDisplayName = getAttribute("name") || currentUsername;

        setEmail(currentEmail);

        setUsername(currentUsername);
        setOriginalUsername(currentUsername);

        setDisplayName(currentDisplayName);
        setOriginalDisplayName(currentDisplayName);

        setProfilePicture(
          `/api/profile-picture?username=${encodeURIComponent(
            currentUsername,
          )}&t=${Date.now()}`,
        );

        profileLoadedRef.current = true;
      });
    });
  }, []);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as Node;

      if (!themeRef.current?.contains(target)) {
        setThemeOpen(false);
      }

      if (!languageRef.current?.contains(target)) {
        setLanguageOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      setThemeOpen(false);
      setLanguageOpen(false);

      if (!deletingAccount) {
        setDeleteAccountOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);

      document.removeEventListener("keydown", handleEscape);
    };
  }, [deletingAccount]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  function handleThemeChange(value: Theme) {
    setStoredValue("youtubby-theme", value);

    setThemeOpen(false);
  }

  function handleLanguageChange(value: string) {
    setStoredValue("youtubby-language", value);

    setLanguageOpen(false);
  }

  function handleEmailUpdatesChange(value: boolean) {
    setStoredValue("youtubby-email-updates", String(value));
  }

  async function saveProfile(nextUsername: string, nextDisplayName: string) {
    setProfileError("");

    const cleanedUsername = cleanUsername(nextUsername);

    const cleanedDisplayName = nextDisplayName.trim();

    if (!cleanedDisplayName) {
      setProfileError("Display name is required.");
      setSavingProfile(false);
      return;
    }

    if (cleanedDisplayName.length > 50) {
      setProfileError("Display name must be 50 characters or less.");
      setSavingProfile(false);
      return;
    }

    if (!cleanedUsername) {
      setProfileError("Username is required.");
      setSavingProfile(false);
      return;
    }

    if (cleanedUsername.length < 3 || cleanedUsername.length > 30) {
      setProfileError("Username must be between 3 and 30 characters.");
      setSavingProfile(false);
      return;
    }

    const currentUser = userPool.getCurrentUser();

    if (!currentUser) {
      window.location.href = "/signin";
      return;
    }

    const requestId = ++saveRequestRef.current;

    setSavingProfile(true);

    try {
      await new Promise<void>((resolve, reject) => {
        currentUser.getSession((error: Error | null, session: unknown) => {
          if (error || !session) {
            reject(error ?? new Error("Your session has expired."));
            return;
          }

          resolve();
        });
      });

      const attributes = [
        new CognitoUserAttribute({
          Name: "name",
          Value: cleanedDisplayName,
        }),
        new CognitoUserAttribute({
          Name: "preferred_username",
          Value: cleanedUsername,
        }),
      ];

      await new Promise<void>((resolve, reject) => {
        currentUser.updateAttributes(attributes, (error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });

      const profileResponse = await fetch("/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: cleanedUsername,
          displayName: cleanedDisplayName,
        }),
      });

      const profileData = await profileResponse.json();

      if (!profileResponse.ok) {
        throw new Error(
          profileData?.error || "Unable to save your public profile.",
        );
      }

      if (requestId !== saveRequestRef.current) {
        return;
      }

      setUsername(cleanedUsername);
      setOriginalUsername(cleanedUsername);

      setDisplayName(cleanedDisplayName);
      setOriginalDisplayName(cleanedDisplayName);

      setProfilePicture(
        `/api/profile-picture?username=${encodeURIComponent(
          cleanedUsername,
        )}&t=${Date.now()}`,
      );
    } catch (error) {
      console.error("Unable to update profile:", error);

      if (requestId === saveRequestRef.current) {
        setProfileError(
          error instanceof Error
            ? error.message
            : "Unable to update your profile.",
        );
      }
    } finally {
      if (requestId === saveRequestRef.current) {
        setSavingProfile(false);
      }
    }
  }

  function scheduleProfileSave(nextUsername: string, nextDisplayName: string) {
    if (!profileLoadedRef.current) {
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setProfileError("");
    setSavingProfile(true);

    saveTimeoutRef.current = setTimeout(() => {
      void saveProfile(nextUsername, nextDisplayName);
    }, 700);
  }

  function handleLogout() {
    const currentUser = userPool.getCurrentUser();

    if (currentUser) {
      currentUser.signOut();
    }

    window.location.href = "/";
  }

  function handleDeleteAccount() {
    const currentUser = userPool.getCurrentUser();

    if (!currentUser) {
      window.location.href = "/signin";
      return;
    }

    setDeletingAccount(true);

    currentUser.deleteUser((error) => {
      if (error) {
        setDeletingAccount(false);

        window.alert(error.message || "Unable to delete your account.");

        return;
      }

      window.location.href = "/";
    });
  }

  async function handleProfilePictureChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!username) {
      window.alert("Your username has not loaded yet. Please try again.");

      event.target.value = "";
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

    if (!allowedTypes.includes(file.type)) {
      window.alert("Please choose a JPG, PNG, WebP, or GIF image.");

      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      window.alert("Profile pictures must be 5 MB or smaller.");

      event.target.value = "";
      return;
    }

    setUploadingPicture(true);

    try {
      const formData = new FormData();

      formData.append("file", file);
      formData.append("username", username);

      const response = await fetch("/api/pfp", {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error || `Profile picture upload failed (${response.status}).`,
        );
      }

      const pictureUrl =
        data?.url ||
        `/api/profile-picture?username=${encodeURIComponent(username)}`;

      setProfilePicture(`${pictureUrl}&t=${Date.now()}`);
    } catch (error) {
      console.error("Unable to update profile picture:", error);

      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to update your profile picture.",
      );
    } finally {
      setUploadingPicture(false);
      event.target.value = "";
    }
  }

  const themeLabel =
    theme === "light" ? "Light" : theme === "dark" ? "Dark" : "System";

  return (
    <div className="min-h-screen bg-[var(--background)] font-[family-name:var(--font-body)] text-[var(--foreground)]">
      <header className="border-b border-[var(--border)] bg-[var(--background)]">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
          <Link
            href="/"
            className="flex items-center rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
          >
            <Image
              src="/logo.png"
              alt="YouTubby Logo"
              width={44}
              height={44}
              className="h-9 w-9 object-contain sm:h-10 sm:w-10"
            />

            <span className="hidden font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-tight text-[var(--foreground)] sm:block">
              YouTubby
            </span>
          </Link>

          <Link
            href="/"
            className="rounded-full px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--dropdown-hover)]"
          >
            Back
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-10">
            <h1 className="font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-tight text-[var(--foreground)] sm:text-5xl">
              Settings
            </h1>

            <p className="mt-3 max-w-2xl text-[var(--muted)]">
              Manage your YouTubby account, preferences, and notifications.
            </p>
          </div>

          <div className="space-y-5">
            <SettingsCard
              title="Account"
              description="Manage your public profile and account information."
            >
              <div className="divide-y divide-[var(--border)]">
                <div className="px-5 py-5 sm:px-6">
                  <label
                    htmlFor="display-name"
                    className="text-sm font-semibold text-[var(--foreground)]"
                  >
                    Display Name
                  </label>

                  <input
                    id="display-name"
                    type="text"
                    value={displayName}
                    onChange={(event) => {
                      const nextDisplayName = event.target.value;

                      setDisplayName(nextDisplayName);

                      scheduleProfileSave(username, nextDisplayName);
                    }}
                    maxLength={50}
                    placeholder="Your display name"
                    className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10"
                  />

                  <p className="mt-2 text-xs text-[var(--muted)]">
                    This is the name other people see on your profile.
                  </p>
                </div>

                <div className="px-5 py-5 sm:px-6">
                  <label
                    htmlFor="username"
                    className="text-sm font-semibold text-[var(--foreground)]"
                  >
                    Username
                  </label>

                  <div className="mt-2 flex items-center overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--background)] focus-within:border-[var(--primary)] focus-within:ring-2 focus-within:ring-[var(--primary)]/10">
                    <span className="pl-4 text-sm font-semibold text-[var(--muted)]">
                      @
                    </span>

                    <input
                      id="username"
                      type="text"
                      value={username.replace(/^@/, "")}
                      onChange={(event) => {
                        const nextUsername = cleanUsername(event.target.value);

                        setUsername(nextUsername);

                        scheduleProfileSave(nextUsername, displayName);
                      }}
                      maxLength={30}
                      placeholder="username"
                      className="w-full bg-transparent px-2 py-3 text-sm text-[var(--foreground)] outline-none"
                    />
                  </div>

                  <p className="mt-2 text-xs text-[var(--muted)]">
                    Your public profile will be:{" "}
                    <span className="font-medium text-[var(--foreground)]">
                      /{username || "username"}
                    </span>
                  </p>
                </div>

                <SettingRow
                  title="Email"
                  description={email || "No email available"}
                />

                <div className="flex items-center justify-between gap-4 px-5 py-5 sm:px-6">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-[var(--foreground)]">
                      Profile Picture
                    </h3>

                    <p className="mt-1 text-sm text-[var(--muted)]">
                      Click your picture to change it.
                    </p>
                  </div>

                  <div className="shrink-0">
                    <input
                      ref={pictureInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleProfilePictureChange}
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={() => pictureInputRef.current?.click()}
                      disabled={uploadingPicture}
                      aria-label="Change profile picture"
                      className="group relative h-14 w-14 overflow-hidden rounded-full border-2 border-[var(--border)] bg-[var(--background)] transition hover:border-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {profilePicture ? (
                        <Image
                          src={profilePicture}
                          alt="Profile picture"
                          fill
                          sizes="56px"
                          unoptimized
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-[var(--primary)] text-lg font-bold text-white">
                          {(displayName || username || "U")
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                      )}

                      <span className="absolute inset-0 z-10 flex items-center justify-center bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100">
                        {uploadingPicture ? (
                          <svg
                            className="h-5 w-5 animate-spin"
                            viewBox="0 0 24 24"
                            fill="none"
                            aria-hidden="true"
                          >
                            <circle
                              cx="12"
                              cy="12"
                              r="9"
                              stroke="currentColor"
                              strokeWidth="2"
                              opacity="0.35"
                            />

                            <path
                              d="M21 12a9 9 0 0 0-9-9"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="h-5 w-5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M12 5v14" />
                            <path d="M5 12h14" />
                          </svg>
                        )}
                      </span>
                    </button>
                  </div>
                </div>

                <SettingRow
                  title="Password"
                  description="Change your account password."
                >
                  <Link
                    href="/signin?reset=true"
                    className="shrink-0 rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--dropdown-hover)]"
                  >
                    Change
                  </Link>
                </SettingRow>
              </div>
            </SettingsCard>

            <SettingsCard
              title="Appearance"
              description="Customize how YouTubby looks for you."
            >
              <div className="px-5 py-5 sm:px-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--foreground)]">
                      Theme
                    </h3>

                    <p className="mt-1 text-sm text-[var(--muted)]">
                      Choose how YouTubby should appear.
                    </p>
                  </div>

                  <div ref={themeRef} className="relative w-full sm:w-52">
                    <CustomSelectButton
                      label={themeLabel}
                      open={themeOpen}
                      onClick={() => {
                        setThemeOpen((open) => !open);
                        setLanguageOpen(false);
                      }}
                    />

                    {themeOpen && (
                      <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-xl border border-[var(--dropdown-border)] bg-[var(--dropdown)] p-1.5 shadow-xl">
                        <CustomOption
                          label="Light"
                          selected={theme === "light"}
                          onClick={() => handleThemeChange("light")}
                        />

                        <CustomOption
                          label="Dark"
                          selected={theme === "dark"}
                          onClick={() => handleThemeChange("dark")}
                        />

                        <CustomOption
                          label="System"
                          selected={theme === "system"}
                          onClick={() => handleThemeChange("system")}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </SettingsCard>

            <SettingsCard
              title="Language"
              description="Choose the language used throughout YouTubby."
            >
              <div className="px-5 py-5 sm:px-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--foreground)]">
                      Language
                    </h3>

                    <p className="mt-1 text-sm text-[var(--muted)]">
                      Your language preference is saved automatically.
                    </p>
                  </div>

                  <div ref={languageRef} className="relative w-full sm:w-52">
                    <CustomSelectButton
                      label={language}
                      open={languageOpen}
                      onClick={() => {
                        setLanguageOpen((open) => !open);
                        setThemeOpen(false);
                      }}
                    />

                    {languageOpen && (
                      <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-64 overflow-y-auto overflow-hidden rounded-xl border border-[var(--dropdown-border)] bg-[var(--dropdown)] p-1.5 shadow-xl">
                        {LANGUAGES.map((item) => (
                          <CustomOption
                            key={item}
                            label={item}
                            selected={language === item}
                            onClick={() => handleLanguageChange(item)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </SettingsCard>

            <SettingsCard
              title="Notifications"
              description="Control what emails you receive from YouTubby."
            >
              <ToggleRow
                title="Email updates"
                description="Receive occasional updates about YouTubby."
                enabled={emailUpdates}
                onChange={handleEmailUpdatesChange}
              />
            </SettingsCard>

            <SettingsCard
              title="Account Actions"
              description="Manage your current session."
            >
              <div className="px-5 py-5 sm:px-6">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-full border border-[var(--border)] px-5 py-2.5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--dropdown-hover)]"
                >
                  Log Out
                </button>
              </div>
            </SettingsCard>

            <section className="overflow-hidden rounded-2xl border border-red-200 bg-[var(--card)] dark:border-red-900/50">
              <div className="border-b border-red-100 px-5 py-5 sm:px-6 dark:border-red-900/40">
                <h2 className="text-lg font-bold text-red-600">Danger Zone</h2>

                <p className="mt-1 text-sm text-[var(--muted)]">
                  These actions can permanently affect your account.
                </p>
              </div>

              <div className="flex flex-col gap-5 px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div>
                  <h3 className="font-semibold text-[var(--foreground)]">
                    Delete account
                  </h3>

                  <p className="mt-1 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
                    Permanently delete your YouTubby account. This action cannot
                    be undone.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setDeleteAccountOpen(true)}
                  className="shrink-0 rounded-full border border-red-300 px-5 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/30"
                >
                  Delete Account
                </button>
              </div>
            </section>
          </div>
        </div>
      </main>

      {deleteAccountOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-5 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deletingAccount) {
              setDeleteAccountOpen(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
            className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl sm:p-7"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-500">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-6 w-6"
              >
                <path d="M3 6h18" />
                <path d="M8 6V4h8v2" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v5" />
                <path d="M14 11v5" />
              </svg>
            </div>

            <h2
              id="delete-account-title"
              className="mt-5 font-[family-name:var(--font-display)] text-xl font-bold tracking-tight text-[var(--foreground)]"
            >
              Delete your account?
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              Are you sure you want to permanently delete your YouTubby account?
              Your account and associated data may be permanently removed.{" "}
              <span className="font-semibold text-[var(--foreground)]">
                This action cannot be undone.
              </span>
            </p>

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDeleteAccountOpen(false)}
                disabled={deletingAccount}
                className="rounded-full border border-[var(--border)] bg-[var(--background)] px-5 py-2.5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--dropdown-hover)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
                className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deletingAccount ? "Deleting..." : "Delete account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-visible rounded-2xl border border-[var(--border)] bg-[var(--card)]">
      <div className="border-b border-[var(--border)] px-5 py-5 sm:px-6">
        <h2 className="text-lg font-bold text-[var(--foreground)]">{title}</h2>

        <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
      </div>

      {children}
    </section>
  );
}

function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">
          {title}
        </h3>

        <p className="mt-1 truncate text-sm text-[var(--muted)]">
          {description}
        </p>
      </div>

      {children}
    </div>
  );
}

function CustomSelectButton({
  label,
  open,
  onClick,
}: {
  label: string;
  open: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-left text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--dropdown-hover)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/10"
    >
      <span>{label}</span>

      <svg
        className={`h-4 w-4 shrink-0 text-[var(--dropdown-icon)] transition-transform ${
          open ? "rotate-180" : ""
        }`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>
  );
}

function CustomOption({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
        selected
          ? "bg-[var(--primary)]/10 text-[var(--primary)] dark:bg-[var(--primary)]/20 dark:text-white"
          : "text-[var(--dropdown-foreground)] hover:bg-[var(--dropdown-hover)]"
      }`}
    >
      <span
        className={`flex h-4 w-4 items-center justify-center text-xs font-bold ${
          selected ? "opacity-100" : "opacity-0"
        }`}
      >
        ✓
      </span>

      <span>{label}</span>
    </button>
  );
}

function ToggleRow({
  title,
  description,
  enabled,
  onChange,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-6 px-5 py-5 sm:px-6">
      <div>
        <h3 className="text-sm font-semibold text-[var(--foreground)]">
          {title}
        </h3>

        <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={title}
        onClick={() => onChange(!enabled)}
        className={`relative h-6 w-11 shrink-0 rounded-full p-1 transition ${
          enabled ? "bg-[var(--primary)]" : "bg-[var(--dropdown-toggle-off)]"
        }`}
      >
        <span
          className={`block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
            enabled ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}