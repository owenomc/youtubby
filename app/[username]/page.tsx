"use client";

import Image from "next/image";
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

type ProfilePageProps = {
  params: Promise<{
    username: string;
  }>;
};

type Subscription = {
  creator: string;
};

type PublicProfile = {
  username: string;
  displayName: string;
};

function getCurrentCognitoUser(): CognitoUser | null {
  return userPool.getCurrentUser();
}

function getAuthenticatedUser(
  user: CognitoUser,
): Promise<CognitoUser> {
  return new Promise((resolve, reject) => {
    user.getSession(
      (
        err: Error | null,
        session: CognitoUserSession | null,
      ) => {
        if (err || !session || !session.isValid()) {
          reject(new Error("User is not authenticated."));
          return;
        }

        resolve(user);
      },
    );
  });
}

function getUserAttributes(
  user: CognitoUser,
): Promise<CognitoUserAttribute[]> {
  return new Promise((resolve, reject) => {
    user.getUserAttributes((err, attributes) => {
      if (err || !attributes) {
        reject(
          err ??
            new Error("Unable to load your profile."),
        );
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
      .find(
        (attribute) =>
          attribute.getName() === name,
      )
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

  const email = getAttributeValue(
    attributes,
    "email",
  );

  if (email) {
    return email.split("@")[0];
  }

  return "user";
}

function normalizeUsername(value: string): string {
  const decoded = decodeURIComponent(value).trim();

  return decoded.startsWith("@")
    ? decoded.slice(1)
    : decoded;
}

function getProfilePictureUrl(
  username: string,
): string {
  return `/api/profile-picture?username=${encodeURIComponent(
    username,
  )}`;
}

export default function ProfilePage({
  params,
}: ProfilePageProps) {
  const [routeUsername, setRouteUsername] =
    useState("");

  const [username, setUsername] =
    useState("");

  const [displayName, setDisplayName] =
    useState("YouTubby User");

  const [picture, setPicture] =
    useState("/logo.png");

  const [subscriberCount, setSubscriberCount] =
    useState(0);

  const [subscriptions, setSubscriptions] =
    useState<Subscription[]>([]);

  const [isOwnProfile, setIsOwnProfile] =
    useState(false);

  const [subscribed, setSubscribed] =
    useState(false);

  const [subscriptionLoading, setSubscriptionLoading] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [subscriptionsLoading, setSubscriptionsLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const resolvedParams = await params;

        if (cancelled) {
          return;
        }

        const cleanUsername = normalizeUsername(
          resolvedParams.username,
        );

        const pictureUrl =
          getProfilePictureUrl(cleanUsername);

        setRouteUsername(cleanUsername);
        setUsername(cleanUsername);
        setDisplayName(cleanUsername);
        setPicture(pictureUrl);
        setSubscriberCount(0);
        setSubscribed(false);
        setSubscriptions([]);
        setIsOwnProfile(false);
        setSubscriptionsLoading(true);
        setError("");
        setSuccess("");

        try {
          const profileResponse =
            await fetch(
              `/api/profile?username=${encodeURIComponent(
                cleanUsername,
              )}`,
              {
                cache: "no-store",
              },
            );

          if (profileResponse.ok) {
            const profileData: PublicProfile =
              await profileResponse.json();

            if (!cancelled) {
              const resolvedUsername =
                profileData.username ||
                cleanUsername;

              setUsername(resolvedUsername);

              setDisplayName(
                profileData.displayName ||
                  resolvedUsername,
              );

              setPicture(
                getProfilePictureUrl(
                  resolvedUsername,
                ),
              );
            }
          } else if (!cancelled) {
            setUsername(cleanUsername);
            setDisplayName(cleanUsername);
            setPicture(pictureUrl);
          }
        } catch (profileError) {
          console.error(
            "Unable to load public profile:",
            profileError,
          );

          if (!cancelled) {
            setUsername(cleanUsername);
            setDisplayName(cleanUsername);
            setPicture(pictureUrl);
          }
        }

        const currentUser =
          getCurrentCognitoUser();

        let viewerUsername = "";

        if (currentUser) {
          try {
            await getAuthenticatedUser(
              currentUser,
            );

            const viewerAttributes =
              await getUserAttributes(
                currentUser,
              );

            viewerUsername =
              getUsernameFromAttributes(
                viewerAttributes,
              );
          } catch {
            viewerUsername = "";
          }
        }

        const ownProfile =
          Boolean(viewerUsername) &&
          viewerUsername.toLowerCase() ===
            cleanUsername.toLowerCase();

        if (!cancelled) {
          setIsOwnProfile(ownProfile);
        }

        try {
          const query =
            new URLSearchParams();

          query.set(
            "creator",
            cleanUsername,
          );

          if (viewerUsername) {
            query.set(
              "subscriber",
              viewerUsername,
            );
          }

          const subscriberResponse =
            await fetch(
              `/api/subscriptions?${query.toString()}`,
              {
                cache: "no-store",
              },
            );

          if (subscriberResponse.ok) {
            const subscriberData =
              await subscriberResponse.json();

            if (!cancelled) {
              setSubscriberCount(
                Number(
                  subscriberData.subscriberCount ??
                    0,
                ),
              );

              setSubscribed(
                Boolean(
                  subscriberData.subscribed,
                ),
              );
            }
          }
        } catch (subscriptionError) {
          console.error(
            "Unable to load subscriber information:",
            subscriptionError,
          );
        }

        if (ownProfile && currentUser) {
          try {
            const authenticatedUser =
              await getAuthenticatedUser(
                currentUser,
              );

            const attributes =
              await getUserAttributes(
                authenticatedUser,
              );

            const currentUsername =
              getUsernameFromAttributes(
                attributes,
              );

            const ownDisplayName =
              getAttributeValue(
                attributes,
                "name",
              ) ||
              currentUsername ||
              "YouTubby User";

            if (!cancelled) {
              setUsername(currentUsername);
              setDisplayName(ownDisplayName);
              setPicture(
                getProfilePictureUrl(
                  currentUsername,
                ),
              );
            }

            try {
              const subscriptionsResponse =
                await fetch(
                  `/api/subscriptions?subscriber=${encodeURIComponent(
                    currentUsername,
                  )}`,
                  {
                    cache: "no-store",
                  },
                );

              if (
                subscriptionsResponse.ok
              ) {
                const subscriptionData =
                  await subscriptionsResponse.json();

                if (!cancelled) {
                  const loadedSubscriptions =
                    Array.isArray(
                      subscriptionData.subscriptions,
                    )
                      ? subscriptionData.subscriptions.filter(
                          (
                            item: unknown,
                          ): item is Subscription =>
                            typeof item ===
                              "object" &&
                            item !== null &&
                            "creator" in item &&
                            typeof (
                              item as {
                                creator?: unknown;
                              }
                            ).creator ===
                              "string",
                        )
                      : [];

                  setSubscriptions(
                    loadedSubscriptions,
                  );
                }
              }
            } catch (subscriptionsError) {
              console.error(
                "Unable to load subscriptions:",
                subscriptionsError,
              );
            }
          } catch (profileError) {
            console.error(
              "Unable to load authenticated profile:",
              profileError,
            );
          }
        }

        if (!cancelled) {
          setLoading(false);
          setSubscriptionsLoading(false);
        }
      } catch (loadError) {
        console.error(
          "Profile loading error:",
          loadError,
        );

        if (!cancelled) {
          setLoading(false);
          setSubscriptionsLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [params]);

  async function handleSubscribe() {
    if (
      subscriptionLoading ||
      isOwnProfile
    ) {
      return;
    }

    setError("");
    setSuccess("");

    const currentUser =
      getCurrentCognitoUser();

    if (!currentUser) {
      window.location.href = "/signin";
      return;
    }

    setSubscriptionLoading(true);

    try {
      await getAuthenticatedUser(
        currentUser,
      );

      const attributes =
        await getUserAttributes(
          currentUser,
        );

      const currentUsername =
        getUsernameFromAttributes(
          attributes,
        );

      if (!currentUsername) {
        window.location.href = "/signin";
        return;
      }

      if (
        currentUsername.toLowerCase() ===
        routeUsername.toLowerCase()
      ) {
        return;
      }

      const response = await fetch(
        "/api/subscriptions",
        {
          method: subscribed
            ? "DELETE"
            : "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            subscriber:
              currentUsername,
            creator:
              routeUsername,
          }),
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to update your subscription.",
        );
      }

      setSubscribed(
        Boolean(data.subscribed),
      );

      setSubscriberCount(
        Number(
          data.subscriberCount ??
            subscriberCount,
        ),
      );
    } catch (subscribeError) {
      console.error(
        "Subscription error:",
        subscribeError,
      );

      setError(
        subscribeError instanceof Error
          ? subscribeError.message
          : "Unable to update your subscription.",
      );
    } finally {
      setSubscriptionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--foreground)]">
        <Navbar />

        <main className="mx-auto w-full max-w-5xl flex-1 px-5 pb-20 pt-10 sm:px-8">
          <div className="animate-pulse rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="h-28 w-28 shrink-0 rounded-full bg-black/10 dark:bg-white/10" />

              <div className="flex-1">
                <div className="h-9 w-48 rounded-lg bg-black/10 dark:bg-white/10" />

                <div className="mt-3 h-5 w-32 rounded-lg bg-black/10 dark:bg-white/10" />

                <div className="mt-6 h-4 w-40 rounded-lg bg-black/10 dark:bg-white/10" />
              </div>
            </div>
          </div>
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
              {/* Profile header */}
              <div className="flex flex-col gap-7 sm:flex-row sm:items-start">
                {/* Profile picture */}
                <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-full bg-[var(--background)] ring-1 ring-[var(--border)]">
                  <Image
                    src={picture}
                    alt={`${displayName} profile picture`}
                    fill
                    sizes="112px"
                    unoptimized
                    className="object-cover"
                    onError={() => {
                      setPicture("/logo.png");
                    }}
                  />
                </div>

                {/* Profile information */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h1 className="break-words font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight sm:text-4xl">
                        {displayName}
                      </h1>

                      {!isOwnProfile && (
                        <button
                          type="button"
                          onClick={() =>
                            void handleSubscribe()
                          }
                          disabled={
                            subscriptionLoading
                          }
                          className={`inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60 ${
                            subscribed
                              ? "border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5"
                              : "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]"
                          }`}
                        >
                          {subscriptionLoading
                            ? "..."
                            : subscribed
                              ? "Subscribed"
                              : "Subscribe"}
                        </button>
                      )}
                    </div>

                    <p className="break-words text-base font-medium text-[var(--muted)]">
                      @{routeUsername}
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              {(error || success) && (
                <div
                  className={`rounded-2xl px-4 py-3 text-sm ${
                    error
                      ? "bg-red-500/10 text-red-600 dark:text-red-400"
                      : "bg-green-500/10 text-green-600 dark:text-green-400"
                  }`}
                >
                  {error || success}
                </div>
              )}

              {/* Subscriber count */}
              <div className="grid max-w-xl grid-cols-1 gap-3 border-t border-[var(--border)] pt-6 sm:grid-cols-2">
                <div className="rounded-2xl bg-[var(--background)] px-5 py-4">
                  <p className="text-2xl font-bold">
                    {subscriberCount.toLocaleString()}
                  </p>

                  <p className="mt-1 text-sm font-medium text-[var(--muted)]">
                    Subscribers
                  </p>
                </div>
              </div>

              {/* Subscriptions — ONLY YOUR PROFILE */}
              {isOwnProfile && (
                <div className="border-t border-[var(--border)] pt-6">
                  <h2 className="font-[family-name:var(--font-display)] text-xl font-bold">
                    Subscriptions
                  </h2>

                  {subscriptionsLoading ? (
                    <div className="mt-4 flex flex-wrap gap-3">
                      <div className="h-16 w-48 animate-pulse rounded-2xl bg-[var(--background)]" />
                      <div className="h-16 w-48 animate-pulse rounded-2xl bg-[var(--background)]" />
                    </div>
                  ) : subscriptions.length ===
                    0 ? (
                    <p className="mt-4 text-sm text-[var(--muted)]">
                      Not subscribed to anyone yet.
                    </p>
                  ) : (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {subscriptions.map(
                        (subscription) => (
                          <SubscriptionCard
                            key={
                              subscription.creator
                            }
                            username={
                              subscription.creator
                            }
                          />
                        ),
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function SubscriptionCard({
  username,
}: {
  username: string;
}) {
  const [profile, setProfile] =
    useState<PublicProfile>({
      username,
      displayName: username,
    });

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const response =
          await fetch(
            `/api/profile?username=${encodeURIComponent(
              username,
            )}`,
            {
              cache: "no-store",
            },
          );

        if (!response.ok) {
          return;
        }

        const data =
          await response.json();

        if (!cancelled) {
          const resolvedUsername =
            data.username || username;

          setProfile({
            username: resolvedUsername,
            displayName:
              data.displayName ||
              resolvedUsername,
          });
        }
      } catch (error) {
        console.error(
          "Unable to load subscription profile:",
          error,
        );
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [username]);

  return (
    <Link
      href={`/${encodeURIComponent(
        profile.username,
      )}`}
      className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 transition hover:border-[var(--primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
    >
      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-[var(--card)] ring-1 ring-[var(--border)]">
        <Image
          src={getProfilePictureUrl(
            profile.username,
          )}
          alt={`${profile.displayName} profile picture`}
          fill
          sizes="44px"
          unoptimized
          className="object-cover"
        />
      </div>

      <div className="min-w-0">
        <p className="truncate font-semibold text-[var(--foreground)]">
          {profile.displayName}
        </p>

        <p className="truncate text-sm text-[var(--muted)]">
          @{profile.username}
        </p>
      </div>
    </Link>
  );
}