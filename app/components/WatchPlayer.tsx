// app/components/WatchPlayer.tsx
"use client";

import { useEffect, useRef, useState, type SyntheticEvent } from "react";

const WATCH_SECONDS_REQUIRED = 5;

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

function PlayIcon({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M8 5.5v13L19 12 8 5.5Z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-7 w-7"
      aria-hidden="true"
    >
      <path d="M7 5.5A1.5 1.5 0 0 1 8.5 4h1A1.5 1.5 0 0 1 11 5.5v13A1.5 1.5 0 0 1 9.5 20h-1A1.5 1.5 0 0 1 7 18.5v-13Zm6 0A1.5 1.5 0 0 1 14.5 4h1A1.5 1.5 0 0 1 17 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-1a1.5 1.5 0 0 1-1.5-1.5v-13Z" />
    </svg>
  );
}

function VolumeIcon({ muted }: { muted: boolean }) {
  if (muted) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6"
        aria-hidden="true"
      >
        <path d="M11 5 6 9H3v6h3l5 4V5Z" />
        <path d="m17 9 4 6" />
        <path d="m21 9-4 6" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="ml-0.5 h-6 w-6"
      aria-hidden="true"
    >
      <path d="M12 3.5l1.1 1.9 2.1.5 1.7-1 1.4 1.4-1 1.7.5 2.1 1.9 1.1v1.6l-1.9 1.1-.5 2.1 1 1.7-1.4 1.4-1.7-1-2.1.5-1.1 1.9h-1.6l-1.1-1.9-2.1-.5-1.7 1-1.4-1.4 1-1.7-.5-2.1-1.9-1.1v-1.6l1.9-1.1.5-2.1-1-1.7 1.4-1.4 1.7 1 2.1-.5L10.4 3.5H12Z" />
      <circle cx="11.2" cy="12" r="2.7" />
    </svg>
  );
}

function FullscreenIcon({ fullscreen }: { fullscreen: boolean }) {
  if (fullscreen) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6"
        aria-hidden="true"
      >
        <path d="M9 4H4v5" />
        <path d="m4 4 6 6" />
        <path d="M15 4h5v5" />
        <path d="m20 4-6 6" />
        <path d="M9 20H4v-5" />
        <path d="m4 20 6-6" />
        <path d="M15 20h5v-5" />
        <path d="m20 20-6-6" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path d="M4 9V4h5" />
      <path d="m4 4 6 6" />
      <path d="M20 9V4h-5" />
      <path d="m20 4-6 6" />
      <path d="M4 15v5h5" />
      <path d="m4 20 6-6" />
      <path d="M20 15v5h-5" />
      <path d="m20 20-6-6" />
    </svg>
  );
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) {
    return "0:00";
  }

  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const remainingSeconds = total % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const counted = useRef(false);
  const watched = useRef(0);
  const lastTime = useRef(0);

  const [views, setViews] = useState(initialViews);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  async function countView() {
    if (counted.current) return;

    counted.current = true;

    try {
      const res = await fetch(`/api/views/${encodeURIComponent(id)}`, {
        method: "POST",
      });

      if (!res.ok) {
        counted.current = false;
        return;
      }

      const data: { views: number } = await res.json();
      setViews(data.views);
    } catch {
      counted.current = false;
    }
  }

  function handleTimeUpdate(e: SyntheticEvent<HTMLVideoElement>) {
    const video = e.currentTarget;

    setCurrentTime(video.currentTime);

    const delta = video.currentTime - lastTime.current;
    lastTime.current = video.currentTime;

    if (delta > 0 && delta < 1 && !video.paused) {
      watched.current += delta / (video.playbackRate || 1);
    }

    if (watched.current >= WATCH_SECONDS_REQUIRED) {
      void countView();
    }
  }

  function handleLoadedMetadata(e: SyntheticEvent<HTMLVideoElement>) {
    setDuration(e.currentTarget.duration);
  }

  function handleSeeking(e: SyntheticEvent<HTMLVideoElement>) {
    lastTime.current = e.currentTarget.currentTime;
    setCurrentTime(e.currentTarget.currentTime);
  }

  function togglePlay() {
    const video = videoRef.current;

    if (!video) return;

    if (video.paused) {
      void video.play();
    } else {
      video.pause();
    }

    setShowControls(true);
  }

  function handleVolumeChange(value: number) {
    const video = videoRef.current;

    if (!video) return;

    const nextVolume = Math.min(1, Math.max(0, value));

    video.volume = nextVolume;
    video.muted = nextVolume === 0;

    setVolume(nextVolume);
    setMuted(nextVolume === 0);
    setShowControls(true);
  }

  function toggleMute() {
    const video = videoRef.current;

    if (!video) return;

    if (video.muted || video.volume === 0) {
      video.muted = false;
      video.volume = volume > 0 ? volume : 1;

      setMuted(false);
      setVolume(video.volume);
    } else {
      video.muted = true;
      setMuted(true);
    }

    setShowControls(true);
  }

  function seekTo(value: number) {
    const video = videoRef.current;

    if (!video) return;

    video.currentTime = value;
    setCurrentTime(value);
    setShowControls(true);
  }

  function changePlaybackRate(rate: number) {
    const video = videoRef.current;

    if (!video) return;

    video.playbackRate = rate;
    setPlaybackRate(rate);
    setShowSettings(false);
    setShowControls(true);
  }

  async function toggleFullscreen() {
    const player = playerRef.current;

    if (!player) return;

    try {
      if (!document.fullscreenElement) {
        await player.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Fullscreen may be blocked by the browser.
    }
  }

  function showPlayerControls() {
    setShowControls(true);

    if (hideControlsTimer.current) {
      clearTimeout(hideControlsTimer.current);
    }

    if (playing && !showSettings) {
      hideControlsTimer.current = setTimeout(() => {
        setShowControls(false);
      }, 2500);
    }
  }

  useEffect(() => {
    function handleFullscreenChange() {
      setFullscreen(Boolean(document.fullscreenElement));
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);

      if (hideControlsTimer.current) {
        clearTimeout(hideControlsTimer.current);
      }
    };
  }, []);

  const progress =
    duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  const volumePercent = muted ? 0 : volume * 100;

  return (
    <div>
      <div
        ref={playerRef}
        className="group relative aspect-video overflow-hidden rounded-2xl bg-black"
        onMouseMove={showPlayerControls}
        onMouseEnter={showPlayerControls}
        onMouseLeave={() => {
          if (playing && !showSettings) {
            setShowControls(false);
          }
        }}
      >
        <video
          ref={videoRef}
          key={src}
          src={src}
          playsInline
          autoPlay
          disableRemotePlayback
          onPlay={() => {
            setPlaying(true);
            setShowControls(true);
          }}
          onPause={() => {
            setPlaying(false);
            setShowControls(true);
          }}
          onEnded={() => {
            setPlaying(false);
            setShowControls(true);
          }}
          onTimeUpdate={handleTimeUpdate}
          onSeeking={handleSeeking}
          onLoadedMetadata={handleLoadedMetadata}
          onClick={togglePlay}
          className="h-full w-full cursor-pointer object-contain"
        />

        {/* Center play button */}
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? "Pause video" : "Play video"}
          className={`absolute left-1/2 top-1/2 z-10 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/75 text-white shadow-xl backdrop-blur-sm transition ${
            playing
              ? "pointer-events-none scale-95 opacity-0"
              : "scale-100 opacity-100 hover:scale-105 hover:bg-black/90"
          }`}
        >
          <PlayIcon />
        </button>

        {/* Top overlay */}
        <div
          className={`pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between bg-gradient-to-b from-black/60 to-transparent px-5 py-4 transition-opacity duration-200 ${
            showControls ? "opacity-100" : "opacity-0"
          }`}
        >
          <p className="max-w-[75%] truncate text-sm font-semibold text-white drop-shadow-lg">
            {title}
          </p>
          {/* 
          <span className="rounded-md bg-black/40 px-2 py-1 text-xs font-semibold text-white/80 backdrop-blur-sm">
            YouTubby
          </span> */}
        </div>

        {/* Bottom controls */}
        <div
          className={`absolute inset-x-0 bottom-0 z-20 transition-opacity duration-200 ${
            showControls || !playing
              ? "opacity-100"
              : "pointer-events-none opacity-0"
          }`}
        >
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

          <div className="relative px-4 pb-3 pt-10">
            {/* Progress */}
            <div className="mb-3">
              <input
                type="range"
                min="0"
                max={duration || 0}
                step="0.01"
                value={currentTime}
                onChange={(e) => seekTo(Number(e.target.value))}
                aria-label="Video progress"
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full accent-[var(--primary)]"
                style={{
                  background: `linear-gradient(to right, var(--primary) ${progress}%, rgba(255,255,255,0.3) ${progress}%)`,
                }}
              />
            </div>

            <div className="flex items-center gap-3 text-white">
              {/* Play / Pause */}
              <button
                type="button"
                onClick={togglePlay}
                aria-label={playing ? "Pause video" : "Play video"}
                className="rounded-full p-1 transition hover:bg-white/10"
              >
                {playing ? <PauseIcon /> : <PlayIcon className="h-7 w-7" />}
              </button>

              {/* Volume */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleMute}
                  aria-label={muted ? "Unmute video" : "Mute video"}
                  className="rounded-full p-1 transition hover:bg-white/10"
                >
                  <VolumeIcon muted={muted} />
                </button>

                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={muted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  aria-label="Volume"
                  className="hidden h-1 w-20 cursor-pointer appearance-none rounded-full accent-white sm:block"
                  style={{
                    background: `linear-gradient(to right, white ${volumePercent}%, rgba(255,255,255,0.3) ${volumePercent}%)`,
                  }}
                />
              </div>

              {/* Time */}
              <span className="ml-1 text-sm font-medium tabular-nums text-white">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>

              <div className="ml-auto flex items-center gap-1">
                {/* Settings */}
                <div className="relative">
                  {showSettings && (
                    <div className="absolute bottom-12 right-0 w-44 overflow-hidden rounded-xl border border-white/10 bg-black/95 p-1 shadow-2xl backdrop-blur-md">
                      <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white/50">
                        Playback speed
                      </p>

                      {PLAYBACK_RATES.map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => changePlaybackRate(rate)}
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                            playbackRate === rate
                              ? "bg-white/15 text-white"
                              : "text-white/80 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          <span>{rate === 1 ? "Normal" : `${rate}x`}</span>

                          {playbackRate === rate && (
                            <span className="text-[var(--primary)]">✓</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setShowSettings((value) => !value);
                      setShowControls(true);
                    }}
                    aria-label="Video settings"
                    aria-expanded={showSettings}
                    className="rounded-full p-1.5 text-white transition hover:bg-white/10"
                  >
                    <SettingsIcon />
                  </button>
                </div>

                {/* Fullscreen */}
                <button
                  type="button"
                  onClick={() => void toggleFullscreen()}
                  aria-label={
                    fullscreen ? "Exit fullscreen" : "Enter fullscreen"
                  }
                  className="rounded-full p-1.5 text-white transition hover:bg-white/10"
                >
                  <FullscreenIcon fullscreen={fullscreen} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <h1 className="mt-4 font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">
        {title}
      </h1>

      <p className="mt-1 text-sm text-[var(--muted)]">
        {views.toLocaleString()} {views === 1 ? "view" : "views"}
      </p>
    </div>
  );
}
