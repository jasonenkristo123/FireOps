// Geographic scope only. No claim of live coverage, staffed posts or risk levels.
const districts = [
  "Sambas",
  "Bengkayang",
  "Landak",
  "Mempawah",
  "Sanggau",
  "Ketapang",
  "Sintang",
  "Kapuas Hulu",
  "Sekadau",
  "Melawi",
  "Kayong Utara",
  "Kubu Raya",
  "Kota Pontianak",
  "Kota Singkawang",
];

export function DistrictsSection() {
  return (
    <section
      id="districts"
      aria-labelledby="districts-title"
      className="scroll-mt-24 bg-slate-50/70"
    >
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 lg:px-12 lg:py-20">
        <div>
          <p className="mb-3 text-xs text-slate-500">Fokus wilayah</p>
          <h2
            id="districts-title"
            className="text-3xl font-medium tracking-tight text-slate-900 sm:text-4xl"
          >
            Kalimantan Barat.
          </h2>
          <p className="mt-4 text-sm text-slate-500">12 kabupaten. 2 kota.</p>
        </div>
        <ul
          aria-label="Kabupaten dan kota di Kalimantan Barat"
          className="grid content-start grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-3"
        >
          {districts.map((district) => (
            <li key={district} className="text-sm leading-6 text-slate-600">
              {district}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
