import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { db, TABLE } from "@/app/lib/db";

export type Video = {
  id: string;
  title: string;
  src: string;
  views: number;
  username?: string;
};

const s3 = new S3Client({
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
  },
});

type VideoMetadata = {
  id: string;
  views: number;
  username?: string;
  title?: string;
};

async function getVideoMetadata(): Promise<
  Record<string, VideoMetadata>
> {
  const metadata: Record<string, VideoMetadata> = {};

  let startKey: Record<string, unknown> | undefined;

  try {
    do {
      const res = await db.send(
        new ScanCommand({
          TableName: TABLE,
          ExclusiveStartKey: startKey,
        }),
      );

      for (const item of res.Items ?? []) {
        const id = item.id as string | undefined;

        if (!id) {
          continue;
        }

        metadata[id] = {
          id,
          views: (item.views as number) ?? 0,
          username: item.username as string | undefined,
          title: item.title as string | undefined,
        };
      }

      startKey = res.LastEvaluatedKey;
    } while (startKey);
  } catch (error) {
    console.error("Unable to load video metadata:", error);
    return {};
  }

  return metadata;
}

async function listVideoKeys(): Promise<string[]> {
  const keys: string[] = [];

  let token: string | undefined;

  try {
    do {
      const res = await s3.send(
        new ListObjectsV2Command({
          Bucket: process.env.S3_BUCKET,
          Prefix: "videos/",
          ContinuationToken: token,
        }),
      );

      for (const obj of res.Contents ?? []) {
        if (obj.Key) {
          keys.push(obj.Key);
        }
      }

      token = res.NextContinuationToken;
    } while (token);
  } catch (error) {
    console.error("Unable to list videos:", error);
    return [];
  }

  return keys;
}

export async function getVideos(): Promise<Video[]> {
  const [keys, metadata] = await Promise.all([
    listVideoKeys(),
    getVideoMetadata(),
  ]);

  return keys
    .map((key) => key.replace(/^videos\//, ""))
    .filter((file) => file.toLowerCase().endsWith(".mp4"))
    .sort()
    .map((file) => {
      const id = file.replace(/\.mp4$/i, "");

      const videoMetadata = metadata[id];

      return {
        id,
        title:
          videoMetadata?.title ||
          id.replace(/-[a-f0-9]{8}-[a-f0-9-]+$/i, "").replace(/[-_]+/g, " "),
        src: `/videos/${encodeURIComponent(file)}`,
        views: videoMetadata?.views ?? 0,
        username: videoMetadata?.username,
      };
    });
}