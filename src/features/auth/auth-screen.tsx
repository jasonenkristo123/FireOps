import { Flame, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AuthScreen({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main
      id="main"
      className="mx-auto grid grid-cols-1 min-h-dvh w-full max-w-6xl items-center gap-8 px-6 py-10 md:grid-cols-2 md:gap-12 md:px-12"
    >
      <section className="min-w-0 space-y-6">
        <div className="flex items-center gap-3 font-semibold tracking-tight">
          <Flame aria-hidden="true" className="size-8 text-primary" />
          <span className="text-2xl">FireOps</span>
        </div>
        <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Kalimantan Barat · Akses petugas
        </p>
        <h1 className="max-w-lg text-3xl font-semibold leading-tight tracking-tight md:text-5xl">
          Pemantauan hotspot.
          <br />
          Verifikasi oleh petugas.
        </h1>
        <p className="max-w-md text-base leading-relaxed text-muted-foreground md:text-lg">
          Deteksi hotspot satelit adalah pengamatan, bukan konfirmasi kebakaran.
          Setiap keputusan verifikasi memerlukan petugas berwenang.
        </p>
        <p className="flex items-start gap-3 text-sm text-muted-foreground">
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          Akses operasional dibatasi berdasarkan peran dan wilayah tugas.
        </p>
      </section>
      <Card className="min-w-0 w-full border-border bg-card py-8 shadow-sm">
        <CardHeader className="px-6 md:px-8">
          <CardTitle className="text-2xl">{title}</CardTitle>
          <p className="mt-2 leading-relaxed text-muted-foreground">
            {description}
          </p>
        </CardHeader>
        <CardContent className="px-6 pt-4 md:px-8">{children}</CardContent>
      </Card>
    </main>
  );
}
