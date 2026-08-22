import { describe, expect, it } from "vitest";
import { generateRoundRobin } from "./roundRobin.js";

function allPairsPlayedOnce(userIds: string[], rounds: ReturnType<typeof generateRoundRobin>) {
  const seen = new Set<string>();
  for (const round of rounds) {
    for (const { userAId, userBId } of round) {
      const key = [userAId, userBId].sort().join("-");
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  }
  const expectedPairs = (userIds.length * (userIds.length - 1)) / 2;
  expect(seen.size).toBe(expectedPairs);
}

describe("generateRoundRobin", () => {
  it("pairs every user exactly once per round for an even count", () => {
    const users = ["A", "B", "C", "D"];
    const rounds = generateRoundRobin(users);

    expect(rounds).toHaveLength(3); // n-1 rounds
    for (const round of rounds) {
      expect(round).toHaveLength(2); // n/2 pairs
      const playing = round.flatMap((p) => [p.userAId, p.userBId]);
      expect(new Set(playing).size).toBe(4); // nobody plays twice in a round
    }
    allPairsPlayedOnce(users, rounds);
  });

  it("gives everyone exactly one bye per cycle for an odd count", () => {
    const users = ["A", "B", "C"];
    const rounds = generateRoundRobin(users);

    expect(rounds).toHaveLength(3); // n rounds after adding a bye seat
    for (const round of rounds) {
      expect(round).toHaveLength(1); // one pair, one user sits out
    }
    allPairsPlayedOnce(users, rounds);

    const byeCounts = new Map(users.map((u) => [u, 0]));
    for (const round of rounds) {
      const playing = new Set(round.flatMap((p) => [p.userAId, p.userBId]));
      for (const u of users) if (!playing.has(u)) byeCounts.set(u, byeCounts.get(u)! + 1);
    }
    for (const u of users) expect(byeCounts.get(u)).toBe(1);
  });

  it("returns no rounds for fewer than 2 users", () => {
    expect(generateRoundRobin(["solo"])).toEqual([]);
    expect(generateRoundRobin([])).toEqual([]);
  });

  it("handles the max 8-user league size", () => {
    const users = Array.from({ length: 8 }, (_, i) => `u${i}`);
    const rounds = generateRoundRobin(users);
    expect(rounds).toHaveLength(7);
    allPairsPlayedOnce(users, rounds);
  });
});
