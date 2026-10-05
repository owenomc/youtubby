import { NextResponse } from "next/server";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import crypto from "crypto";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { db, TABLE } from "@/app/lib/db";

const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2 GB

const s3 = new S3Client({
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
  },
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      fileName,
      fileType,
      fileSize,
      title,
      username,
    } = body as {
      fileName?: string;
      fileType?: string;
      fileSize?: number;
      title?: string;
      username?: string;
    };

    if (!fileName || !fileType || !fileSize) {
      return NextResponse.json(
        { error: "Missing video information." },
        { status: 400 },
      );
    }

    if (fileType !== "video/mp4") {
      return NextResponse.json(
        { error: "Only MP4 videos are supported." },
        { status: 400 },
      );
    }

    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Videos must be 2 GB or smaller." },
        { status: 400 },
      );
    }

    if (!title?.trim()) {
      return NextResponse.json(
        { error: "A video title is required." },
        { status: 400 },
      );
    }

    if (!username?.trim()) {
      return NextResponse.json(
        { error: "Unable to determine your username." },
        { status: 400 },
      );
    }

    const bucket = process.env.S3_BUCKET;

    if (!bucket) {
      return NextResponse.json(
        { error: "S3 bucket is not configured." },
        { status: 500 },
      );
    }

    if (!process.env.S3_REGION) {
      return NextResponse.json(
        { error: "S3 region is not configured." },
        { status: 500 },
      );
    }

    if (
      !process.env.S3_ACCESS_KEY_ID ||
      !process.env.S3_SECRET_ACCESS_KEY
    ) {
      return NextResponse.json(
        { error: "S3 credentials are not configured." },
        { status: 500 },
      );
    }

    const id = crypto.randomUUID();
    const key = `videos/${id}.mp4`;

    /*
     * Generate the presigned S3 URL first.
     */
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(s3, command, {
      expiresIn: 900,
    });

    /*
     * Save metadata for the video.
     */
    await db.send(
      new PutCommand({
        TableName: TABLE,
        Item: {
          id,
          title: title.trim(),
          username: username.trim(),
          views: 0,
        },
      }),
    );

    return NextResponse.json({
      success: true,
      uploadUrl,
      id,
      key,
    });
  } catch (error) {
    console.error(
      "Video upload preparation error:",
      error,
    );

    return NextResponse.json(
      {
        error: "Unable to prepare the video upload.",
      },
      { status: 500 },
    );
  }
}