import Link from "next/link";
import Image from "next/image";
import Footer from "@/app/components/Footer";
import SearchBar from "@/app/components/SearchBar";
import VideoCard from "@/app/components/VideoCard";
import { getVideos } from "@/app/lib/videos";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim();

  const videos = await getVideos();

  // Every word in the query must appear in the title
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const results =
    terms.length === 0
      ? videos
      : videos.filter((v) => {
          const title = v.title.toLowerCase();
          return terms.every((term) => title.includes(term));
        });

  return (
    <div className="min-h-screen bg-[#F6F7FF] text-[#14143A]">
      <header className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2326E8]"
        >
          <Image
            src="/logo.png"
            alt="YouTubby Logo"
            width={44}
            height={32}
            className="h-8 w-11 object-contain"
          />
          <span className="text-2xl font-extrabold tracking-tight text-black">
            YouTubby
          </span>
        </Link>

        <SearchBar />

        <nav aria-label="Account" className="flex items-center gap-2">
          <Link
            href="/signin"
            className="rounded-full px-4 py-2 font-medium text-black hover:bg-black/10"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-[#2326e8] px-5 py-2 text-white transition hover:scale-105"
          >
            Sign Up
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {query ? `Results for "${query}"` : "All videos"}
        </h1>
        <p className="mt-2 text-sm text-black/70">
          {results.length} {results.length === 1 ? "video" : "videos"}
        </p>

        {results.length === 0 ? (
          <div className="mt-10">
            <p className="text-lg font-semibold">No videos found.</p>
            <p className="mt-1 text-black/70">
              Try different keywords, or{" "}
              <Link
                href="/search"
                className="font-semibold text-[#2326E8] underline-offset-4 hover:underline"
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