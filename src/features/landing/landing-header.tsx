"use client";

import { ArrowUpRight, Flame, Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const navigation = [
  ["#workflow", "Alur kerja"],
  ["#districts", "Wilayah"],
] as const;

export function LandingHeader({
  isAuthenticated = false,
}: {
  isAuthenticated?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const destination = isAuthenticated ? "/dashboard" : "/login";
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      menuButton.current?.focus();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
        <Link
          href="/"
          aria-label="FireOps — beranda"
          className="inline-flex items-center gap-2 text-xl font-semibold tracking-tight text-slate-900 no-underline"
        >
          <Flame aria-hidden className="size-7 text-red-600" strokeWidth={2} />
          <span>
            Fire<span className="text-red-600">Ops</span>
          </span>
        </Link>
        <nav
          aria-label="Navigasi utama"
          className="hidden items-center gap-9 sm:flex"
        >
          {navigation.map(([href, name]) => (
            <a
              key={href}
              href={href}
              className="text-sm text-slate-600 no-underline transition-colors hover:text-slate-950"
            >
              {name}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href={destination}
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-900 no-underline transition-colors hover:border-slate-900 hover:bg-slate-50"
          >
            {isAuthenticated ? "Dashboard" : "Masuk"}
            <ArrowUpRight aria-hidden className="size-4" />
          </Link>
          <button
            ref={menuButton}
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="landing-mobile-navigation"
            aria-label={open ? "Tutup navigasi" : "Buka navigasi"}
          className="flex size-11 cursor-pointer items-center justify-center rounded-md hover:bg-slate-50 sm:hidden"
          >
            {open ? (
              <X aria-hidden className="size-5" />
            ) : (
              <Menu aria-hidden className="size-5" />
            )}
          </button>
        </div>
      </div>
      {open && (
        <nav
          id="landing-mobile-navigation"
          aria-label="Navigasi seluler"
          className="border-t border-slate-100 px-5 py-3 sm:hidden"
        >
          {navigation.map(([href, name]) => (
            <a
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="flex py-3 text-sm text-slate-700 no-underline"
            >
              {name}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}
