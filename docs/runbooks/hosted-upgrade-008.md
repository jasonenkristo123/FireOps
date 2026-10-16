# Perbaikan “data tidak dapat dimuat”: upgrade hosted 008

Diagnosis read-only pada proyek dari `.env.local`, 2026-10-16:

| Pemeriksaan | Hasil |
| --- | --- |
| Auth dan 17 tabel utama | Tersedia |
| Relasi dasar insiden/observasi | Dikenali; anonymous ditolak sesuai kebijakan |
| `verification_decisions.incident_version` (006) | Tersedia |
| `teams.row_version` dan kolom basis tim (008) | Tidak tersedia, `42703` |
| `operations_summary`, `district_features`, `eligible_assignees`, `ingestion_status` (008) | Tidak tersedia pada API schema cache, `PGRST202` |

Penyebab error adalah ketidakcocokan versi aplikasi dengan skema hosted. Ini
berbeda dari database kosong, akun tanpa wilayah, NASA belum disinkronkan, atau
kunci API yang salah. Pemeriksaan lama yang hanya mengecek keberadaan tabel
belum cukup untuk mendeteksi masalah ini.

## Langkah untuk pemilik proyek Supabase

1. Buka proyek Supabase yang URL-nya sama dengan
   `NEXT_PUBLIC_SUPABASE_URL` di `.env.local`. Pastikan target benar dan tersedia
   backup sesuai prosedur proyek sebelum menjalankan perubahan skema.
2. Buka **SQL Editor → New query**. Tinjau lalu salin seluruh isi
   [`supabase/setup/upgrade-008.sql`](../../supabase/setup/upgrade-008.sql) dan
   jalankan sebagai pemilik/database administrator.
3. Setelah berhasil, jalankan `pnpm db:check`, kemudian muat ulang aplikasi.
   Pemeriksaan fungsi/kolom 008 harus berubah menjadi `present`. Penolakan
   anonymous (`42501`) pada pemeriksaan read-only adalah kondisi yang diharapkan.

**Jangan menjalankan `initial-schema.sql`, reset database, atau menghapus tabel.**
File tersebut untuk instalasi baru, bukan upgrade proyek yang sudah berisi tabel.
Tidak perlu mengganti kunci di `.env.local` untuk memperbaiki versi skema ini.

`upgrade-008.sql` dibuat offline melalui `pnpm db:prepare-upgrade` dari migrasi
kanonis `20261016000800_operational_completion.sql`. Paket ini:

- memakai satu transaksi; kegagalan membatalkan transaksi, bukan meninggalkan
  separuh perubahan;
- menolak bila prasyarat workflow hingga 006 belum tersedia;
- menolak rerun atau kondisi 008 sudah/sebagian terpasang agar tidak menimpa
  skema yang perlu diperiksa;
- menambahkan kolom basis/revisi tim, fungsi, dan indeks; tidak menghapus atau
  mengosongkan tabel;
- menyimpan versi 008 dalam riwayat migrasi agar kompatibel dengan Supabase CLI;
- meminta PostgREST memuat ulang schema cache setelah commit;
- tidak membuat admin, memberi wilayah, mengimpor demo/live, memanggil NASA/AI,
  atau mengubah keputusan insiden.

Kunci publishable/service aplikasi digunakan untuk API, bukan untuk mengeksekusi
DDL di SQL Editor. Tidak ada kredensial administrator database dalam konfigurasi
yang diperiksa, sehingga langkah hosted ini belum dijalankan oleh agen.

Jika guard mengembalikan `FIREOPS_008_ALREADY_OR_PARTIALLY_PRESENT` atau
`FIREOPS_008_HISTORY_MISMATCH`, jangan menghapus guard atau mengulang installer.
Periksa objek dan riwayat migrasi pada proyek tujuan. Jika SQL Editor sudah
menyatakan upgrade berhasil tetapi API masih melaporkan fungsi hilang, periksa
target proyek dan schema cache; jangan langsung menjalankan upgrade dua kali.

## Perlakuan aplikasi sebelum upgrade

Kode kini mempertahankan data inti yang berhasil dibaca ketika statistik,
geometri, atau metrik tambahan belum tersedia. Nilai yang gagal dimuat tetap
ditandai tidak tersedia, tidak diganti dengan angka nol. Detail insiden tetap
menampilkan bukti/histori; pemilih penugasan pada skema lama membaca tim/anggota
melalui RLS dan roster terverifikasi. Jarak tetap tidak tersedia sampai 008.
RPC mutasi asli tetap memvalidasi kewenangan, keanggotaan dan ketersediaan saat
menyimpan. Pengaturan basis tim yang belum didukung tidak ditampilkan.

Jika data inti benar-benar gagal (jaringan, akses, atau skema dasar), aplikasi
tetap memberi error dan mencatat hanya nama tahap/kode diagnostik pada server;
data tidak direkayasa dan pesan SQL mentah tidak ditampilkan ke pengguna.

## Batas perbaikan ini

Upgrade ini menyelesaikan ketidakcocokan skema 008. Marker LIVE tetap memerlukan
batas resmi, izin wilayah, konfigurasi NASA lengkap dan sinkronisasi nyata.
Tanpa itu, data kosong adalah kondisi yang benar. Aturan prioritas/zona risiko
tetap mengikuti persetujuan instansi sebelumnya.

Validasi langkah ini: pemeriksaan API hosted read-only mereproduksi lima
kekurangan di atas; lint/TypeScript diperiksa setelah perubahan kode. Tidak ada
perubahan hosted, reset, import data, test suite, Playwright, NASA atau panggilan
AI yang dijalankan. SQL upgrade belum dieksekusi terhadap database hosted.
