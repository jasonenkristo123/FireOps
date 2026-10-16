"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="panel">
      <h1 className="text-xl font-semibold">Data belum dapat dimuat</h1>
      <p role="alert" className="my-4">
        Periksa koneksi, izin wilayah, dan penerapan migrasi 004–005 pada
        Supabase yang dipilih.
      </p>
      <Button onClick={reset}>Coba lagi</Button>
    </section>
  );
}
