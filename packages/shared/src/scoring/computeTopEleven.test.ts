import { describe, expect, it } from "vitest";
import type { PlayerGameweekScore } from "../types/domain.js";
import { computeTopEleven } from "./computeTopEleven.js";

function squadOf(points: { position: PlayerGameweekScore["position"]; points: number }[]): PlayerGameweekScore[] {
  return points.map((p, i) => ({ playerId: `p${i}`, position: p.position, points: p.points }));
}

describe("computeTopEleven", () => {
  it("picks the pure top 11 by points when it already includes a GK", () => {
    const squad = squadOf([
      { position: "GK", points: 10 },
      { position: "GK", points: 2 },
      ...Array.from({ length: 5 }, (_, i) => ({ position: "DEF" as const, points: 9 - i })),
      ...Array.from({ length: 5 }, (_, i) => ({ position: "MID" as const, points: 8 - i })),
      ...Array.from({ length: 3 }, (_, i) => ({ position: "FWD" as const, points: 7 - i })),
    ]);

    const result = computeTopEleven(squad);

    expect(result.startingIds).toHaveLength(11);
    expect(result.startingIds).toContain("p0"); // best GK
    expect(result.totalPoints).toBe(
      squad
        .slice()
        .sort((a, b) => b.points - a.points)
        .slice(0, 11)
        .reduce((sum, p) => sum + p.points, 0),
    );
  });

  it("swaps in the best goalkeeper when the pure top 11 has none", () => {
    const squad = squadOf([
      { position: "GK", points: 1 }, // worst player overall
      { position: "GK", points: 0.5 },
      ...Array.from({ length: 5 }, () => ({ position: "DEF" as const, points: 10 })),
      ...Array.from({ length: 5 }, () => ({ position: "MID" as const, points: 10 })),
      ...Array.from({ length: 3 }, () => ({ position: "FWD" as const, points: 10 })),
    ]);

    const result = computeTopEleven(squad);

    expect(result.startingIds).toHaveLength(11);
    // p0 (GK, 1 pt) must be included even though it's the lowest scorer overall
    expect(result.startingIds).toContain("p0");
    // total = 10 non-GK outfield players at 10 pts each + the 1-pt GK
    expect(result.totalPoints).toBe(10 * 10 + 1);
  });

  it("falls back to a pure top 11 when the squad has no goalkeeper at all", () => {
    const squad = squadOf(Array.from({ length: 13 }, (_, i) => ({ position: "MID" as const, points: i })));

    const result = computeTopEleven(squad);

    expect(result.startingIds).toHaveLength(11);
    expect(result.totalPoints).toBe(
      squad
        .slice()
        .sort((a, b) => b.points - a.points)
        .slice(0, 11)
        .reduce((sum, p) => sum + p.points, 0),
    );
  });
});
