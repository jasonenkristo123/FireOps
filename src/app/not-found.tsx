import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="mx-auto max-w-xl space-y-5 p-8">
      <h1 className="text-2xl font-bold">Halaman tidak ditemukan</h1>
      <p>Periksa alamat atau kembali ke dashboard.</p>
      <Link href="/dashboard">Buka dashboard</Link>
    </main>
  );
}
