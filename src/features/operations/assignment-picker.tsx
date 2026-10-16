"use client";
import { useState } from "react";
import type { Database } from "@/types/database.types";
import { date, label } from "./domain";

// PostgreSQL function result metadata does not encode nullable OUT columns.
export type AssignmentCandidate = Omit<
  Database["public"]["Functions"]["eligible_assignees"]["Returns"][number],
  "distance_to_team_km" | "base_source" | "base_recorded_at"
> & {
  distance_to_team_km: number | null;
  base_source: string | null;
  base_recorded_at: string | null;
};
export function AssignmentPicker({
  candidates,
}: {
  candidates: AssignmentCandidate[];
}) {
  const [teamId, setTeamId] = useState("");
  const teams = [...new Map(candidates.map((c) => [c.team_id, c])).values()];
  const selected = teams.find((t) => t.team_id === teamId);
  return (
    <>
      <label>
        Tim berwenang di wilayah insiden
        <select
          name="team_id"
          required
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
        >
          <option value="" disabled>
            Pilih tim
          </option>
          {teams.map((t) => (
            <option key={t.team_id} value={t.team_id}>
              {t.team_name} · {t.authority_type}
            </option>
          ))}
        </select>
      </label>
      <label>
        Petugas (harus tersedia dan anggota tim terpilih)
        <select
          key={teamId}
          name="owner_id"
          required
          defaultValue=""
          disabled={!teamId}
        >
          <option value="" disabled>
            Pilih petugas
          </option>
          {candidates
            .filter((c) => c.team_id === teamId)
            .map((c) => (
              <option
                key={c.owner_id}
                value={c.owner_id}
                disabled={c.availability !== "available"}
              >
                {c.display_name || c.owner_id} · {label(c.availability)}
              </option>
            ))}
        </select>
      </label>
      {selected && (
        <div className="notice text-sm">
          <p>
            {selected.distance_to_team_km == null
              ? "Jarak basis tim belum tersedia."
              : `Perkiraan jarak lurus dari basis tim: ${selected.distance_to_team_km.toFixed(1)} km.`}
          </p>
          {selected.base_source && (
            <p>
              Sumber lokasi basis: {selected.base_source} · Dicatat{" "}
              {date(selected.base_recorded_at)}
            </p>
          )}
          <p>
            Jarak ini bukan jarak perjalanan, lokasi terkini petugas, atau dasar
            tunggal kelayakan. Tinjau kewenangan dan ketersediaan.
          </p>
          <ul>
            {candidates
              .filter((c) => c.team_id === teamId)
              .map((c) => (
                <li key={c.owner_id}>
                  {c.display_name || c.owner_id}: {label(c.availability)} ·
                  Diperbarui {date(c.availability_at)}
                </li>
              ))}
          </ul>
        </div>
      )}
      {!teams.length && (
        <p className="notice">
          Belum ada tim aktif dengan anggota berwenang di wilayah ini.
          Administrator perlu mengelola tim dan izin petugas.
        </p>
      )}
    </>
  );
}
