import type { CupFormat } from "./types.js";

/**
 * With random pairing, single elimination always halves (rounded up) the
 * field each round, so `ceil(log2(n))` rounds guarantee exactly one
 * champion. Double elimination here has no fixed winners/losers bracket —
 * it's the same random pairing each round, just with a second-loss
 * threshold — so how many losses land on the same entrants varies by luck
 * of the draw. `+1` is a heuristic, not a guarantee; a cup can still end
 * with co-champions if its configured rounds run out early (see
 * `autoFinalizeCupRounds`).
 */
export function getRecommendedCupRounds(format: CupFormat, entrantCount: number): number {
  if (entrantCount < 2) return 0;

  const singleEliminationRounds = Math.ceil(Math.log2(entrantCount));
  return format === "single" ? singleEliminationRounds : singleEliminationRounds + 1;
}
