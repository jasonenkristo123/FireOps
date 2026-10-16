import type { DataWarning } from "./data-errors";

const names: Record<DataWarning["feature"], string> = {
  summary: "ringkasan statistik",
  boundaries: "batas wilayah pada peta",
  health: "kesehatan sinkronisasi",
  assignment: "pilihan petugas dan jarak tim",
  team_settings: "pengaturan tambahan tim",
};
export function DataWarnings({ warnings }: { warnings: DataWarning[] }) {
  if (!warnings.length) return null;
  const needsUpgrade = warnings.some((w) => w.reason === "schema");
  return (
    <div
      className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"
      role="note"
    >
      <p className="font-semibold">
        {needsUpgrade
          ? "Pembaruan database belum lengkap"
          : "Sebagian informasi belum tersedia"}
      </p>
      <p>
        Bagian yang terdampak:{" "}
        {[...new Set(warnings.map((w) => names[w.feature]))].join(", ")}. Data
        utama yang berhasil dimuat tetap ditampilkan.
      </p>
      <p>
        {needsUpgrade
          ? "Administrator perlu menerapkan pembaruan database 008 pada proyek Supabase yang digunakan aplikasi. Tidak perlu mereset database atau mengubah kunci akses."
          : "Coba muat ulang. Nilai yang belum tersedia tidak dianggap nol; periksa waktu data sebelum mengambil keputusan."}
      </p>
    </div>
  );
}
