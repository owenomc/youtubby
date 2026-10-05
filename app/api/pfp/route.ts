import { NextResponse } from "next/server";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
  },
});

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function cleanUsername(value: string) {
  return value
    .trim()
    .replace(/^@/, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "");
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const file = formData.get("file");
    const rawUsername = formData.get("username");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          error: "No image file was provided.",
        },
        { status: 400 },
      );
    }

    if (typeof rawUsername !== "string" || !rawUsername.trim()) {
      return NextResponse.json(
        {
          error: "Username is required.",
        },
        { status: 400 },
      );
    }

    const username = cleanUsername(rawUsername);

    if (!username) {
      return NextResponse.json(
        {
          error: "Invalid username.",
        },
        { status: 400 },
      );
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          error:
            "Invalid image type. Please upload a JPG, PNG, WebP, or GIF image.",
        },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: "Profile pictures must be 5 MB or smaller.",
        },
        { status: 400 },
      );
    }

    const bucket = process.env.S3_BUCKET;

    if (!bucket) {
      return NextResponse.json(
        {
          error: "S3_BUCKET is not configured.",
        },
        { status: 500 },
      );
    }

    if (!process.env.S3_REGION) {
      return NextResponse.json(
        {
          error: "S3_REGION is not configured.",
        },
        { status: 500 },
      );
    }

    if (!process.env.S3_ACCESS_KEY_ID) {
      return NextResponse.json(
        {
          error: "S3_ACCESS_KEY_ID is not configured.",
        },
        { status: 500 },
      );
    }

    if (!process.env.S3_SECRET_ACCESS_KEY) {
      return NextResponse.json(
        {
          error: "S3_SECRET_ACCESS_KEY is not configured.",
        },
        { status: 500 },
      );
    }

    const extension =
      file.type === "image/jpeg"
        ? "jpg"
        : file.type === "image/png"
          ? "png"
          : file.type === "image/webp"
            ? "webp"
            : "gif";

    const key = `profile-pictures/${username}.${extension}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentLength: buffer.length,
        ContentType: file.type,
        CacheControl: "no-cache, max-age=0, must-revalidate",
      }),
    );

    return NextResponse.json({
      success: true,
      key,
      url: `/api/profile-picture?username=${encodeURIComponent(username)}&t=${Date.now()}`,
    });
  } catch (error) {
    console.error("Profile picture upload error:", error);

    const message =
      error instanceof Error ? error.message : "Unknown S3 upload error.";

    return NextResponse.json(
      {
        error: `Unable to upload profile picture: ${message}`,
      },
      { status: 500 },
    );
  }
}