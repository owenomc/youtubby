"use client"; 

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CognitoUser,
  CognitoUserAttribute,
  CognitoUserPool,
  CognitoUserSession,
} from "amazon-cognito-identity-js";

import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";

const userPool = new CognitoUserPool({
  UserPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
  ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
});

type Video = {
  id: string;
  title: string;
  src: string;
  views: number;
  username?: string;
};

function getCurrentCognitoUser(): CognitoUser | null {
  return userPool.getCurrentUser();
}

function getAuthenticatedUser(user: CognitoUser): Promise<CognitoUser> {
  return new Promise((resolve, reject) => {
    user.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session || !session.isValid()) {
        reject(new Error("User is not authenticated"));
        return;
      }

      resolve(user);
    });
  });
}

function getUserAttributes(
  user: CognitoUser,
): Promise<CognitoUserAttribute[]> {
  return new Promise((resolve, reject) => {
    user.getUserAttributes((err, attributes) => {
      if (err || !attributes) {
        reject(err ?? new Error("Unable to load your profile."));
        return;
      }

      resolve(attributes);
    });
  });
}

function getAttributeValue(
  attributes: CognitoUserAttribute[],
  name: string,
): string {
  return (
    attributes
      .find((attribute) => attribute.getName() === name)
      ?.getValue()
      ?.trim() ?? ""
  );
}

function getUsernameFromAttributes(
  attributes: CognitoUserAttribute[],
): string {
  const preferredUsername = getAttributeValue(
    attributes,
    "preferred_username",
  );

  if (preferredUsername) {
    return preferredUsername;
  }

  const email = getAttributeValue(attributes, "email");

  if (email) {
    return email.split("@")[0];
  }

  return "user";
}

export default function CreatorPage() {
  const [loading, setLoading] = useState(true);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [videos, setVideos] = useState<Video[]>([]);
  const [error, setError] = useState("");
  const [username, setUsername] = useState("");
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);
  const [videoToDelete, setVideoToDelete] = useState<Video | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCreator() {
      try {
        const currentUser = getCurrentCognitoUser();

        if (!currentUser) {
          if (!cancelled) {
            setLoading(false);
            setLoadingVideos(false);
            setError("You must be signed in to view your creator page.");
          }

          return;
        }

        const authenticatedUser = await getAuthenticatedUser(currentUser);
        const attributes = await getUserAttributes(authenticatedUser);

        if (cancelled) {
          return;
        }

        const currentUsername = getUsernameFromAttributes(attributes);

        setUsername(currentUsername);

        try {
          const response = await fetch(
            `/api/videos?username=${encodeURIComponent(currentUsername)}`,
            {
              method: "GET",
              cache: "no-store",
            },
          );

          if (!response.ok) {
            const errorText = await response.text();

            console.error("Video API error:", response.status, errorText);

            if (!cancelled) {
              setError("Unable to load your videos.");
            }

            return;
          }

          const data = await response.json();

          if (!cancelled && Array.isArray(data)) {
            setVideos(data);
          }
        } catch (videoError) {
          console.error("Unable to load creator videos:", videoError);

          if (!cancelled) {
            setError("Unable to load your videos.");
          }
        } finally {
          if (!cancelled) {
            setLoadingVideos(false);
          }
        }

        if (!cancelled) {
          setLoading(false);
        }
      } catch (err) {
        console.error("Creator loading error:", err);

        if (!cancelled) {
          setLoading(false);
          setLoadingVideos(false);
          setError("You must be signed in to view your creator page.");
        }
      }
    }

    loadCreator();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDeleteVideo() {
    if (!videoToDelete) {
      return;
    }

    const video = videoToDelete;

    setDeletingVideoId(video.id);
    setError("");

    try {
      const response = await fetch("/api/videos", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: video.id,
          username,
        }),
      });

      if (!response.ok) {
        let message = "Unable to delete this video.";

        try {
          const data = await response.json();

          if (typeof data?.error === "string") {
            message = data.error;
          }
        } catch {
          // Keep the default error message.
        }

        throw new Error(message);
      }

      setVideos((currentVideos) =>
        currentVideos.filter((currentVideo) => currentVideo.id !== video.id),
      );

      setVideoToDelete(null);
    } catch (err) {
      console.error("Video deletion error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete this video.",
      );
    } finally {
      setDeletingVideoId(null);
    }
  }

  const totalViews = videos.reduce((total, video) => total + video.views, 0);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--foreground)]">
        <Navbar />

        <main className="mx-auto w-full max-w-5xl flex-1 px-5 pb-20 pt-8 sm:px-8 sm:pt-10">
          <section>
            <div className="animate-pulse rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8">
              <div className="h-8 w-32 rounded-lg bg-black/10 dark:bg-white/10" />

              <div className="mt-3 h-4 w-56 rounded-lg bg-black/10 dark:bg-white/10" />

              <div className="mt-6 grid grid-cols-2 gap-3 sm:max-w-md">
                <div className="h-20 rounded-2xl bg-black/10 dark:bg-white/10" />
                <div className="h-20 rounded-2xl bg-black/10 dark:bg-white/10" />
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)] font-[family-name:var(--font-body)] text-[var(--foreground)]">
      <Navbar />

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 pb-20 pt-8 sm:px-8 sm:pt-10">
        <section>
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8">
            <div className="flex flex-col gap-7">
              <div className="grid max-w-xl grid-cols-2 gap-3">
                <div className="rounded-2xl bg-[var(--background)] px-5 py-4">
                  <p className="text-2xl font-bold">{videos.length}</p>

                  <p className="mt-1 text-sm font-medium text-[var(--muted)]">
                    Videos
                  </p>
                </div>

                <div className="rounded-2xl bg-[var(--background)] px-5 py-4">
                  <p className="text-2xl font-bold">
                    {totalViews.toLocaleString()}
                  </p>

                  <p className="mt-1 text-sm font-medium text-[var(--muted)]">
                    Views
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        )}

        <section className="mt-8">
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)]">
            <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-6 py-5 sm:px-8">
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight sm:text-2xl">
                  Videos
                </h2>

                <p className="mt-1 text-sm text-[var(--muted)]">
                  Videos uploaded to this channel
                </p>
              </div>
            </div>

            <div className="p-6 sm:p-8">
              {loadingVideos ? (
                <div className="grid gap-6 sm:grid-cols-2">
                  {[1, 2].map((item) => (
                    <div key={item} className="animate-pulse">
                      <div className="aspect-video rounded-2xl bg-black/10 dark:bg-white/10" />

                      <div className="mt-4 h-5 w-3/4 rounded bg-black/10 dark:bg-white/10" />

                      <div className="mt-2 h-4 w-1/3 rounded bg-black/10 dark:bg-white/10" />
                    </div>
                  ))}
                </div>
              ) : videos.length === 0 ? (
                <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--background)] px-6 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--primary)]/10">
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--primary)"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <rect x="3" y="5" width="18" height="14" rx="2" />
                      <path d="m10 9 5 3-5 3V9Z" />
                    </svg>
                  </div>

                  <h3 className="mt-5 text-lg font-bold">No videos yet</h3>

                  <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--muted)]">
                    Upload your first video and it will appear on your channel.
                  </p>

                  <Link
                    href="/upload"
                    className="mt-6 cursor-pointer rounded-full bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-white transition hover:scale-[1.02] hover:bg-[var(--primary-hover)]"
                  >
                    Upload your first video
                  </Link>
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {videos.map((video) => {
                    const isDeleting = deletingVideoId === video.id;

                    return (
                      <div key={video.id} className="group">
                        <Link
                          href={`/watch/${encodeURIComponent(video.id)}`}
                          className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
                        >
                          <div className="aspect-video overflow-hidden rounded-2xl bg-black shadow-sm">
                            <video
                              src={video.src}
                              preload="metadata"
                              muted
                              playsInline
                              className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]"
                            />
                          </div>
                        </Link>

                        <div className="mt-3">
                          <div className="flex items-start justify-between gap-3">
                            <Link
                              href={`/watch/${encodeURIComponent(video.id)}`}
                              className="min-w-0 flex-1"
                            >
                              <h3 className="line-clamp-2 font-semibold leading-snug transition group-hover:text-[var(--primary)]">
                                {video.title}
                              </h3>

                              <p className="mt-1 text-sm text-[var(--muted)]">
                                {video.views.toLocaleString()}{" "}
                                {video.views === 1 ? "view" : "views"}
                              </p>
                            </Link>

                            <button
                              type="button"
                              onClick={() => setVideoToDelete(video)}
                              disabled={isDeleting}
                              aria-label={`Delete ${video.title}`}
                              className="shrink-0 rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500/20 dark:text-red-400 dark:hover:bg-red-500/10"
                            >
                              {isDeleting ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {videoToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-5 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deletingVideoId) {
              setVideoToDelete(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-video-title"
            className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl sm:p-7"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-500">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 6h18" />
                <path d="M8 6V4h8v2" />
                <path d="m19 6-1 14H6L5 6" />
                <path d="M10 11v5" />
                <path d="M14 11v5" />
              </svg>
            </div>

            <h2
              id="delete-video-title"
              className="mt-5 font-[family-name:var(--font-display)] text-xl font-bold tracking-tight"
            >
              Delete this video?
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              Are you sure you want to permanently delete{" "}
              <span className="font-semibold text-[var(--foreground)]">
                &quot;{videoToDelete.title}&quot;
              </span>
              ? This action cannot be undone.
            </p>

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setVideoToDelete(null)}
                disabled={!!deletingVideoId}
                className="rounded-full border border-[var(--border)] bg-[var(--background)] px-5 py-2.5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--dropdown-hover)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteVideo}
                disabled={!!deletingVideoId}
                className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deletingVideoId ? "Deleting..." : "Delete video"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
