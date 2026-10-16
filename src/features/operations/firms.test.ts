import { describe, expect, it } from "vitest";
import { bboxSchema, parseFirms } from "./firms";

const bbox = bboxSchema.parse("108,-3,115,3");
const now = new Date("2026-10-16T10:00:00Z");
const header =
  "latitude,longitude,acq_date,acq_time,satellite,instrument,confidence,frp,bright_ti4\n";
// Synthetic CSV, NASA column format only. Never source or live observation data.
const row = "-0.1,110.2,2026-10-16,0705,N,VIIRS,n,12.1,320\n";
describe("FIRMS parser with synthetic fixtures", () => {
  it("preserves source confidence semantics and UTC observation time", () => {
    const [r] = parseFirms(header + row, "VIIRS_SNPP_NRT", bbox, now);
    expect(r.confidence_raw).toBe("n");
    expect(r.detected_at).toBe("2026-10-16T07:05:00.000Z");
    expect(r.raw_payload.latitude).toBe("-0.1");
  });
  it("dedupes repeat observation keys and distinguishes sources/overpasses", () => {
    const a = parseFirms(header + row, "VIIRS_SNPP_NRT", bbox, now)[0];
    expect(
      parseFirms(header + row, "VIIRS_SNPP_NRT", bbox, now)[0].observation_key,
    ).toBe(a.observation_key);
    expect(
      parseFirms(header + row, "VIIRS_NOAA20_NRT", bbox, now)[0]
        .observation_key,
    ).not.toBe(a.observation_key);
    expect(
      parseFirms(
        header + row.replace("0705", "0805"),
        "VIIRS_SNPP_NRT",
        bbox,
        now,
      )[0].observation_key,
    ).not.toBe(a.observation_key);
  });
  it("keeps missing confidence null, never zero", () => {
    expect(
      parseFirms(
        header + row.replace(",n,", ",,"),
        "VIIRS_SNPP_NRT",
        bbox,
        now,
      )[0].confidence_raw,
    ).toBeNull();
  });
  it("accepts a header-only empty response", () => {
    expect(parseFirms(header, "VIIRS_SNPP_NRT", bbox, now)).toEqual([]);
  });
  it("rejects schema drift, wrong sensor confidence, invalid times and out of bbox coordinates", () => {
    for (const csv of [
      "error quota exhausted",
      header + row.replace(",n,", ",95,"),
      header + row.replace("0705", "2560"),
      header + row.replace("110.2", "140"),
      header + row.replace("2026-10-16", "2026-09-31"),
    ])
      expect(() => parseFirms(csv, "VIIRS_SNPP_NRT", bbox, now)).toThrow();
  });
  it("preserves MODIS numeric confidence without VIIRS conversion", () => {
    const csv = `${header}-0.1,110.2,2026-10-16,0705,Terra,MODIS,80,12,320\n`;
    expect(parseFirms(csv, "MODIS_NRT", bbox, now)[0].confidence_raw).toBe(
      "80",
    );
  });
  it("rejects unconfigured, reversed and global-like invalid bboxes", () => {
    for (const b of ["", "115,3,108,-3", "108,-3,999,3"])
      expect(bboxSchema.safeParse(b).success).toBe(false);
  });
});
