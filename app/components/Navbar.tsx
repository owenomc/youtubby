import Image from "next/image";
import Link from "next/link";
import SearchBar from "@/app/components/SearchBar";

export default function Navbar() {
  return (
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

      <nav aria-label="Account" className="hidden items-center gap-2 md:flex">
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
  );
}