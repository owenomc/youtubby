import { NextResponse } from "next/server";
import { getVideos } from "@/app/lib/videos";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim().toLowerCase() ?? "";
  const terms = q.split(/\s+/).filter(Boolean);

  const videos = await getVideos();
  const matches =
    terms.length === 0
      ? videos
      : videos.filter((v) => {
          const title = v.title.toLowerCase();
          return terms.every((t) => title.includes(t));
        });

  return NextResponse.json(
    matches.slice(0, 6).map((v) => ({ id: v.id, title: v.title }))
  );
}