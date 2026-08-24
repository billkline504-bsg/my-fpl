import { describe, expect, it } from "vitest";
import { getRecommendedCupRounds } from "./roundCount.js";

describe("getRecommendedCupRounds", () => {
  it("returns 0 for fewer than 2 entrants", () => {
    expect(getRecommendedCupRounds("single", 0)).toBe(0);
    expect(getRecommendedCupRounds("single", 1)).toBe(0);
  });

  it("computes exact single-elimination rounds needed", () => {
    expect(getRecommendedCupRounds("single", 2)).toBe(1);
    expect(getRecommendedCupRounds("single", 3)).toBe(2);
    expect(getRecommendedCupRounds("single", 4)).toBe(2);
    expect(getRecommendedCupRounds("single", 5)).toBe(3);
    expect(getRecommendedCupRounds("single", 8)).toBe(3);
  });

  it("adds one heuristic extra round for double elimination", () => {
    expect(getRecommendedCupRounds("double", 2)).toBe(2);
    expect(getRecommendedCupRounds("double", 8)).toBe(4);
  });
});
