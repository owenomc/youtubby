// app/page.tsx
import Footer from "@/app/components/Footer";
import Navbar from "@/app/components/Navbar";
import HomeAuth from "@/app/components/HomeAuth";
import VideoGrid from "@/app/components/VideoGrid";
import { getVideos } from "@/app/lib/videos";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const videos = await getVideos();

  const trending = [...videos].sort((a, b) => b.views - a.views);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)] font-[family-name:var(--font-body)] text-[var(--foreground)]">
      {/* Main content */}
      <div className="flex-1">
        {/* Hero */}
        <section className="text-[var(--foreground)]">
          <Navbar />
          <HomeAuth />
        </section>

        {/* Trending */}
        <section
          id="trending"
          aria-labelledby="trending-heading"
          className="mx-auto max-w-7xl px-5 py-10 sm:px-8"
        >
          <div className="flex items-end justify-between gap-4">
            <h2
              id="trending-heading"
              className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-[var(--foreground)]"
            >
              Trending Videos
            </h2>
          </div>

          {trending.length === 0 ? (
            <p className="mt-10 text-[var(--muted)]">
              No videos yet. Upload .mp4 files to the videos/ folder in your S3
              bucket.
            </p>
          ) : (
            <VideoGrid videos={trending} />
          )}
        </section>

        {/* Call to action */}
        <HomeAuth showCta />
      </div>

      <Footer />
    </div>
  );
}