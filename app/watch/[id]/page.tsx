import { notFound } from "next/navigation";
import { getVideos } from "@/app/lib/videos";
import VideoCard from "@/app/components/VideoCard";
import Footer from "@/app/components/Footer";
import SearchBar from "@/app/components/SearchBar";

export default async function WatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const videoId = decodeURIComponent(id);

  const videos = await getVideos();
  const video = videos.find((v) => v.id === videoId);

  if (!video) notFound();

  const more = videos.filter((v) => v.id !== video.id).slice(0, 8);

  return (
    <div className="min-h-screen bg-[#F6F7FF] text-[#14143A]">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-6 pb-20 sm:px-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Main video */}

        <div>
          <div className="mb-8">
            <SearchBar />
          </div>
          <div className="aspect-video overflow-hidden rounded-2xl bg-black">
            <video
              key={video.src}
              src={video.src}
              controls
              autoPlay
              playsInline
              className="h-full w-full"
            />
          </div>

          <h1 className="mt-4 text-2xl font-bold capitalize tracking-tight sm:text-3xl">
            {video.title}
          </h1>
        </div>

        {/* Recommended */}
        {more.length > 0 && (
          <aside aria-label="Recommended videos">
            <ul className="space-y-6">
              {more.map((v) => (
                <VideoCard key={v.id} video={v} />
              ))}
            </ul>
          </aside>
        )}
      </div>

      <Footer />
    </div>
  );
}
