import { NextResponse } from "next/server";
import {
  DeleteObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { DeleteCommand } from "@aws-sdk/lib-dynamodb";

import { getVideos } from "@/app/lib/videos";
import { db, TABLE } from "@/app/lib/db";

const s3 = new S3Client({
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
  },
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username")?.trim();

    if (!username) {
      return NextResponse.json(
        { error: "Username is required." },
        { status: 400 },
      );
    }

    const videos = await getVideos();

    const userVideos = videos.filter(
      (video) =>
        video.username?.toLowerCase() === username.toLowerCase(),
    );

    return NextResponse.json(userVideos);
  } catch (error) {
    console.error("Unable to load user videos:", error);

    return NextResponse.json(
      { error: "Unable to load videos." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();

    const id =
      typeof body.id === "string" ? body.id.trim() : "";

    const username =
      typeof body.username === "string"
        ? body.username.trim()
        : "";

    if (!id) {
      return NextResponse.json(
        { error: "Video ID is required." },
        { status: 400 },
      );
    }

    if (!username) {
      return NextResponse.json(
        { error: "Username is required." },
        { status: 400 },
      );
    }

    const videos = await getVideos();

    const video = videos.find(
      (item) =>
        item.id === id &&
        item.username?.toLowerCase() === username.toLowerCase(),
    );

    if (!video) {
      return NextResponse.json(
        {
          error:
            "Video not found or you do not own this video.",
        },
        { status: 404 },
      );
    }

    /*
     * Find the actual S3 object whose filename corresponds
     * to this video's ID.
     */
    let videoKey: string | undefined;
    let continuationToken: string | undefined;

    do {
      const result = await s3.send(
        new ListObjectsV2Command({
          Bucket: process.env.S3_BUCKET,
          Prefix: "videos/",
          ContinuationToken: continuationToken,
        }),
      );

      for (const object of result.Contents ?? []) {
        if (!object.Key) {
          continue;
        }

        const fileName = object.Key.replace(/^videos\//, "");
        const fileId = fileName.replace(/\.mp4$/i, "");

        if (fileId === id) {
          videoKey = object.Key;
          break;
        }
      }

      if (videoKey) {
        break;
      }

      continuationToken = result.NextContinuationToken;
    } while (continuationToken);

    if (!videoKey) {
      return NextResponse.json(
        {
          error: `Could not find the S3 file for video "${id}".`,
        },
        { status: 404 },
      );
    }

    console.log("Deleting video:", {
      id,
      username,
      s3Key: videoKey,
      table: TABLE,
    });

    // Delete the actual video file from S3.
    await s3.send(
      new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: videoKey,
      }),
    );

    // Delete the video's metadata from DynamoDB.
    await db.send(
      new DeleteCommand({
        TableName: TABLE,
        Key: {
          id,
        },
      }),
    );

    return NextResponse.json({
      success: true,
      id,
    });
  } catch (error) {
    console.error("Unable to delete video:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Unknown server error.";

    return NextResponse.json(
      {
        error: `Unable to delete this video: ${message}`,
      },
      { status: 500 },
    );
  }
}