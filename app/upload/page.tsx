"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import {
  CognitoUserPool,
  CognitoUserSession,
} from "amazon-cognito-identity-js";

const userPool = new CognitoUserPool({
  UserPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
  ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
});

export default function UploadPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function handleFile(selectedFile: File | undefined) {
    if (!selectedFile) return;

    setError("");
    setSuccess("");
    setProgress(0);

    if (selectedFile.type !== "video/mp4") {
      setError("Please upload an MP4 video.");
      return;
    }

    if (selectedFile.size > 2 * 1024 * 1024 * 1024) {
      setError("Videos must be 2 GB or smaller.");
      return;
    }

    setFile(selectedFile);

    if (!title) {
      const filename = selectedFile.name.replace(/\.[^/.]+$/, "");
      setTitle(filename);
    }
  }

  function handleFileInput(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    handleFile(event.target.files?.[0]);
  }

  function handleDrop(
    event: React.DragEvent<HTMLDivElement>,
  ) {
    event.preventDefault();
    setDragging(false);

    if (!uploading) {
      handleFile(event.dataTransfer.files?.[0]);
    }
  }

  function removeFile() {
    if (uploading) return;

    setFile(null);
    setProgress(0);
    setSuccess("");
    setError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function getProfileUsername(): Promise<string> {
    const currentUser = userPool.getCurrentUser();

    if (!currentUser) {
      return Promise.reject(
        new Error("You must be signed in to upload a video."),
      );
    }

    return new Promise((resolve, reject) => {
      currentUser.getSession(
        (
          sessionError: Error | null,
          session: CognitoUserSession | null,
        ) => {
          if (
            sessionError ||
            !session ||
            !session.isValid()
          ) {
            reject(
              new Error(
                "Your session has expired. Please sign in again.",
              ),
            );
            return;
          }

          currentUser.getUserAttributes(
            (attributeError, attributes) => {
              if (attributeError || !attributes) {
                console.error(
                  "Cognito attribute error:",
                  attributeError,
                );

                reject(
                  new Error(
                    "Unable to load your Cognito profile.",
                  ),
                );
                return;
              }

              const preferredUsername = attributes
                .find(
                  (attribute) =>
                    attribute.getName() ===
                    "preferred_username",
                )
                ?.getValue()
                ?.trim();

              const email = attributes
                .find(
                  (attribute) =>
                    attribute.getName() === "email",
                )
                ?.getValue()
                ?.trim();

              const emailUsername = email
                ? email.split("@")[0]
                : "";

              const username =
                preferredUsername || emailUsername;

              console.log(
                "Cognito upload username:",
                username,
              );

              if (!username) {
                reject(
                  new Error(
                    "Unable to determine your username from your Cognito account.",
                  ),
                );
                return;
              }

              resolve(username);
            },
          );
        },
      );
    });
  }

  async function getUploadUrl() {
    if (!file) {
      throw new Error("Please select a video first.");
    }

    const username = await getProfileUsername();

    console.log(
      "Sending upload request for username:",
      username,
    );

    const response = await fetch("/api/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        title: title.trim(),
        username,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.error || "Unable to prepare the upload.",
      );
    }

    if (!data.uploadUrl) {
      throw new Error(
        "The server did not return an upload URL.",
      );
    }

    return data.uploadUrl as string;
  }

  function uploadToS3(
    uploadUrl: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error("No video selected."));
        return;
      }

      const xhr = new XMLHttpRequest();

      xhr.open("PUT", uploadUrl);

      xhr.setRequestHeader(
        "Content-Type",
        "video/mp4",
      );

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setProgress(
            Math.round(
              (event.loaded / event.total) * 100,
            ),
          );
        }
      };

      xhr.onload = () => {
        if (
          xhr.status >= 200 &&
          xhr.status < 300
        ) {
          resolve();
          return;
        }

        reject(
          new Error(
            `S3 upload failed with status ${xhr.status}.`,
          ),
        );
      };

      xhr.onerror = () => {
        reject(
          new Error(
            "The upload failed. Please check your connection and try again.",
          ),
        );
      };

      xhr.onabort = () => {
        reject(
          new Error("Upload was cancelled."),
        );
      };

      xhr.send(file);
    });
  }

  function redirectToProfile() {
    const currentUser =
      userPool.getCurrentUser();

    if (!currentUser) {
      window.location.href = "/";
      return;
    }

    currentUser.getSession(
      (
        sessionError: Error | null,
        session: CognitoUserSession | null,
      ) => {
        if (
          sessionError ||
          !session ||
          !session.isValid()
        ) {
          window.location.href = "/";
          return;
        }

        currentUser.getUserAttributes(
          (
            attributeError,
            attributes,
          ) => {
            if (
              attributeError ||
              !attributes
            ) {
              window.location.href = "/";
              return;
            }

            const preferredUsername =
              attributes
                .find(
                  (attribute) =>
                    attribute.getName() ===
                    "preferred_username",
                )
                ?.getValue()
                ?.trim();

            const email =
              attributes
                .find(
                  (attribute) =>
                    attribute.getName() ===
                    "email",
                )
                ?.getValue()
                ?.trim();

            const username =
              preferredUsername ||
              email?.split("@")[0];

            if (username) {
              window.location.href =
                `/@${encodeURIComponent(username)}`;

              return;
            }

            window.location.href = "/";
          },
        );
      },
    );
  }

  async function handleUpload() {
    setError("");
    setSuccess("");

    if (!file) {
      setError(
        "Please select a video first.",
      );
      return;
    }

    if (!title.trim()) {
      setError(
        "Please enter a video title.",
      );
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const uploadUrl =
        await getUploadUrl();

      await uploadToS3(uploadUrl);

      setProgress(100);

      setSuccess(
        "Your video was uploaded successfully!",
      );

      redirectToProfile();
    } catch (err) {
      console.error(
        "Video upload error:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to upload your video.",
      );

      setUploading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)] font-[family-name:var(--font-body)] text-[var(--foreground)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--background)]">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
          <Link
            href="/"
            className="flex items-center rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FFD23F]"
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

      <main className="mx-auto w-full max-w-4xl px-5 pb-20 pt-8 sm:px-8 sm:pt-12">
        <div className="mb-8">
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-tight sm:text-5xl">
            Upload a video
          </h1>

          <p className="mt-3 text-base text-[var(--muted)]">
            Share your video with the world.
          </p>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8">
          <div
            onDragOver={(event) => {
              event.preventDefault();

              if (!uploading) {
                setDragging(true);
              }
            }}
            onDragLeave={() =>
              setDragging(false)
            }
            onDrop={handleDrop}
            onClick={() => {
              if (!file && !uploading) {
                fileInputRef.current?.click();
              }
            }}
            className={`relative flex min-h-[300px] flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 text-center transition sm:min-h-[360px] ${
              uploading
                ? "cursor-default border-[var(--primary)]/30 bg-[var(--primary)]/5"
                : dragging
                  ? "cursor-pointer border-[var(--primary)] bg-[var(--primary)]/5"
                  : "cursor-pointer border-[var(--border)] bg-[var(--background)] hover:border-[var(--primary)]/50 hover:bg-[var(--primary)]/5"
            }`}
          >
            {!file ? (
              <>
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
                  <svg
                    width="36"
                    height="36"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 16V4" />
                    <path d="m7 9 5-5 5 5" />
                    <path d="M5 20h14" />
                  </svg>
                </div>

                <h2 className="mt-6 text-xl font-bold">
                  Drag and drop your video here
                </h2>

                <p className="mt-2 text-sm text-[var(--muted)]">
                  or click to browse your computer
                </p>

                <p className="mt-5 text-xs font-medium text-[var(--muted)]">
                  MP4 only · Maximum 2 GB
                </p>
              </>
            ) : (
              <div
                className="w-full max-w-xl"
                onClick={(event) =>
                  event.stopPropagation()
                }
              >
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
                  <svg
                    width="36"
                    height="36"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect
                      x="3"
                      y="5"
                      width="18"
                      height="14"
                      rx="2"
                    />
                    <path d="m10 9 5 3-5 3V9Z" />
                  </svg>
                </div>

                <p className="mt-5 truncate text-lg font-bold">
                  {file.name}
                </p>

                <p className="mt-2 text-sm text-[var(--muted)]">
                  {(file.size / (1024 * 1024)).toFixed(
                    1,
                  )}{" "}
                  MB
                </p>

                {uploading && (
                  <div className="mx-auto mt-6 max-w-md">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span>Uploading...</span>

                      <span>
                        {progress}%
                      </span>
                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--dropdown-toggle-off)]">
                      <div
                        className="h-full rounded-full bg-[var(--primary)] transition-[width] duration-200"
                        style={{
                          width: `${progress}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {!uploading && !success && (
                  <button
                    type="button"
                    onClick={removeFile}
                    className="mt-5 cursor-pointer text-sm font-semibold text-red-500 transition hover:text-red-600"
                  >
                    Remove video
                  </button>
                )}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4"
              onChange={handleFileInput}
              className="hidden"
            />
          </div>

          {file && (
            <div className="mt-8">
              <label
                htmlFor="video-title"
                className="mb-2 block text-sm font-semibold"
              >
                Video Title
              </label>

              <input
                id="video-title"
                type="text"
                value={title}
                onChange={(event) =>
                  setTitle(event.target.value)
                }
                maxLength={100}
                disabled={uploading}
                placeholder="Give your video a title"
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3.5 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60"
              />

              <div className="mt-2 flex justify-between text-xs text-[var(--muted)]">
                <span>
                  Choose a clear, descriptive title.
                </span>

                <span>
                  {title.length}/100
                </span>
              </div>
            </div>
          )}

          {(error || success) && (
            <div
              className={`mt-6 rounded-2xl px-4 py-3 text-sm ${
                error
                  ? "bg-red-500/10 text-red-600 dark:text-red-400"
                  : "bg-green-500/10 text-green-600 dark:text-green-400"
              }`}
            >
              {error || success}
            </div>
          )}

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/"
              className="cursor-pointer rounded-full border border-[var(--border)] bg-[var(--background)] px-6 py-3 text-center text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--dropdown-hover)]"
            >
              Cancel
            </Link>

            <button
              type="button"
              onClick={handleUpload}
              disabled={!file || uploading}
              className="cursor-pointer rounded-full bg-[var(--primary)] px-7 py-3 text-sm font-semibold text-white transition hover:scale-[1.02] hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading
                ? `Uploading ${progress}%`
                : "Upload Video"}
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 py-4 text-sm text-[var(--muted)]">
          <strong className="text-[var(--foreground)]">
            Upload tips:
          </strong>{" "}
          Use an MP4 file, give your video a descriptive
          title, and make sure you have the rights to upload
          the content.
        </div>
      </main>
    </div>
  );
}