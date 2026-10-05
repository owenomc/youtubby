// lib/videos.ts
import { promises as fs } from "fs";
import path from "path";

export type Video = {
  id: string;
  title: string;
  src: string;
};

export async function getVideos(): Promise<Video[]> {
  const dir = path.join(process.cwd(), "public", "videos");

  let files: string[] = [];
  try {
    files = await fs.readdir(dir);
  } catch {
    return [];
  }

  return files
    .filter((file) => file.toLowerCase().endsWith(".mp4"))
    .sort()
    .map((file) => {
      const id = file.replace(/\.mp4$/i, "");
      return {
        id,
        title: id.replace(/[-_]+/g, " "),
        src: `/videos/${encodeURIComponent(file)}`,
      };
    });
}