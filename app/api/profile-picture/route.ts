import { NextResponse } from "next/server";
import {
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
  },
});

const BUCKET = process.env.S3_BUCKET ?? "youtubby-videos";

function cleanUsername(value: string) {
  return decodeURIComponent(value)
    .trim()
    .replace(/^@/, "")
    .toLowerCase();
}

function isProfilePictureKey(key: string, username: string) {
  const prefix = "profile-pictures/";

  if (!key.startsWith(prefix)) {
    return false;
  }

  const filename = key.slice(prefix.length);

  const dotIndex = filename.lastIndexOf(".");

  if (dotIndex === -1) {
    return false;
  }

  const name = filename.slice(0, dotIndex).toLowerCase();
  const extension = filename.slice(dotIndex + 1).toLowerCase();

  if (name !== username) {
    return false;
  }

  return ["jpg", "jpeg", "png", "webp", "gif"].includes(
    extension,
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawUsername = searchParams.get("username");

    if (!rawUsername) {
      return new NextResponse("Username is required.", {
        status: 400,
      });
    }

    const username = cleanUsername(rawUsername);

    if (!username) {
      return new NextResponse("Invalid username.", {
        status: 400,
      });
    }

    const listResult = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: "profile-pictures/",
      }),
    );

    const matchingObjects = (listResult.Contents ?? [])
      .filter(
        (object) =>
          typeof object.Key === "string" &&
          isProfilePictureKey(object.Key, username),
      )
      .sort((a, b) => {
        const aTime = a.LastModified?.getTime() ?? 0;
        const bTime = b.LastModified?.getTime() ?? 0;

        return bTime - aTime;
      });

    const object = matchingObjects[0];

    if (!object?.Key) {
      return new NextResponse(null, {
        status: 404,
      });
    }

    const result = await s3.send(
      new GetObjectCommand({
        Bucket: BUCKET,
        Key: object.Key,
      }),
    );

    if (!result.Body) {
      return new NextResponse(null, {
        status: 404,
      });
    }

    const body = await result.Body.transformToByteArray();

    return new NextResponse(Buffer.from(body), {
      status: 200,
      headers: {
        "Content-Type": result.ContentType ?? "image/jpeg",
        "Cache-Control": "no-cache, max-age=0, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Unable to load profile picture:", error);

    return new NextResponse(
      "Unable to load profile picture.",
      {
        status: 500,
      },
    );
  }
}