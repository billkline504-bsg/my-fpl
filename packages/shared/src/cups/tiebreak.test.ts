import { describe, expect, it } from "vitest";
import { compareCupTiebreak, type CupTiebreakStats } from "./tiebreak.js";

function stats(overrides: Partial<CupTiebreakStats> = {}): CupTiebreakStats {
  return {
    topElevenPoints: 50,
    totalSquadPoints: 60,
    totalGoals: 3,
    goalsByPosition: { FWD: 1, MID: 1, DEF: 1, GK: 0 },
    cleanSheets: 2,
    ...overrides,
  };
}

describe("compareCupTiebreak", () => {
  it("decides on top-11 points first", () => {
    expect(compareCupTiebreak(stats({ topElevenPoints: 51 }), stats())).toBe("a");
  });

  it("falls back to total squad points when top-11 ties", () => {
    expect(compareCupTiebreak(stats({ totalSquadPoints: 61 }), stats())).toBe("a");
  });

  it("falls back to total goals when points tie", () => {
    expect(compareCupTiebreak(stats({ totalGoals: 4 }), stats())).toBe("a");
  });

  it("breaks ties by goals-by-position front to back, forwards before goalkeepers", () => {
    const forwardEdge = stats({ goalsByPosition: { FWD: 2, MID: 0, DEF: 1, GK: 0 } });
    const goalkeeperEdge = stats({ goalsByPosition: { FWD: 1, MID: 1, DEF: 0, GK: 1 } });
    // Same total goals (3) and same points — forward goals decide it, not goalkeeper goals.
    expect(compareCupTiebreak(forwardEdge, goalkeeperEdge)).toBe("a");
  });

  it("falls back to clean sheets as the last deterministic tiebreak", () => {
    expect(compareCupTiebreak(stats({ cleanSheets: 3 }), stats())).toBe("a");
  });

  it("returns tie when every level matches", () => {
    expect(compareCupTiebreak(stats(), stats())).toBe("tie");
  });
});
