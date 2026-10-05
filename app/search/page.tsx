import Link from "next/link";
import Footer from "@/app/components/Footer";
import SearchBar from "@/app/components/SearchBar";
import VideoCard from "@/app/components/VideoCard";
import { getVideos } from "@/app/lib/videos";
import Navbar from "../components/Navbar";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim();

  const videos = await getVideos();

  // Every word in the query must appear in the title.
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

  const results =
    terms.length === 0
      ? videos
      : videos.filter((video) => {
          const title = video.title.toLowerCase();
          return terms.every((term) => title.includes(term));
        });

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)] font-[family-name:var(--font-body)] text-[var(--foreground)]">
      {/* Hero */}
      <section className="text-[var(--foreground)]">
        <Navbar />
      </section>

      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-10 sm:px-8">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight sm:text-3xl">
          {query ? `Results for "${query}"` : "All videos"}
        </h1>

        <p className="mt-2 text-sm text-[var(--muted)]">
          {results.length}{" "}
          {results.length === 1 ? "video" : "videos"}
        </p>

        {results.length === 0 ? (
          <div className="mt-10">
            <p className="text-lg font-semibold">
              No videos found.
            </p>

            <p className="mt-1 text-[var(--muted)]">
              Try different keywords, or{" "}
              <Link
                href="/search"
                className="font-semibold text-[var(--primary)] underline-offset-4 hover:text-[var(--primary-hover)] hover:underline"
              >
                browse all videos
              </Link>
              .
            </p>
          </div>
        ) : (
          <ul className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {results.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </ul>
        )}
      </main>

      <Footer />
    </div>
  );
}