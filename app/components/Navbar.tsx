"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CognitoUserPool } from "amazon-cognito-identity-js";

import SearchBar from "@/app/components/SearchBar";

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

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center text-[var(--dropdown-icon)]">
      {children}
    </span>
  );
}

function getSavedTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }

  const saved = window.localStorage.getItem("youtubby-theme");

  if (saved === "light" || saved === "dark" || saved === "system") {
    return saved;
  }

  return "light";
}

function getSavedLanguage(): string {
  if (typeof window === "undefined") {
    return "English";
  }

  const saved = window.localStorage.getItem("youtubby-language");

  return LANGUAGES.includes(saved || "") ? saved! : "English";
}

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

export default function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [profilePicture, setProfilePicture] = useState("/logo.png");

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);

  const [theme, setTheme] = useState<Theme>(getSavedTheme);
  const [language, setLanguage] = useState<string>(getSavedLanguage);

  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const currentUser = userPool.getCurrentUser();

    if (!currentUser) {
      return;
    }

    currentUser.getSession((err: Error | null, session: unknown) => {
      if (err || !session) {
        return;
      }

      setIsLoggedIn(true);

      currentUser.getUserAttributes((attributeError, attributes) => {
        if (attributeError || !attributes) {
          return;
        }

        const usernameAttribute = attributes.find(
          (attribute) => attribute.getName() === "preferred_username",
        );

        const emailAttribute = attributes.find(
          (attribute) => attribute.getName() === "email",
        );

        const pictureAttribute = attributes.find(
          (attribute) => attribute.getName() === "picture",
        );

        const currentUsername =
          usernameAttribute?.getValue() ||
          emailAttribute?.getValue().split("@")[0] ||
          "";

        const currentPicture = pictureAttribute?.getValue() || "/logo.png";

        setUsername(currentUsername);
        setProfilePicture(currentPicture);
      });
    });
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
        setIsLanguageOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsProfileOpen(false);
        setIsLanguageOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function handleLogout() {
    const currentUser = userPool.getCurrentUser();

    if (currentUser) {
      currentUser.signOut();
    }

    setIsLoggedIn(false);
    setIsProfileOpen(false);
    setIsLanguageOpen(false);

    window.location.href = "/";
  }

  function handleThemeChange() {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";

    setTheme(nextTheme);
    window.localStorage.setItem("youtubby-theme", nextTheme);
  }

  function handleLanguageChange(nextLanguage: string) {
    setLanguage(nextLanguage);
    window.localStorage.setItem("youtubby-language", nextLanguage);
    setIsLanguageOpen(false);
  }

  const profileHref = username ? `/@${encodeURIComponent(username)}` : "/";

  return (
    <header className="relative z-50 w-full font-[family-name:var(--font-body)]">
      <div className="relative mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
        {/* Logo */}
        <Link
          href="/"
          className="relative z-10 flex shrink-0 items-center rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
        >
          <Image
            src="/logo.png"
            alt="YouTubby Logo"
            width={56}
            height={56}
            className="h-9 w-9 object-contain sm:h-10 sm:w-10"
          />

          <span className="hidden font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-tight text-[var(--foreground)] sm:block">
            YouTubby
          </span>
        </Link>

        {/* Centered Search */}
        <div className="absolute left-1/2 top-1/2 hidden w-full max-w-md -translate-x-1/2 -translate-y-1/2 px-4 md:block">
          <SearchBar />
        </div>

        {/* Account */}
        <nav
          aria-label="Account"
          className="relative z-10 flex shrink-0 items-center"
        >
          {isLoggedIn ? (
            <div ref={profileRef} className="relative flex items-center gap-3">
              {/* Upload */}
              <Link
                href="/upload"
                aria-label="Upload a video"
                className="flex cursor-pointer items-center gap-2 rounded-full bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:scale-105 hover:bg-[var(--primary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
              >
                <svg
                  width="20"
                  height="20"
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

                <span>Upload</span>
              </Link>

              {/* Profile */}
              <button
                type="button"
                aria-label="Open profile menu"
                aria-expanded={isProfileOpen}
                onClick={() => {
                  setIsProfileOpen((open) => !open);
                  setIsLanguageOpen(false);
                }}
                className="flex h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-full transition hover:scale-105 hover:bg-[var(--primary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
              >
                <Image
                  src={profilePicture}
                  alt="Your profile picture"
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                />
              </button>

              {/* Profile Dropdown */}
              {isProfileOpen && (
                <div className="absolute right-0 top-[calc(100%+10px)] z-50 max-h-[calc(100vh-90px)] w-[min(280px,calc(100vw-24px))] overflow-y-auto overflow-x-hidden rounded-lg border border-[var(--dropdown-border)] bg-[var(--dropdown)] p-2 text-[var(--dropdown-foreground)] shadow-2xl">
                  {/* Profile */}
                  <Link
                    href={profileHref}
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-3 rounded-md px-2.5 py-2.5 transition hover:bg-[var(--dropdown-hover)]"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--background)]">
                      <Image
                        src={profilePicture}
                        alt=""
                        width={40}
                        height={40}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-bold">
                        {username ? `@${username}` : "YouTubby"}
                      </p>

                      <p className="truncate text-xs text-[var(--dropdown-muted)]">
                        View your profile
                      </p>
                    </div>
                  </Link>

                  <div className="my-2 h-px bg-[var(--dropdown-border)]" />

                  {/* Channel */}
                  <DropdownLink
                    href={profileHref}
                    label="Channel"
                    onClick={() => setIsProfileOpen(false)}
                  >
                    <Icon>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <circle cx="12" cy="8" r="4" />
                        <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
                      </svg>
                    </Icon>
                  </DropdownLink>

                  {/* Creator Dashboard */}
                  <DropdownLink
                    href="/creator"
                    label="Creator Dashboard"
                    onClick={() => setIsProfileOpen(false)}
                  >
                    <Icon>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <path d="M7 16v-4M12 16V8M17 16v-7" />
                      </svg>
                    </Icon>
                  </DropdownLink>

                  <div className="my-2 h-px bg-[var(--dropdown-border)]" />

                  {/* Settings */}
                  <DropdownLink
                    href="/settings"
                    label="Settings"
                    onClick={() => setIsProfileOpen(false)}
                  >
                    <Icon>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V20h-2.6v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1A1.7 1.7 0 0 0 8 15a1.7 1.7 0 0 0-1.5-1H6v-2.6h.5A1.7 1.7 0 0 0 8 10a1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.8-1.8.1.1a1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.5v2.6h-.5a1.7 1.7 0 0 0-1.5 1Z" />
                      </svg>
                    </Icon>
                  </DropdownLink>

                  {/* Language */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsLanguageOpen((open) => !open)}
                      aria-expanded={isLanguageOpen}
                      className="hover:cursor-pointer flex w-full items-center gap-3 rounded-md px-2.5 py-2.5 text-left text-[14px] font-medium transition hover:bg-[var(--dropdown-hover)]"
                    >
                      <Icon>
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        >
                          <circle cx="12" cy="12" r="9" />
                          <path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18" />
                        </svg>
                      </Icon>

                      <span className="min-w-0 flex-1 truncate">Language</span>

                      <span className="max-w-[90px] truncate text-xs text-[var(--dropdown-muted)]">
                        {language}
                      </span>

                      <svg
                        className={`h-4 w-4 shrink-0 text-[var(--dropdown-icon)] transition-transform ${
                          isLanguageOpen ? "rotate-90" : ""
                        }`}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                    </button>

                    {isLanguageOpen && (
                      <div className="mt-1 overflow-hidden rounded-md border border-[var(--dropdown-border)] bg-[var(--dropdown-inner)] p-1">
                        {LANGUAGES.map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => handleLanguageChange(item)}
                            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-[var(--dropdown-foreground)] transition hover:bg-[var(--dropdown-hover)]"
                          >
                            <span
                              className={`w-4 text-center text-[var(--primary)] ${
                                language === item ? "opacity-100" : "opacity-0"
                              }`}
                            >
                              ✓
                            </span>

                            <span>{item}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Dark Theme */}
                  <button
                    type="button"
                    onClick={handleThemeChange}
                    className="hover:cursor-pointer flex w-full items-center gap-3 rounded-md px-2.5 py-2.5 text-left text-[14px] font-medium transition hover:bg-[var(--dropdown-hover)]"
                  >
                    <Icon>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path d="M21 15.5A9 9 0 0 1 8.5 3 9 9 0 1 0 21 15.5Z" />
                      </svg>
                    </Icon>

                    <span>Dark Theme</span>

                    <span
                      className={`ml-auto flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition ${
                        theme === "dark"
                          ? "bg-[var(--primary)]"
                          : "bg-[var(--dropdown-toggle-off)]"
                      }`}
                    >
                      <span
                        className={`h-4 w-4 rounded-full bg-white transition-transform ${
                          theme === "dark" ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </span>
                  </button>

                  <div className="my-2 h-px bg-[var(--dropdown-border)]" />

                  {/* Logout */}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-md px-2.5 py-2.5 text-left text-[14px] font-medium transition hover:bg-[var(--dropdown-hover)]"
                  >
                    <Icon>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path d="M10 17l5-5-5-5M15 12H3" />
                        <path d="M14 4h5v16h-5" />
                      </svg>
                    </Icon>

                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden items-center gap-2 md:flex">
                <Link
                  href="/signin"
                  className="rounded-full px-4 py-2 font-medium text-[var(--foreground)] transition hover:bg-[var(--dropdown-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
                >
                  Sign In
                </Link>

                <Link
                  href="/signup"
                  className="rounded-full bg-[var(--primary)] px-5 py-2 text-white transition hover:scale-105 hover:bg-[var(--primary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
                >
                  Sign Up
                </Link>
              </div>

              {/* Mobile */}
              <Link
                href="/signin"
                aria-label="Sign in"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)] text-white transition hover:scale-105 hover:bg-[var(--primary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] md:hidden"
              >
                <svg
                  width="21"
                  height="21"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
                </svg>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

function DropdownLink({
  href,
  label,
  children,
  onClick,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex min-w-0 items-center gap-3 rounded-md px-2.5 py-2.5 text-[14px] font-medium text-[var(--dropdown-foreground)] transition hover:bg-[var(--dropdown-hover)]"
    >
      {children}

      <span className="min-w-0 truncate">{label}</span>
    </Link>
  );
}
