"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

type Suggestion = { id: string; title: string };

function SearchIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export default function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [active, setActive] = useState(-1);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch suggestions (debounced) whenever the query changes
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/suggest?q=${encodeURIComponent(query)}`,
          { signal: controller.signal }
        );
        if (!res.ok) return;
        setItems(await res.json());
        setActive(-1);
      } catch {
        // ignore aborted or failed requests
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Close when clicking outside
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  function go(item: Suggestion) {
    setOpen(false);
    router.push(`/watch/${encodeURIComponent(item.id)}`);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open || items.length === 0) {
      if (e.key === "ArrowDown") setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      go(items[active]);
    }
  }

  const showDropdown = open && items.length > 0;

  return (
    <form
      action="/search"
      role="search"
      className="hidden max-w-md flex-1 md:block"
      onSubmit={() => setOpen(false)}
    >
      <label htmlFor="nav-search" className="sr-only">
        Search videos
      </label>
      <div className="relative" ref={wrapperRef}>
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-black" />
        <input
          ref={inputRef}
          id="nav-search"
          name="q"
          type="search"
          autoComplete="off"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls="search-suggestions"
          aria-autocomplete="list"
          aria-activedescendant={
            active >= 0 ? `suggestion-${active}` : undefined
          }
          placeholder="Search videos and channels"
          className="w-full rounded-full border-2 border-slate-200 bg-slate-200 py-2.5 pl-12 pr-12 text-black placeholder:text-slate-700 focus:outline-none [&::-webkit-search-cancel-button]:appearance-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setOpen(true);
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-black hover:bg-black/10"
          >
            <X className="h-5 w-5 hover:cursor-pointer" strokeWidth={2.5} />
          </button>
        )}

        {showDropdown && (
          <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white text-black shadow-lg">
            <p className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-black/50">
              {query.trim() ? "Suggestions" : "Recommended"}
            </p>
            <ul id="search-suggestions" role="listbox" className="pb-2">
              {items.map((item, i) => (
                <li
                  key={item.id}
                  id={`suggestion-${i}`}
                  role="option"
                  aria-selected={i === active}
                >
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(item)}
                    className={`flex w-full items-center gap-3 px-4 py-2 text-left capitalize ${
                      i === active ? "bg-slate-100" : ""
                    }`}
                  >
                    <SearchIcon className="h-4 w-4 flex-none text-black/50" />
                    <span className="line-clamp-1">{item.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </form>
  );
}