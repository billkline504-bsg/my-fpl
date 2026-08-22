import { and, eq } from "drizzle-orm";
import { clubs, gameweeks, playerGameweekStats, players, type Db } from "@my-fpl/db";
import { getOrCreateDefaultSeason } from "./seasons.js";

export class PlayerNotFoundError extends Error {}

export async function getPlayerSeasonStats(db: Db, params: { playerId: string; seasonId?: string }) {
  const [player] = await db
    .select({
      id: players.id,
      webName: players.webName,
      position: players.position,
      clubId: clubs.id,
      clubName: clubs.name,
      clubShortName: clubs.shortName,
    })
    .from(players)
    .innerJoin(clubs, eq(players.clubId, clubs.id))
    .where(eq(players.id, params.playerId));
  if (!player) throw new PlayerNotFoundError("Player not found");

  const seasonId = params.seasonId ?? (await getOrCreateDefaultSeason(db)).id;

  const gameweekRows = await db
    .select({
      gameweekNumber: gameweeks.number,
      points: playerGameweekStats.points,
      minutes: playerGameweekStats.minutes,
      goals: playerGameweekStats.goals,
      assists: playerGameweekStats.assists,
      cleanSheets: playerGameweekStats.cleanSheets,
    })
    .from(playerGameweekStats)
    .innerJoin(gameweeks, eq(playerGameweekStats.gameweekId, gameweeks.id))
    .where(and(eq(playerGameweekStats.playerId, params.playerId), eq(gameweeks.seasonId, seasonId)))
    .orderBy(gameweeks.number);

  const totals = gameweekRows.reduce(
    (acc, row) => ({
      points: acc.points + row.points,
      minutes: acc.minutes + row.minutes,
      goals: acc.goals + row.goals,
      assists: acc.assists + row.assists,
      cleanSheets: acc.cleanSheets + row.cleanSheets,
      appearances: acc.appearances + (row.minutes > 0 ? 1 : 0),
    }),
    { points: 0, minutes: 0, goals: 0, assists: 0, cleanSheets: 0, appearances: 0 },
  );

  return {
    player: {
      id: player.id,
      webName: player.webName,
      position: player.position,
      club: { id: player.clubId, name: player.clubName, shortName: player.clubShortName },
    },
    totals,
    gameweeks: gameweekRows,
  };
}
