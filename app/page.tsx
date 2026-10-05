import Footer from "@/app/components/Footer";
import SearchBar from "@/app/components/SearchBar";
import VideoCard from "@/app/components/VideoCard";
import { getVideos } from "@/app/lib/videos";

import Link from "next/link";
import Image from "next/image";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const body = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export default async function LandingPage() {
  const videos = await getVideos();

  return (
    <div
      className={`${display.variable} ${body.variable} min-h-screen bg-[#F6F7FF] font-[family-name:var(--font-body)] text-[#14143A]`}
    >
      {/* Hero */}
      <section className="text-white">
        <header className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <Link
            href="/"
            className="flex items-center rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FFD23F]"
          >
            <Image
              src="/logo.png"
              alt="YouTubby Logo"
              width={36}
              height={36}
              className="h-8 w-8 object-contain"
            />
            <span className="text-2xl font-extrabold tracking-tight text-black">
              YouTubby
            </span>
          </Link>

          <SearchBar />

          <nav aria-label="Account" className="hidden md:flex items-center gap-2">
            <Link
              href="/signin"
              className="rounded-full px-4 py-2 font-medium text-black hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FFD23F]"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-[#2326e8] px-5 py-2 text-white transition hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Sign Up
            </Link>
          </nav>
        </header>

        <div className="hidden md:flex mx-auto max-w-7xl items-center gap-12 px-5 pt-10 sm:px-8 lg:grid-cols-2 pt-16">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-5xl font-extrabold leading-[1.02] tracking-tight text-black sm:text-6xl lg:text-7xl">
              Share videos with the world.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-black">
              Upload once and YouTubby gets it ready for every screen.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/upload"
                className="hidden md:flex rounded-full bg-[#2326e8] px-7 py-3.5 text-lg text-white transition hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Upload a video
              </Link>
              <Link
                href="#trending"
                className="hidden md:flex rounded-full border-2 border-slate-200 bg-slate-200 px-7 py-3.5 text-lg text-black transition hover:scale-105"
              >
                Browse videos
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trending */}
      <section
        id="trending"
        aria-labelledby="trending-heading"
        className="mx-auto max-w-7xl px-5 py-20 sm:px-8"
      >
        <div className="flex items-end justify-between gap-4">
          <h2
            id="trending-heading"
            className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight"
          >
            Trending Videos
          </h2>
          <Link
            href="/search"
            className="hidden font-semibold text-[#2326E8] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2326E8] sm:block"
          >
            See all videos
          </Link>
        </div>

        {videos.length === 0 ? (
          <p className="mt-10 text-black/70">
            No videos yet. Add .mp4 files to public/videos.
          </p>
        ) : (
          <ul className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </ul>
        )}
      </section>

      {/* Call to action */}
      <section className="bg-[#2326e8]">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-5 py-14 sm:px-8 md:flex-row md:items-center">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Ready to post your first video?
            </h2>
            <p className="mt-2 text-lg text-white">
              Creating an account is free and takes a minute.
            </p>
          </div>
          <Link
            href="/signup"
            className="rounded-full bg-white px-8 py-4 text-lg font-semibold text-black transition hover:scale-105"
          >
            Start posting today!
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}