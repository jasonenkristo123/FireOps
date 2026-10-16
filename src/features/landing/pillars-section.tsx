const steps = [
  {
    number: "01",
    title: "Pantau",
    description: "Lihat observasi dan waktu deteksi pada peta.",
  },
  {
    number: "02",
    title: "Verifikasi",
    description: "Tinjau bukti, tentukan status dan prioritas.",
  },
  {
    number: "03",
    title: "Koordinasikan",
    description: "Tunjuk penanggung jawab dan ikuti progres.",
  },
];

export function PillarsSection() {
  return (
    <section
      id="workflow"
      aria-labelledby="workflow-title"
      className="scroll-mt-24 border-y border-slate-200"
    >
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:px-12 lg:py-16">
        <div className="mb-9 flex flex-wrap items-baseline justify-between gap-3">
          <h2
            id="workflow-title"
            className="text-2xl font-medium tracking-tight text-slate-900"
          >
            Dari pengamatan ke tindak lanjut.
          </h2>
          <span className="text-xs text-slate-500">Alur kerja FireOps</span>
        </div>
        <ol className="grid gap-8 md:grid-cols-3 md:gap-12">
          {steps.map((step) => (
            <li key={step.number} className="flex items-start gap-4">
              <span className="pt-1 font-mono text-xs text-red-600">
                {step.number}
              </span>
              <div>
                <h3 className="text-lg font-medium text-slate-900">
                  {step.title}
                </h3>
                <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">
                  {step.description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
