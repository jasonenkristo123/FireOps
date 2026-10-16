import { z } from "zod";
export const reportSummarySchema = z.object({
  summary: z.string().min(1).max(3000),
  importantObservations: z.array(z.string().min(1).max(800)).max(10),
  missingEvidence: z.array(z.string().min(1).max(500)).max(10),
  sourceReportIds: z.array(z.uuid()).min(1).max(20),
  generatedAt: z.iso.datetime(),
  modelIdentifier: z.string().min(1).max(200),
  disclaimer: z.literal(
    "Ringkasan berbantuan AI — periksa terhadap laporan asli. Bukan keputusan verifikasi atau perintah penugasan.",
  ),
});
export type ReportSummary = z.infer<typeof reportSummarySchema>;
export type SummaryState = { error?: string; summary?: ReportSummary };
