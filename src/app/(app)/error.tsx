"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function ErrorPage({
  reset,
  error,
}: {
  reset: () => void;
  error: Error & { digest?: string };
}) {
  return (
    <section className="panel">
      <h1 className="text-xl font-semibold">Data belum dapat dimuat</h1>
      <p role="alert" className="my-4">
        Permintaan data belum berhasil. Coba muat ulang halaman. Jika tetap
        gagal, administrator dapat memeriksa koneksi dan kecocokan versi
        database melalui pemeriksaan konfigurasi. Data kosong atau akun tanpa
        wilayah seharusnya tidak menimbulkan halaman error ini.
      </p>
      {error.digest && (
        <p className="mb-4 text-sm text-muted-foreground">
          Referensi gangguan: {error.digest}
        </p>
      )}
      <Button onClick={reset}>Coba lagi</Button>
      <Link href="/dashboard" className="ml-4 text-sm">
        Kembali ke peta
      </Link>
    </section>
  );
}
