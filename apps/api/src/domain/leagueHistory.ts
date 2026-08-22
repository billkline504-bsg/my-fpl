import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { matchups, profiles, seasons, standings, type Db } from "@my-fpl/db";

export async function getLeagueHistory(db: Db, leagueId: string) {
  const standingsRows = await db
    .select({
      seasonId: standings.seasonId,
      userId: standings.userId,
      displayName: profiles.displayName,
      played: standings.played,
      wins: standings.wins,
      ties: standings.ties,
      losses: standings.losses,
      points: standings.points,
    })
    .from(standings)
    .innerJoin(profiles, eq(standings.userId, profiles.id))
    .where(eq(standings.leagueId, leagueId));

  if (standingsRows.length === 0) return [];

  const seasonIds = [...new Set(standingsRows.map((r) => r.seasonId))];
  const seasonRows = await db.select().from(seasons).where(inArray(seasons.id, seasonIds));
  const seasonLabelById = new Map(seasonRows.map((s) => [s.id, s.label]));

  const finalizedMatchups = await db
    .select()
    .from(matchups)
    .where(and(eq(matchups.leagueId, leagueId), isNotNull(matchups.userAScore), isNotNull(matchups.userBScore)));

  const scoredByUserSeason = new Map<string, number>();
  const addScore = (seasonId: string, userId: string, score: number) => {
    const key = `${seasonId}:${userId}`;
    scoredByUserSeason.set(key, (scoredByUserSeason.get(key) ?? 0) + score);
  };
  for (const m of finalizedMatchups) {
    addScore(m.seasonId, m.userAId, m.userAScore ?? 0);
    addScore(m.seasonId, m.userBId, m.userBScore ?? 0);
  }

  return standingsRows
    .map((row) => ({
      seasonId: row.seasonId,
      seasonLabel: seasonLabelById.get(row.seasonId) ?? "Unknown season",
      userId: row.userId,
      displayName: row.displayName,
      played: row.played,
      wins: row.wins,
      ties: row.ties,
      losses: row.losses,
      points: row.points,
      totalPointsScored: scoredByUserSeason.get(`${row.seasonId}:${row.userId}`) ?? 0,
    }))
    .sort((a, b) => {
      if (a.seasonLabel !== b.seasonLabel) return b.seasonLabel.localeCompare(a.seasonLabel);
      return b.points - a.points;
    });
}
