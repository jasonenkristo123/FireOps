"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="mx-auto max-w-xl space-y-5 p-8">
      <h1 className="text-2xl font-semibold">Halaman belum dapat dimuat</h1>
      <p>Coba lagi atau hubungi pengelola jika kendala berlanjut.</p>
      <Button onClick={reset} className="h-12">
        Coba lagi
      </Button>
    </main>
  );
}
