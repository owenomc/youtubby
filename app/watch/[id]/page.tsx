import { notFound } from "next/navigation";

import { getVideos } from "@/app/lib/videos";

import VideoCard from "@/app/components/VideoCard";
import VideoCreator from "@/app/components/VideoCreator";
import Footer from "@/app/components/Footer";
import Navbar from "@/app/components/Navbar";
import WatchPlayer from "@/app/components/WatchPlayer";

export const dynamic = "force-dynamic";

export default async function WatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const videoId = decodeURIComponent(id);

  const videos = await getVideos();

  const video = videos.find(
    (v) => v.id === videoId,
  );

  if (!video) {
    notFound();
  }

  const more = videos
    .filter((v) => v.id !== video.id)
    .slice(0, 8);

  return (
    <div className="min-h-screen bg-[var(--background)] font-[family-name:var(--font-body)] text-[var(--foreground)]">
      <Navbar />

      <main className="mx-auto grid max-w-7xl gap-8 px-5 py-6 pb-20 sm:px-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <WatchPlayer
            key={video.id}
            id={video.id}
            src={video.src}
            title={video.title}
            initialViews={video.views}
          />

          {video.username && (
            <VideoCreator
              username={video.username}
            />
          )}
        </div>

        {more.length > 0 && (
          <aside
            aria-label="Recommended videos"
            className="hidden lg:block"
          >
            <ul className="space-y-6">
              {more.map((v) => (
                <VideoCard
                  key={v.id}
                  video={v}
                />
              ))}
            </ul>
          </aside>
        )}
      </main>

      <Footer />
    </div>
  );
}