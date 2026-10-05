// components/Footer.tsx

import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-black text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-12 sm:px-8 md:flex-row md:items-start md:justify-between">
        <div className="max-w-xs">
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
            <span className="text-2xl font-extrabold tracking-tight text-white">
              YouTubby
            </span>
          </Link>
          <p className="mt-4 text-sm leading-relaxed">
            YouTubby is an open-source video sharing platform, share your video
            with the world.
          </p>
        </div>

        <nav
          aria-label="Footer"
          className="flex flex-wrap gap-x-10 gap-y-3 text-sm"
        >
          <Link href="/signin" className="hover:text-white">
            Sign In
          </Link>
          <Link href="/signup" className="hover:text-white">
            Sign Up
          </Link>
        </nav>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-sm">
        &copy; {new Date().getFullYear()} YouTubby
      </div>
    </footer>
  );
}
