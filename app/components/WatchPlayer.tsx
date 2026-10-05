"use client";

import { useRef, useState } from "react";

const WATCH_SECONDS_REQUIRED = 5;

export default function WatchPlayer({
  id,
  src,
  title,
  initialViews,
}: {
  id: string;
  src: string;
  title: string;
  initialViews: number;
}) {
  const [views, setViews] = useState(initialViews);
  const counted = useRef(false);
  const watched = useRef(0);
  const lastTime = useRef(0);

  async function countView() {
    if (counted.current) return;
    counted.current = true;

    try {
      const res = await fetch(`/api/views/${encodeURIComponent(id)}`, {
        method: "POST",
      });
      if (!res.ok) {
        // allow another attempt if the request failed
        counted.current = false;
        return;
      }
      const data: { views: number } = await res.json();
      setViews(data.views);
    } catch {
      counted.current = false;
    }
  }

  function handleTimeUpdate(e: React.SyntheticEvent<HTMLVideoElement>) {
    const video = e.currentTarget;
    const delta = video.currentTime - lastTime.current;
    lastTime.current = video.currentTime;

    // Only count normal forward playback. Jumps (seeking) are ignored.
    if (delta > 0 && delta < 1 && !video.paused) {
      watched.current += delta / (video.playbackRate || 1);
    }

    if (watched.current >= WATCH_SECONDS_REQUIRED) {
      void countView();
    }
  }

  function handleSeeking(e: React.SyntheticEvent<HTMLVideoElement>) {
    lastTime.current = e.currentTarget.currentTime;
  }

  return (
    <div>
      <div className="aspect-video overflow-hidden rounded-2xl bg-black">
        <video
          key={src}
          src={src}
          controls
          autoPlay
          playsInline
          onTimeUpdate={handleTimeUpdate}
          onSeeking={handleSeeking}
          className="h-full w-full"
        />
      </div>

      <h1 className="mt-4 text-2xl font-bold capitalize tracking-tight sm:text-3xl">
        {title}
      </h1>
      <p className="mt-1 text-sm text-black/60">
        {views.toLocaleString()} {views === 1 ? "view" : "views"}
      </p>
    </div>
  );
}