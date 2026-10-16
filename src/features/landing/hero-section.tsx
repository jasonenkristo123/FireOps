import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { IndonesiaHeroMap } from "./indonesia-hero-map";

export function HeroSection({
  isAuthenticated = false,
}: {
  isAuthenticated?: boolean;
}) {
  return (
    <section id="hero" aria-labelledby="landing-title" className="scroll-mt-24">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-14 sm:px-8 sm:pt-20 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14 lg:px-12 lg:pb-24 lg:pt-24">
        <div className="max-w-xl">
          <p className="mb-7 flex items-center gap-3 text-xs font-medium tracking-[0.12em] text-slate-500">
            <span aria-hidden className="h-px w-7 bg-red-600" />
            KALIMANTAN BARAT, INDONESIA
          </p>
          <h1
            id="landing-title"
            className="text-[clamp(2.5rem,4.5vw,4rem)] font-semibold leading-[1.08] tracking-[-0.055em] text-slate-900"
          >
            Pantau titik panas.
            <br />
            Kelola respons.
          </h1>
          <p className="mt-6 max-w-sm text-base leading-7 text-slate-500 sm:text-lg sm:leading-8">
            Observasi satelit, verifikasi lapangan, dan tindak lanjut tim dalam
            satu ruang kerja.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-5">
            <Link
              href={isAuthenticated ? "/dashboard" : "/login"}
              className="inline-flex min-h-12 items-center gap-5 rounded-md bg-red-600 px-5 py-3 text-sm font-medium text-white no-underline transition-colors hover:bg-red-700"
            >
              {isAuthenticated ? "Buka dashboard" : "Mulai pemantauan"}
              <ArrowRight aria-hidden className="size-4" />
            </Link>
            <a
              href="#workflow"
              className="inline-flex min-h-12 items-center text-sm text-slate-600 no-underline underline-offset-4 hover:underline"
            >
              Cara kerja
            </a>
          </div>
          <p className="mt-10 text-xs leading-5 text-slate-500">
            Sumber observasi: NASA FIRMS.
            <br />
            Keputusan tetap di tangan petugas.
          </p>
        </div>
        <div id="map" className="min-w-0 scroll-mt-24">
          <IndonesiaHeroMap />
        </div>
      </div>
    </section>
  );
}
