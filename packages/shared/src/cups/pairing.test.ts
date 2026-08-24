import { describe, expect, it } from "vitest";
import { pairRandomly } from "./pairing.js";

function participantsInPairings(pairings: ReturnType<typeof pairRandomly>): string[] {
  return pairings.flatMap((p) => (p.userBId ? [p.userAId, p.userBId] : [p.userAId]));
}

describe("pairRandomly", () => {
  it("returns no pairings for an empty list", () => {
    expect(pairRandomly([])).toEqual([]);
  });

  it("gives a lone entrant a bye", () => {
    const pairings = pairRandomly(["a"]);
    expect(pairings).toEqual([{ userAId: "a", userBId: null }]);
  });

  it("pairs every entrant exactly once with no byes for an even count", () => {
    const ids = ["a", "b", "c", "d", "e", "f"];
    const pairings = pairRandomly(ids);
    expect(pairings).toHaveLength(3);
    expect(pairings.every((p) => p.userBId !== null)).toBe(true);
    expect(participantsInPairings(pairings).sort()).toEqual([...ids].sort());
  });

  it("gives exactly one bye for an odd count, still including everyone once", () => {
    const ids = ["a", "b", "c", "d", "e"];
    const pairings = pairRandomly(ids);
    const byes = pairings.filter((p) => p.userBId === null);
    expect(byes).toHaveLength(1);
    expect(participantsInPairings(pairings).sort()).toEqual([...ids].sort());
  });

  it("never pairs an entrant with themselves", () => {
    const ids = Array.from({ length: 8 }, (_, i) => `user-${i}`);
    const pairings = pairRandomly(ids);
    for (const p of pairings) {
      expect(p.userAId).not.toBe(p.userBId);
    }
  });
});
