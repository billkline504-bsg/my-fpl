import { and, eq, inArray } from "drizzle-orm";
import {
  clubs,
  gameweekLineupPlayers,
  gameweekLineups,
  gameweeks,
  leagues,
  playerGameweekStats,
  players,
  type Db,
} from "@my-fpl/db";
import type { Position } from "@my-fpl/shared";
import { computeUserGameweekLineup } from "./standings.js";

export class LeagueNotFoundError extends Error {}
export class GameweekNotFoundError extends Error {}

export async function persistGameweekLineup(
  db: Db,
  params: {
    rosterId: string;
    gameweekId: string;
    startingIds: string[];
    benchIds: string[];
    positionByPlayerId: Map<string, Position>;
  },
) {
  await db.transaction(async (tx) => {
    const [lineup] = await tx
      .insert(gameweekLineups)
      .values({ rosterId: params.rosterId, gameweekId: params.gameweekId })
      .onConflictDoUpdate({
        target: [gameweekLineups.rosterId, gameweekLineups.gameweekId],
        set: { computedAt: new Date() },
      })
      .returning();
    if (!lineup) throw new Error("Failed to persist gameweek lineup");

    await tx.delete(gameweekLineupPlayers).where(eq(gameweekLineupPlayers.lineupId, lineup.id));

    const rows = [
      ...params.startingIds.map((playerId) => ({ playerId, slot: "starter" as const })),
      ...params.benchIds.map((playerId) => ({ playerId, slot: "bench" as const })),
    ].map((r) => ({
      lineupId: lineup.id,
      playerId: r.playerId,
      slot: r.slot,
      position: params.positionByPlayerId.get(r.playerId)!,
    }));

    if (rows.length > 0) {
      await tx.insert(gameweekLineupPlayers).values(rows);
    }
  });
}

async function buildLineupResponse(
  db: Db,
  lineupId: string,
  gameweekId: string,
) {
  const rows = await db
    .select({
      playerId: players.id,
      webName: players.webName,
      position: gameweekLineupPlayers.position,
      slot: gameweekLineupPlayers.slot,
      clubId: clubs.id,
      clubName: clubs.name,
      clubShortName: clubs.shortName,
      points: playerGameweekStats.points,
    })
    .from(gameweekLineupPlayers)
    .innerJoin(players, eq(gameweekLineupPlayers.playerId, players.id))
    .innerJoin(clubs, eq(players.clubId, clubs.id))
    .leftJoin(
      playerGameweekStats,
      and(eq(playerGameweekStats.playerId, players.id), eq(playerGameweekStats.gameweekId, gameweekId)),
    )
    .where(eq(gameweekLineupPlayers.lineupId, lineupId));

  const toLineupPlayer = (r: (typeof rows)[number]) => ({
    playerId: r.playerId,
    webName: r.webName,
    position: r.position,
    club: { id: r.clubId, name: r.clubName, shortName: r.clubShortName },
    points: r.points ?? 0,
  });

  const starters = rows.filter((r) => r.slot === "starter").map(toLineupPlayer);
  const bench = rows.filter((r) => r.slot === "bench").map(toLineupPlayer);
  const totalPoints = starters.reduce((sum, p) => sum + p.points, 0);

  return { starters, bench, totalPoints };
}

export async function getTeamGameweekLineup(
  db: Db,
  params: { leagueId: string; userId: string; gameweekNumber: number },
) {
  const [league] = await db.select().from(leagues).where(eq(leagues.id, params.leagueId));
  if (!league) throw new LeagueNotFoundError("League not found");

  const [gameweek] = await db
    .select()
    .from(gameweeks)
    .where(and(eq(gameweeks.seasonId, league.seasonId), eq(gameweeks.number, params.gameweekNumber)));
  if (!gameweek) throw new GameweekNotFoundError(`Gameweek ${params.gameweekNumber} not found`);

  const lineupParams = { leagueId: params.leagueId, userId: params.userId, seasonId: league.seasonId, gameweekId: gameweek.id };
  const computed = await computeUserGameweekLineup(db, lineupParams);

  const [existing] = await db
    .select()
    .from(gameweekLineups)
    .where(and(eq(gameweekLineups.rosterId, computed.rosterId), eq(gameweekLineups.gameweekId, gameweek.id)));

  if (existing) {
    return buildLineupResponse(db, existing.id, gameweek.id);
  }

  // No persisted snapshot yet (pre-feature gameweek, or a bye week that
  // never went through finalizeGameweekForLeague) — fall back to a live
  // computation from the current roster, without persisting it.
  const allIds = [...computed.startingIds, ...computed.benchIds];
  if (allIds.length === 0) {
    return { starters: [], bench: [], totalPoints: 0 };
  }

  const playerRows = await db
    .select({
      playerId: players.id,
      webName: players.webName,
      clubId: clubs.id,
      clubName: clubs.name,
      clubShortName: clubs.shortName,
      points: playerGameweekStats.points,
    })
    .from(players)
    .innerJoin(clubs, eq(players.clubId, clubs.id))
    .leftJoin(
      playerGameweekStats,
      and(eq(playerGameweekStats.playerId, players.id), eq(playerGameweekStats.gameweekId, gameweek.id)),
    )
    .where(inArray(players.id, allIds));

  const positionByPlayerId = computed.positionByPlayerId;
  const byId = new Map(playerRows.map((r) => [r.playerId, r]));
  const toLineupPlayer = (playerId: string) => {
    const r = byId.get(playerId)!;
    return {
      playerId: r.playerId,
      webName: r.webName,
      position: positionByPlayerId.get(playerId)!,
      club: { id: r.clubId, name: r.clubName, shortName: r.clubShortName },
      points: r.points ?? 0,
    };
  };

  const starters = computed.startingIds.map(toLineupPlayer);
  const bench = computed.benchIds.map(toLineupPlayer);

  return { starters, bench, totalPoints: computed.totalPoints };
}
