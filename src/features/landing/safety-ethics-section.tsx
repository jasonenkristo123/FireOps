import { Info } from "lucide-react";

export function SafetyEthicsSection() {
  return (
    <aside
      aria-label="Tentang data pengamatan"
      className="mx-auto flex max-w-7xl items-start gap-3 px-5 py-8 text-sm leading-6 text-slate-500 sm:px-8 lg:px-12"
    >
      <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-slate-400" />
      <p>
        Titik panas adalah observasi satelit. Konfirmasi kebakaran tetap
        memerlukan pemeriksaan petugas.
      </p>
    </aside>
  );
}
