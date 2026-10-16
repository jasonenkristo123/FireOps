# Menampilkan observasi NASA pada peta LIVE

## Melihat koordinat NASA sekarang

Masuk sebagai admin, buka `http://localhost:3000/admin/observations`, pilih
**Kotak kandidat Kalimantan Barat dari BIG**, lalu klik **Tampilkan titik NASA**.
Tautan **Pratinjau NASA** juga tersedia pada navigasi admin dan dashboard kosong.
Tidak perlu mengisi BBOX server untuk pilihan kandidat ini; pengambilan dilakukan
hanya setelah memilih dan mengirim form, melalui server dengan cache lima menit.

Halaman menampilkan marker, koordinat, waktu observasi, confidence sesuai sensor,
FRP jika tersedia, dan jarak opsional dari lokasi Anda. Semua observasi mentah
berprioritas **Belum dinilai** dan belum menjadi insiden. Kotak pengambilan juga
mencakup daerah sekitar Kalbar; belum ada klaim kabupaten untuk titik ini.

Diagnostik NASA nyata pada 16 Oktober 2026 berhasil HTTP 200 dan menghasilkan
1.238 observasi valid dalam kotak kandidat, dengan waktu observasi
15 Oktober 2026 05:40–18:21 UTC. Jumlah dapat berbeda saat mengambil ulang.
Tidak ada penulisan hosted atau keberhasilan sinkronisasi database yang dibuat
dari diagnostik ini. Pada inspeksi terbaru, token scheduler sudah terisi oleh
pemilik, BBOX masih kosong, dan database LIVE masih memiliki 0 wilayah,
0 observasi dan 0 ingest runs. Diagnosis awal di bawah adalah catatan sebelumnya.

Untuk dashboard operasional, lanjutkan pengaturan katalog/izin/sinkronisasi di
bawah. Marker observasi yang telah terkait insiden sekarang memakai prioritas
manual insiden tersebut; jika beberapa insiden terkait, prioritas manual tertinggi
ditampilkan dengan penjelasan. Confidence/FRP tidak dipakai sebagai prioritas
otomatis.

Validasi implementasi pratinjau: `pnpm lint`, `pnpm typecheck`, `pnpm build`
(26 halaman) dan `git diff --check` berhasil. Pemindaian 24 berkas JavaScript
browser hasil build tidak menemukan nilai private yang dikonfigurasi. Tampilan
browser, perubahan prioritas interaktif dan pengujian regresi belum dijalankan;
test suite dan Playwright tetap ditunda sesuai instruksi pemilik.

## Perintah pengaturan yang sudah disiapkan

Nilai yang bisa disalin ke `.env.local` untuk cakupan kandidat tersebut:

```dotenv
NASA_FIRMS_BBOX=108.59844426100005,-3.0679185239999356,114.20552258300006,2.0814594440000747
```

Urutannya barat, selatan, timur, utara. Ini input area untuk NASA, bukan nilai
lokasi pengguna atau koordinat satu kebakaran. Simpan file lalu mulai ulang
server. Tidak perlu mengubah token yang sudah terisi.

Untuk memilih kandidat bbox sebagai cakupan pengembangan dan mengisi nilai env
yang masih kosong, tanpa menimpa token/kunci yang sudah terisi:

```sh
pnpm live:configure --apply --accept-candidate-bbox
```

Perintah membuat token kriptografis jika belum ada dan tidak mencetaknya.
Tanpa `--apply`, perintah hanya memeriksa. Pemilihan cakupan pengembangan tidak
merupakan persetujuan wilayah/rilis operasi instansi. Mulai ulang `pnpm dev`
setelah mengubah env.

Paket SQL katalog juga sudah tersedia:

```sh
pnpm boundaries:package
```

Hasilnya `data/reference/kalbar-big/review.sql` dan `import.sql`. Pemeriksaan
`review.sql` sudah dijalankan di PostGIS lokal memakai tabel sementara dan
`ROLLBACK`: 14 geometri valid, tidak kosong, dan tidak ada overlap interior antar
kabupaten/kota; batas bersama diperbolehkan. Tidak ada geometri yang diperbaiki
atau disederhanakan. Hasil ini belum menyatakan izin penggunaan atau persetujuan
operasional sumber.

`import.sql` tetap menolak impor sampai bagian atasnya diisi secara nyata:

- `approved_by`: UUID akun administrator aktif yang emailnya sudah terverifikasi.
  Anda dapat menyalin UID sendiri dari Supabase Authentication → Users;
  administrator FireOps disimpan di `public.profiles`, bukan metadata Auth.
- `usage_terms`: rujukan izin/lisensi penggunaan yang benar. Kolom lisensi pada
  layanan dan item portal BIG saat diperiksa kosong; jangan mengarang CC-BY atau
  menyamakan akses publik dengan lisensi yang telah diberikan.
- `catalogue_approved`: `true` hanya setelah pemilik operasional menyetujui
  sumber/edisi/penggunaan dan hasil pemeriksaan geometri.
- `grant_approver_districts`: opsional `true` jika operator secara eksplisit juga
  menyetujui pemberian akses 14 wilayah pada akun penyetuju untuk setup awal.
  Bawaan `false`, tidak membuat peran admin baru, dan tidak mencabut izin lain.
  Pilihan ini dicatat bersama impor dalam audit transaksional.

Tinjau target proyek dan jalankan file dengan akun database administrator di
Supabase SQL Editor atau `psql` setelah persetujuan tersebut lengkap. Ini adalah
impor data terpisah, bukan migrasi/reset. Jangan menjalankan ulang installer.
Paket menolak kode yang sudah ada, geometri/overlap bermasalah, identitas tidak
sah, atau persetujuan yang belum terisi. Tidak ada perubahan RLS atau keputusan
insiden. API secret ingestion tidak diberi hak impor katalog.

Halaman admin aplikasi: `http://localhost:3000/admin/users`. Administrator yang
belum memiliki izin wilayah tidak bisa melihat katalog melalui RLS, sehingga
setup area awal perlu dilakukan secara eksplisit oleh operator; setelah itu
pengaturan akun lain memakai halaman tersebut. Tidak ada bypass geografis
otomatis berdasarkan peran admin.

## Diagnosis setelah upgrade 008 — 16 Oktober 2026

Pemeriksaan `pnpm db:check` berhasil: 17 tabel dan seluruh kolom/RPC yang
dibutuhkan aplikasi tersedia. Pemeriksaan dengan identitas ingestion secara
read-only menemukan 0 wilayah LIVE/DEMO, 0 observasi LIVE/DEMO, dan 0 job
ingestion LIVE/DEMO. Identitas ingestion memang tidak berwenang membaca insiden
atau izin akun; tidak ada kesimpulan jumlah akun/insiden dari pemeriksaan itu.
`NASA_FIRMS_BBOX` dan `NASA_FIRMS_SYNC_TOKEN` masih kosong. Kunci NASA belum
dicoba ke upstream; ini bukan bukti NASA gagal atau tidak ada titik panas.

Migrasi membuat struktur database, bukan mengisi katalog, memberi izin wilayah,
atau menjadwalkan pengambilan data NASA. Mengisi MAP_KEY saja belum menjalankan
sinkronisasi.

## Worker peta

MapLibre 6 memuat modul worker terpisah relatif terhadap `import.meta.url`.
URL tersebut berubah ketika kode utama dibundel menjadi chunk Next.js. FireOps
sekarang secara eksplisit menggunakan
`/maplibre/<versi-terpasang>/maplibre-gl-worker.mjs` dari origin aplikasi.
`pnpm dev` dan `pnpm build` menjalankan penyalinan aset dari paket terpasang
secara otomatis. Tidak ada ketergantungan CDN worker atau pencampuran versi.

Untuk server yang sudah berjalan, jalankan `pnpm map:prepare`, lalu muat ulang
browser. Jika mengganti konfigurasi server atau versi dependensi, mulai ulang
dengan `pnpm dev`. Deploy Docker tetap menyalin seluruh `public/` hasil build.
Worker merupakan aset publik tanpa cookie Auth; hanya direktori aset ini yang
dikecualikan dari session proxy. Kegagalan worker langsung memakai peta 2D.

Verifikasi HTTP lokal pada revisi ini: worker memberi HTTP 200, tipe
`application/javascript`, dan SHA-256 isinya sama dengan worker terpasang.
Ini memverifikasi penyajian aset, bukan penerimaan visual WebGL di semua browser.

## NASA dan batas administrasi berbeda

[NASA Area API](https://firms.modaps.eosdis.nasa.gov/api/area/) memberikan
observasi dalam kotak koordinat `west,south,east,north`. Koordinat observasi
bisa digambar langsung tanpa poligon kabupaten. API tersebut tidak memasang
katalog administrasi FireOps atau hak akses pengguna.

Dalam aplikasi ini, observasi dicocokkan ke satu wilayah yang disetujui agar
filter kabupaten, penugasan dan RLS konsisten. Observasi tanpa kecocokan wilayah
tunggal disimpan oleh ingestion, tetapi tidak disajikan sebagai data operasional
kepada akun biasa. Mengubah pemeriksaan wilayah menjadi akses service-role pada
dashboard akan membocorkan data dan bukan solusi untuk peta kosong.

## Sumber batas sudah ditemukan dan disiapkan

Layanan resmi [BIG — Wilayah Administrasi Kabupaten/Kota](https://geoservices.big.go.id/rbi/rest/services/Hosted/Wilayah_Administrasi_Kabupaten__Kota/FeatureServer/0)
menyediakan GeoJSON dan metadata edisi September 2023. Query kode provinsi `61`
dengan kode kabupaten `61.xx` menghasilkan **14 kabupaten/kota**. Query provinsi
saja juga menghasilkan satu fitur provinsi tanpa kode kabupaten, sehingga fitur
tersebut secara eksplisit tidak digunakan sebagai kabupaten.

```sh
pnpm boundaries:prepare
```

Perintah ini sudah dijalankan dan menghasilkan berkas lokal:

- `data/reference/kalbar-big/districts.geojson`: geometri asli EPSG:4326, tanpa
  penyederhanaan, perbaikan geometri otomatis, atau data simulasi.
- `data/reference/kalbar-big/source-metadata.json`: metadata asli layanan.
- `data/reference/kalbar-big/review.json`: sumber, waktu unduh, SHA-256, daftar
  14 wilayah, kandidat bbox dan status review yang masih terbuka.

Berkas unduhan tidak dipublikasikan oleh aplikasi dan diabaikan git karena
ketentuan redistribusi belum dipastikan. Metadata BIG belum mencantumkan lisensi
eksplisit pada kolom copyright dan menyebut keterbatasan topologi. Sumber
resmi ini adalah kandidat yang dapat ditinjau; unduhan tidak sama dengan
persetujuan operasional. Validasi PostGIS, overlap, edisi yang dipilih,
ketentuan penggunaan dan persetujuan pemilik data operasional masih perlu
dicatat sebelum impor LIVE. Tidak ada wilayah atau izin baru yang dibuat.

Extent hasil perhitungan seluruh koordinat kandidat:

```text
108.59844426100005,-3.0679185239999356,114.20552258300006,2.0814594440000747
```

Ini **kandidat cakupan pengambilan**, bukan batas resmi berbentuk persegi atau
persetujuan bbox. Kotak tersebut juga mencakup area di luar poligon Kalbar;
pencocokan poligon tetap diperlukan. Nilai ini tidak ditulis ke `.env.local`.

## Urutan pengaktifan LIVE

1. Tinjau kandidat BIG di atas, catat ketentuan penggunaan, edisi dan persetujuan,
   lalu impor katalog melalui SQL yang ditinjau dengan validasi geometri.
   Jangan membuat kotak sintetis sebagai wilayah LIVE.
2. Administrator yang sudah berwenang memberikan kabupaten/kota pada akun lewat
   `/admin/users`. Akun baru tidak otomatis menjadi admin atau memiliki seluruh
   Kalbar; koordinat perangkat tidak menentukan izin wilayah.
3. Di `.env.local`, isi `NASA_FIRMS_BBOX` yang dipilih dan disetujui serta
   `NASA_FIRMS_SYNC_TOKEN` acak minimal 32 karakter. Simpan sendiri token yang
   dihasilkan, misalnya dengan `openssl rand -hex 32`; jangan kirim ke percakapan.
   `NASA_FIRMS_MAP_KEY`, `NASA_FIRMS_SOURCE`, Supabase URL dan secret juga harus
   valid. Sumber tidak diganti diam-diam.
4. Mulai ulang app agar konfigurasi terbaca. Jalankan satu sinkronisasi terkontrol
   setelah langkah di atas selesai dan permintaan NASA diizinkan. Contoh lokal
   Node 22 yang membaca env tanpa mencetak nilainya:

   ```sh
   FIREOPS_APP_URL=http://localhost:3000 node --env-file=.env.local scripts/sync-firms.mjs --check
   FIREOPS_APP_URL=http://localhost:3000 node --env-file=.env.local scripts/sync-firms.mjs
   ```

   `--check` hanya memeriksa bentuk konfigurasi scheduler, tidak menguji MAP_KEY.
   Perintah kedua mengirim permintaan nyata dan menulis hasil ingestion; belum
   dijalankan pada langkah perbaikan peta ini.
5. Periksa `/admin/settings?mode=live`: status job, waktu sukses sebenarnya,
   jumlah baris dan observasi tanpa wilayah tunggal. Pilih LIVE dan filter waktu
   yang mencakup hasil pengamatan di dashboard. Nol baris dari job sukses tetap
   mungkin; jangan isi dengan titik palsu.
6. Setelah satu job tervalidasi, pasang jadwal sesuai kebijakan operator. Tombol
   refresh browser bukan pengambilan NASA baru. Token scheduler tidak boleh
   dikirim ke kode browser.

## Jarak dari pengguna, termasuk dari Jawa

Panel **Jarak dari posisi Anda** berada di bawah peta, pada dashboard maupun
detail insiden. Pilih **Gunakan lokasi saya** atau isi koordinat manual.
Browser meminta izin hanya setelah tombol ditekan; HTTPS atau localhost
diperlukan. Jika lokasi ditolak/tidak tersedia, input manual tetap dapat dipakai.

Jarak dihitung di browser dengan rumus lingkaran besar, tersedia di popup kedua
renderer peta dan tabel seluruh titik yang dimuat. Ini perkiraan jarak lurus,
bukan rute perjalanan atau pengganti jarak basis tim pada penugasan. Lokasi
tidak disimpan ke database FireOps atau dimasukkan URL. Peta otomatis menyesuaikan
tampilan untuk menampilkan lokasi acuan dan Kalbar/tujuan bersama; filter data
dan izin wilayah tetap sama. Tidak ada lokasi contoh yang dianggap sebagai
lokasi pengguna.

Setelah memilih lokasi, marker biru berlabel **Posisi Anda** (atau **Acuan
manual**) muncul pada peta. Klik marker observasi/insiden untuk membuat garis
biru ke tujuan serta menampilkan jarak dalam km pada popup dan panel di bawah
peta. Memilih titik lain memperbarui garis; **Hapus pilihan / garis** menghapus
tujuan, sedangkan **Hapus lokasi** menghapus marker asal dan garis. Daftar jarak
juga menyediakan tombol pemilihan tujuan untuk penggunaan keyboard. Pilihan
tujuan divalidasi terhadap ID dan koordinat data yang sedang dimuat agar filter
atau snapshot baru tidak menghubungkan lokasi ke titik lama.

Penanda, garis, perhitungan dan penyesuaian tampilan tersedia pada MapLibre dan
renderer 2D. Mengaktifkan/mengganti lokasi tidak perlu membuat ulang instance
MapLibre. Gerakan kamera menghormati `prefers-reduced-motion`. Tidak ada rute
jalan, estimasi waktu tempuh, pemeringkatan prioritas atau perubahan penugasan
yang dihasilkan dari garis ini.

Validasi perubahan penanda/garis: `pnpm lint`, `pnpm typecheck`,
`pnpm build` dan `git diff --check` berhasil. Build awal menemukan pembacaan
sesi beranda di luar Suspense; pembungkus Suspense ditambahkan dengan
mempertahankan konten beranda, dan build akhir berhasil. Tidak menjalankan
test suite, Playwright atau pemeriksaan visual browser. Interaksi lokasi/garis
tetap menunggu penerimaan browser yang ditunda pemilik.

## Validasi revisi ini

- `pnpm db:check`: berhasil; pemeriksaan hosted read-only.
- `pnpm map:prepare`: berhasil menyiapkan worker sesuai versi terpasang.
- `pnpm boundaries:prepare`: berhasil mengunduh dan memvalidasi struktur 14
  geometri sumber; belum merupakan validasi topologi atau persetujuan LIVE.
- `pnpm lint`, `pnpm typecheck` dan `pnpm build`: berhasil; build produksi
  menyelesaikan kompilasi, TypeScript dan pembuatan seluruh 25 halaman statis.
- HTTP worker lokal: 200, MIME JavaScript, identik dengan paket terpasang.
- Tidak menjalankan test suite atau Playwright sesuai instruksi pemilik.
- Tidak mengubah `.env.local`, data hosted, RLS, peran, izin, prioritas atau zona
  risiko. Tidak memanggil API NASA berkredensial pada langkah ini.
