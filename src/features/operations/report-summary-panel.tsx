"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { date } from "./domain";
import { summarizeReports } from "./report-summary-actions";
export function ReportSummaryPanel({
  incidentId,
  available,
  reason,
}: {
  incidentId: string;
  available: boolean;
  reason: string;
}) {
  const [state, action, pending] = useActionState(summarizeReports, {});
  return (
    <div className="space-y-3 rounded-lg border bg-background p-4">
      <h3 className="font-semibold">Ringkasan laporan berbantuan AI</h3>
      {available ? (
        <form action={action} className="space-y-3">
          <input type="hidden" name="incident_id" value={incidentId} />
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="consent"
              required
              className="mt-1 size-5 shrink-0"
            />
            Saya memiliki kewenangan mengirim teks laporan ke penyedia AI yang
            disetujui instansi. Foto, identitas akun, dan kunci akses tidak
            dikirim.
          </label>
          <Button type="submit" disabled={pending} className="min-h-11">
            {pending ? "Meringkas laporan…" : "Buat ringkasan AI"}
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">{reason}</p>
      )}
      {state.error && (
        <p role="alert" className="notice notice-error">
          {state.error}
        </p>
      )}
      {state.summary && (
        <div className="space-y-3 text-sm">
          <p className="notice">{state.summary.disclaimer}</p>
          <p className="whitespace-pre-wrap">{state.summary.summary}</p>
          <h4 className="font-semibold">Informasi penting dari sumber</h4>
          <ul className="list-disc space-y-1 pl-5">
            {state.summary.importantObservations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <h4 className="font-semibold">Bukti yang masih kurang</h4>
          <ul className="list-disc space-y-1 pl-5">
            {state.summary.missingEvidence.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Model {state.summary.modelIdentifier} · Dibuat{" "}
            {date(state.summary.generatedAt)} · Sumber:{" "}
            {state.summary.sourceReportIds.length} laporan
          </p>
          <ul className="space-y-1 text-xs">
            {state.summary.sourceReportIds.map((id) => (
              <li key={id}>
                <a href={`#report-${id}`}>Lihat laporan sumber {id}</a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
