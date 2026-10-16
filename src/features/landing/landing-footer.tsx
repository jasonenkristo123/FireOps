import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="border-t border-slate-200">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 px-5 py-7 sm:px-8 lg:px-12">
        <p className="text-xs text-slate-500">
          © FireOps{" "}
          <span aria-hidden className="mx-2 text-slate-300">
            /
          </span>
          Kalimantan Barat
        </p>
        <nav
          aria-label="Tautan footer"
          className="flex flex-wrap items-center gap-6 text-xs"
        >
          <Link
            href="/register"
            className="text-slate-600 no-underline hover:text-slate-900"
          >
            Buat akun
          </Link>
          <a
            href="https://firms.modaps.eosdis.nasa.gov/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-slate-600 no-underline hover:text-slate-900"
          >
            NASA FIRMS
            <ArrowUpRight aria-hidden className="size-3.5" />
            <span className="sr-only"> (tab baru)</span>
          </a>
        </nav>
      </div>
    </footer>
  );
}
