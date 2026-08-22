import { MIN_STARTING_GOALKEEPERS, STARTING_XI_SIZE, type PlayerGameweekScore } from "../types/domain.js";

export interface TopElevenResult {
  startingIds: string[];
  benchIds: string[];
  totalPoints: number;
}

/**
 * Picks the highest-scoring `STARTING_XI_SIZE` players from a squad, subject
 * to including at least `MIN_STARTING_GOALKEEPERS` goalkeepers. Optimal via
 * a single exchange: if the unconstrained top 11 already has enough GKs,
 * it's already optimal; otherwise the cheapest fix is swapping the weakest
 * of the top 11 for the best GK left out.
 */
export function computeTopEleven(squad: PlayerGameweekScore[]): TopElevenResult {
  const byPointsDesc = [...squad].sort((a, b) => b.points - a.points);
  const starting = byPointsDesc.slice(0, STARTING_XI_SIZE);
  const bench = byPointsDesc.slice(STARTING_XI_SIZE);

  const startingGoalkeeperCount = starting.filter((p) => p.position === "GK").length;

  if (startingGoalkeeperCount < MIN_STARTING_GOALKEEPERS) {
    const benchGoalkeepers = bench
      .filter((p) => p.position === "GK")
      .sort((a, b) => b.points - a.points);
    const bestBenchedGoalkeeper = benchGoalkeepers[0];

    if (bestBenchedGoalkeeper && starting.length > 0) {
      const weakestStarterIndex = starting.length - 1;
      const weakestStarter = starting[weakestStarterIndex]!;
      starting[weakestStarterIndex] = bestBenchedGoalkeeper;
      const benchIndex = bench.indexOf(bestBenchedGoalkeeper);
      bench[benchIndex] = weakestStarter;
    }
  }

  return {
    startingIds: starting.map((p) => p.playerId),
    benchIds: bench.map((p) => p.playerId),
    totalPoints: starting.reduce((sum, p) => sum + p.points, 0),
  };
}
