import { describe, expect, it } from "vitest";
import {
  filtersSchema,
  filterUrl,
  recommendPriority,
  transitions,
} from "./domain";

describe("operational safety", () => {
  it("keeps unapproved recommendations unassessed for strong or missing data", () => {
    for (const inputs of [
      {},
      {
        severity: "high",
        urgency: "high",
        evidence_strength: "strong",
        data_freshness: "fresh",
      },
      { data_freshness: "stale" },
    ])
      expect(recommendPriority(inputs).recommendation).toBe("unassessed");
    expect(recommendPriority({}).missingInputs).toHaveLength(4);
  });
  it("parses bounded filters and preserves mode across pagination", () => {
    const f = filtersSchema.parse({
      mode: "live",
      page: -1,
      q: "a",
      source: "bad,query",
      verification: "automatic",
    });
    expect(f.page).toBe(1);
    expect(f.source).toBe("");
    expect(f.verification).toBe("");
    expect(filterUrl("/incidents", f, { page: 2 })).toContain("mode=live");
  });
  it("never skips assignment or finishes a newly created case", () => {
    expect(transitions.new).not.toContain("resolved");
    expect(transitions.new).not.toContain("in_progress");
    expect(transitions.resolved).toEqual(["triaging"]);
  });
});
