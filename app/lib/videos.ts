// app/lib/videos.ts
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { db, TABLE } from "@/app/lib/db";

export type Video = {
  id: string;
  title: string;
  src: string;
  views: number;
};

const s3 = new S3Client({
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
  },
});

async function getViewCounts(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  let startKey: Record<string, unknown> | undefined;

  try {
    do {
      const res = await db.send(
        new ScanCommand({
          TableName: TABLE,
          ExclusiveStartKey: startKey,
        })
      );
      for (const item of res.Items ?? []) {
        counts[item.id as string] = (item.views as number) ?? 0;
      }
      startKey = res.LastEvaluatedKey;
    } while (startKey);
  } catch {
    return {};
  }

  return counts;
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
        })
      );
      for (const obj of res.Contents ?? []) {
        if (obj.Key) keys.push(obj.Key);
      }
      token = res.NextContinuationToken;
    } while (token);
  } catch {
    return [];
  }

  return keys;
}

export async function getVideos(): Promise<Video[]> {
  const [keys, counts] = await Promise.all([listVideoKeys(), getViewCounts()]);

  return keys
    .map((key) => key.replace(/^videos\//, ""))
    .filter((file) => file.toLowerCase().endsWith(".mp4"))
    .sort()
    .map((file) => {
      const id = file.replace(/\.mp4$/i, "");
      return {
        id,
        title: id.replace(/[-_]+/g, " "),
        src: `/videos/${encodeURIComponent(file)}`,
        views: counts[id] ?? 0,
      };
    });
}