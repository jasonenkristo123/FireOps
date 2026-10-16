export type DatabaseIssue = { code?: string };
export function isSchemaMismatch(error: DatabaseIssue | null | undefined) {
  return Boolean(
    error?.code &&
      [
        "PGRST200",
        "PGRST202",
        "PGRST204",
        "PGRST205",
        "42703",
        "42P01",
        "42883",
      ].includes(error.code),
  );
}
export type DataWarning = {
  feature: "summary" | "boundaries" | "health" | "assignment" | "team_settings";
  reason: "schema" | "unavailable" | "invalid";
};
export function dataWarning(
  feature: DataWarning["feature"],
  error: DatabaseIssue | null,
): DataWarning {
  return {
    feature,
    reason: isSchemaMismatch(error) ? "schema" : "unavailable",
  };
}
export function logDataFailure(stage: string, error: DatabaseIssue | null) {
  // Diagnostic codes only; no SQL messages, rows, identities, URLs or credentials.
  console.error(
    JSON.stringify({
      event: "fireops_data_unavailable",
      stage,
      code: error?.code ?? "UNKNOWN",
    }),
  );
}
