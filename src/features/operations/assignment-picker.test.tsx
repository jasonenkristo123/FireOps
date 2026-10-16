import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AssignmentPicker } from "./assignment-picker";

const base = {
  authority_type: "Synthetic mandate",
  availability_at: "2026-10-16T00:00:00Z",
  distance_to_team_km: 1.56,
  base_source: "Synthetic base record",
  base_recorded_at: "2026-10-16T00:00:00Z",
};
const candidates = [
  {
    ...base,
    team_id: "team-a",
    team_name: "Team A",
    owner_id: "officer-a",
    display_name: "Officer A",
    availability: "available",
  },
  {
    ...base,
    team_id: "team-b",
    team_name: "Team B",
    owner_id: "officer-b",
    display_name: "Officer B",
    availability: "available",
  },
  {
    ...base,
    team_id: "team-a",
    team_name: "Team A",
    owner_id: "officer-busy",
    display_name: "Officer Busy",
    availability: "busy",
  },
];
describe("paired assignment eligibility", () => {
  it("requires a team, shows only its members, and clears an owner when changing team", () => {
    render(<AssignmentPicker candidates={candidates} />);
    const team = screen.getByLabelText("Tim berwenang di wilayah insiden");
    expect(
      screen.getByLabelText(
        "Petugas (harus tersedia dan anggota tim terpilih)",
      ),
    ).toBeDisabled();
    fireEvent.change(team, { target: { value: "team-a" } });
    const owner = screen.getByLabelText(
      "Petugas (harus tersedia dan anggota tim terpilih)",
    );
    expect(
      within(owner).queryByRole("option", { name: /Officer B ·/ }),
    ).not.toBeInTheDocument();
    expect(
      within(owner).getByRole("option", { name: /Officer Busy/ }),
    ).toBeDisabled();
    fireEvent.change(owner, { target: { value: "officer-a" } });
    fireEvent.change(team, { target: { value: "team-b" } });
    const next = screen.getByLabelText(
      "Petugas (harus tersedia dan anggota tim terpilih)",
    );
    expect(next).toHaveValue("");
    expect(
      within(next).queryByRole("option", { name: /Officer A/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/1.6 km/)).toBeInTheDocument();
    expect(screen.getByText(/bukan jarak perjalanan/)).toBeInTheDocument();
  });
  it("keeps missing distance unknown and gives an actionable empty state", () => {
    const { rerender } = render(
      <AssignmentPicker
        candidates={[
          {
            ...candidates[0],
            distance_to_team_km: null,
            base_source: null,
            base_recorded_at: null,
          },
        ]}
      />,
    );
    fireEvent.change(
      screen.getByLabelText("Tim berwenang di wilayah insiden"),
      { target: { value: "team-a" } },
    );
    expect(
      screen.getByText("Jarak basis tim belum tersedia."),
    ).toBeInTheDocument();
    rerender(<AssignmentPicker candidates={[]} />);
    expect(screen.getByText(/Belum ada tim aktif/)).toBeInTheDocument();
  });
});
