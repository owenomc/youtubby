// app/components/VideoGrid.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import VideoCard from "@/app/components/VideoCard";
import type { Video } from "@/app/lib/videos";

const VIDEOS_PER_LOAD = 12;

export default function VideoGrid({ videos }: { videos: Video[] }) {
  const [visibleCount, setVisibleCount] = useState(VIDEOS_PER_LOAD);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const visibleVideos = videos.slice(0, visibleCount);
  const hasMore = visibleCount < videos.length;

  useEffect(() => {
    if (!hasMore || !loadMoreRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((current) =>
            Math.min(current + VIDEOS_PER_LOAD, videos.length),
          );
        }
      },
      {
        rootMargin: "600px",
      },
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [hasMore, videos.length]);

  return (
    <>
      <ul className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {visibleVideos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </ul>

      {hasMore && (
        <div
          ref={loadMoreRef}
          aria-hidden="true"
          className="flex h-24 items-center justify-center"
        >
          <div
            className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]"
            aria-label="Loading more videos"
          />
        </div>
      )}
    </>
  );
}