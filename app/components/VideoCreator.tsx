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

const userPool = new CognitoUserPool({
  UserPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
  ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
});

type CreatorProfile = {
  username: string;
  displayName: string;
  picture: string;
};

function getCurrentCognitoUser(): CognitoUser | null {
  return userPool.getCurrentUser();
}

function getAuthenticatedUser(
  user: CognitoUser,
): Promise<CognitoUserSession> {
  return new Promise((resolve, reject) => {
    user.getSession(
      (err: Error | null, session: CognitoUserSession | null) => {
        if (err || !session || !session.isValid()) {
          reject(new Error("User is not authenticated."));
          return;
        }

        resolve(session);
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
        reject(err ?? new Error("Unable to load your account."));
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

  return "";
}

export default function VideoCreator({
  username,
}: {
  username: string;
}) {
  const cleanUsername = username.replace(/^@/, "").trim();

  const [creator, setCreator] = useState<CreatorProfile>({
    username: cleanUsername,
    displayName: cleanUsername,
    picture: "/logo.png",
  });

  const [subscriberCount, setSubscriberCount] = useState(0);
  const [currentUsername, setCurrentUsername] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const profileResponse = await fetch(
          `/api/profile?username=${encodeURIComponent(cleanUsername)}`,
          {
            cache: "no-store",
          },
        );

        if (profileResponse.ok) {
          const profileData = await profileResponse.json();

          if (!cancelled) {
            setCreator({
              username: profileData.username || cleanUsername,
              displayName:
                profileData.displayName || cleanUsername,
              picture: profileData.picture || "/logo.png",
            });
          }
        }

        const currentUser = getCurrentCognitoUser();

        let viewerUsername = "";

        if (currentUser) {
          try {
            await getAuthenticatedUser(currentUser);

            const attributes = await getUserAttributes(currentUser);

            viewerUsername = getUsernameFromAttributes(attributes);
          } catch {
            viewerUsername = "";
          }
        }

        const query = new URLSearchParams();

        query.set("creator", cleanUsername);

        if (viewerUsername) {
          query.set("subscriber", viewerUsername);
        }

        const subscriptionResponse = await fetch(
          `/api/subscriptions?${query.toString()}`,
          {
            cache: "no-store",
          },
        );

        if (subscriptionResponse.ok) {
          const data = await subscriptionResponse.json();

          if (!cancelled) {
            setCurrentUsername(viewerUsername);
            setSubscriberCount(data.subscriberCount ?? 0);
            setSubscribed(Boolean(data.subscribed));
          }
        }
      } catch (error) {
        console.error("Unable to load creator:", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [cleanUsername]);

  const isOwnCreator =
    currentUsername.length > 0 &&
    currentUsername.toLowerCase() ===
      cleanUsername.toLowerCase();

  async function handleSubscribe() {
    if (changing) {
      return;
    }

    const currentUser = getCurrentCognitoUser();

    if (!currentUser) {
      window.location.href = "/signin";
      return;
    }

    setChanging(true);

    try {
      await getAuthenticatedUser(currentUser);

      const attributes = await getUserAttributes(currentUser);

      const viewerUsername =
        getUsernameFromAttributes(attributes);

      if (!viewerUsername) {
        window.location.href = "/signin";
        return;
      }

      if (
        viewerUsername.toLowerCase() ===
        cleanUsername.toLowerCase()
      ) {
        return;
      }

      const response = await fetch("/api/subscriptions", {
        method: subscribed ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscriber: viewerUsername,
          creator: cleanUsername,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to update your subscription.",
        );
      }

      setSubscribed(Boolean(data.subscribed));

      setSubscriberCount(
        Number(data.subscriberCount ?? subscriberCount),
      );
    } catch (error) {
      console.error("Subscription error:", error);
    } finally {
      setChanging(false);
    }
  }

  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--border)] pt-5">
      <Link
        href={`/@${encodeURIComponent(creator.username)}`}
        className="flex min-w-0 items-center gap-3 rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
      >
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-[var(--background)] ring-1 ring-[var(--border)]">
          <Image
            src={creator.picture}
            alt={`${creator.displayName} profile picture`}
            width={48}
            height={48}
            className="h-full w-full object-cover"
            unoptimized={creator.picture.startsWith("blob:")}
          />
        </div>

        <div className="min-w-0">
          <p className="truncate font-semibold text-[var(--foreground)]">
            {creator.displayName}
          </p>

          <p className="truncate text-sm text-[var(--muted)]">
            @{creator.username} ·{" "}
            {loading
              ? "Loading..."
              : `${subscriberCount.toLocaleString()} ${
                  subscriberCount === 1
                    ? "subscriber"
                    : "subscribers"
                }`}
          </p>
        </div>
      </Link>

      {!isOwnCreator && (
        <button
          type="button"
          onClick={() => void handleSubscribe()}
          disabled={changing || loading}
          className={`rounded-full px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
            subscribed
              ? "border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--background)]"
              : "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]"
          }`}
        >
          {changing
            ? "..."
            : subscribed
              ? "Subscribed"
              : "Subscribe"}
        </button>
      )}
    </div>
  );
}