import Link from "next/link";
import type { Video } from "@/app/lib/videos";

function PlayIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l11.1-6.86a1 1 0 0 0 0-1.7L9.52 4.29A1 1 0 0 0 8 5.14Z" />
    </svg>
  );
}

export default function VideoCard({ video }: { video: Video }) {
  return (
    <li>
      <Link
        href={`/watch/${encodeURIComponent(video.id)}`}
        className="group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2326E8]"
      >
        <div className="relative aspect-video overflow-hidden">
          <video
            src={`${video.src}#t=0.5`}
            preload="metadata"
            muted
            playsInline
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-white pr-1">
              <PlayIcon className="ml-0.5 h-6 w-6" />
            </span>
          </div>
        </div>
        <h3 className="py-4 px-4 line-clamp-2 font-semibold capitalize leading-snug text-black group-hover:underline">
          {video.title}
        </h3>
      </Link>
    </li>
  );
}
