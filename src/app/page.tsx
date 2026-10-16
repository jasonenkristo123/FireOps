import type { Metadata } from "next";
import { Suspense } from "react";
import { getIdentity } from "@/features/auth/session";
import { DistrictsSection } from "@/features/landing/districts-section";
import { HeroSection } from "@/features/landing/hero-section";
import { LandingFooter } from "@/features/landing/landing-footer";
import { LandingHeader } from "@/features/landing/landing-header";
import { PillarsSection } from "@/features/landing/pillars-section";
import { SafetyEthicsSection } from "@/features/landing/safety-ethics-section";

export const metadata: Metadata = {
  title: "Pemantauan titik panas Kalimantan Barat",
  description:
    "Pantau observasi satelit, verifikasi insiden, dan koordinasikan tindak lanjut tim di Kalimantan Barat bersama FireOps.",
};

async function LandingContent() {
  const identity = await getIdentity();
  const isAuthenticated = Boolean(identity?.userId);

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900 selection:bg-red-100 selection:text-red-950">
      <LandingHeader isAuthenticated={isAuthenticated} />
      <main id="main" className="flex-1">
        <HeroSection isAuthenticated={isAuthenticated} />
        <PillarsSection />
        <DistrictsSection />
        <SafetyEthicsSection />
      </main>
      <LandingFooter />
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <main id="main" className="min-h-screen bg-white p-8 text-slate-900">
          Memuat FireOps…
        </main>
      }
    >
      <LandingContent />
    </Suspense>
  );
}
