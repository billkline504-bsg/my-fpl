import type { Position } from "../types/domain.js";

export interface CupTiebreakStats {
  topElevenPoints: number;
  totalSquadPoints: number;
  totalGoals: number;
  goalsByPosition: Record<Position, number>;
  cleanSheets: number;
}

/** Front (attack) to back (goal): forwards' goals are compared first, goalkeepers' last. */
const POSITION_TIEBREAK_ORDER: Position[] = ["FWD", "MID", "DEF", "GK"];

/**
 * Cup matchup tiebreak cascade: top-11 score, then total squad points (all
 * 15, not just the top 11), then total goals, then goals broken down by
 * position front-to-back, then clean sheets. Returns "tie" if every level
 * matches — the caller decides how to break a tie that deep (this app
 * picks randomly, since two different 15-man squads matching on every one
 * of these is vanishingly unlikely).
 */
export function compareCupTiebreak(a: CupTiebreakStats, b: CupTiebreakStats): "a" | "b" | "tie" {
  if (a.topElevenPoints !== b.topElevenPoints) return a.topElevenPoints > b.topElevenPoints ? "a" : "b";
  if (a.totalSquadPoints !== b.totalSquadPoints) return a.totalSquadPoints > b.totalSquadPoints ? "a" : "b";
  if (a.totalGoals !== b.totalGoals) return a.totalGoals > b.totalGoals ? "a" : "b";

  for (const position of POSITION_TIEBREAK_ORDER) {
    const aGoals = a.goalsByPosition[position];
    const bGoals = b.goalsByPosition[position];
    if (aGoals !== bGoals) return aGoals > bGoals ? "a" : "b";
  }

  if (a.cleanSheets !== b.cleanSheets) return a.cleanSheets > b.cleanSheets ? "a" : "b";

  return "tie";
}
