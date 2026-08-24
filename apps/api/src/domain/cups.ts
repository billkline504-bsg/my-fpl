import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import {
  cupEntrants,
  cupEvents,
  cupMatchups,
  gameweeks,
  leagueMemberships,
  leagues,
  playerGameweekStats,
  type Db,
} from "@my-fpl/db";
import {
  compareCupTiebreak,
  computeTopEleven,
  getRecommendedCupRounds,
  pairRandomly,
  type CupFormat,
  type CupTiebreakStats,
  type PlayerGameweekScore,
  type Position,
} from "@my-fpl/shared";
import { getActiveRosterPlayers } from "./rosters.js";
import { uploadIconFile } from "./icons.js";
import type { Storage } from "../plugins/storage.js";

export class NotCommissionerError extends Error {}
export class CupAlreadyActiveError extends Error {}
export class NotEnoughEntrantsError extends Error {}
export class StartingGameweekNotFoundError extends Error {}
export class CupNotFoundError extends Error {}

type Gameweek = typeof gameweeks.$inferSelect;

async function requireCommissioner(db: Db, leagueId: string, userId: string) {
  const [league] = await db.select().from(leagues).where(eq(leagues.id, leagueId));
  if (!league || league.commissionerId !== userId) {
    throw new NotCommissionerError("Only the league commissioner can do this");
  }
  return league;
}

async function createRoundMatchups(
  db: Db,
  params: { cupEventId: string; roundNumber: number; gameweek: Gameweek; entrantUserIds: string[] },
) {
  const pairings = pairRandomly(params.entrantUserIds);
  if (pairings.length === 0) return;

  await db.insert(cupMatchups).values(
    pairings.map((p) => ({
      cupEventId: params.cupEventId,
      roundNumber: params.roundNumber,
      gameweekId: params.gameweek.id,
      userAId: p.userAId,
      userBId: p.userBId,
      isBye: p.userBId === null,
      winnerId: p.userBId === null ? p.userAId : null,
    })),
  );
}

export async function createCupEvent(
  db: Db,
  params: {
    leagueId: string;
    requestedByUserId: string;
    name: string;
    format: CupFormat;
    startingGameweekNumber: number;
    configuredRounds?: number;
  },
) {
  const league = await requireCommissioner(db, params.leagueId, params.requestedByUserId);

  const [existingActive] = await db
    .select()
    .from(cupEvents)
    .where(and(eq(cupEvents.leagueId, params.leagueId), eq(cupEvents.status, "in_progress")));
  if (existingActive) {
    throw new CupAlreadyActiveError("This league already has an active cup competition");
  }

  const members = await db
    .select({ userId: leagueMemberships.userId })
    .from(leagueMemberships)
    .where(eq(leagueMemberships.leagueId, params.leagueId));
  if (members.length < 2) {
    throw new NotEnoughEntrantsError("Need at least 2 league members to start a cup competition");
  }

  const [startingGameweek] = await db
    .select()
    .from(gameweeks)
    .where(and(eq(gameweeks.seasonId, league.seasonId), eq(gameweeks.number, params.startingGameweekNumber)));
  if (!startingGameweek) {
    throw new StartingGameweekNotFoundError(
      `Gameweek ${params.startingGameweekNumber} not found for this season — sync FPL data first`,
    );
  }

  const configuredRounds = params.configuredRounds ?? getRecommendedCupRounds(params.format, members.length);

  const [cupEvent] = await db
    .insert(cupEvents)
    .values({
      leagueId: params.leagueId,
      seasonId: league.seasonId,
      name: params.name,
      format: params.format,
      startingGameweekNumber: params.startingGameweekNumber,
      configuredRounds,
      status: "in_progress",
    })
    .returning();
  if (!cupEvent) throw new Error("Failed to create cup");

  await db.insert(cupEntrants).values(members.map((m) => ({ cupEventId: cupEvent.id, userId: m.userId })));

  await createRoundMatchups(db, {
    cupEventId: cupEvent.id,
    roundNumber: 1,
    gameweek: startingGameweek,
    entrantUserIds: members.map((m) => m.userId),
  });

  return getCupDetail(db, { leagueId: params.leagueId, cupEventId: cupEvent.id });
}

export async function getCupDetail(db: Db, params: { leagueId: string; cupEventId: string }) {
  const [cupEvent] = await db
    .select()
    .from(cupEvents)
    .where(and(eq(cupEvents.id, params.cupEventId), eq(cupEvents.leagueId, params.leagueId)));
  if (!cupEvent) throw new CupNotFoundError("Cup not found");

  const entrants = await db.select().from(cupEntrants).where(eq(cupEntrants.cupEventId, cupEvent.id));

  const matchupRows = await db
    .select({
      id: cupMatchups.id,
      roundNumber: cupMatchups.roundNumber,
      gameweekNumber: gameweeks.number,
      userAId: cupMatchups.userAId,
      userBId: cupMatchups.userBId,
      userAScore: cupMatchups.userAScore,
      userBScore: cupMatchups.userBScore,
      winnerId: cupMatchups.winnerId,
      isBye: cupMatchups.isBye,
    })
    .from(cupMatchups)
    .innerJoin(gameweeks, eq(cupMatchups.gameweekId, gameweeks.id))
    .where(eq(cupMatchups.cupEventId, cupEvent.id))
    .orderBy(cupMatchups.roundNumber);

  const champions = cupEvent.status === "completed" ? entrants.filter((e) => !e.eliminatedAt).map((e) => e.userId) : [];

  return { ...cupEvent, entrants, matchups: matchupRows, champions };
}

export async function listCupsForLeague(db: Db, leagueId: string) {
  const events = await db.select().from(cupEvents).where(eq(cupEvents.leagueId, leagueId)).orderBy(desc(cupEvents.createdAt));
  return Promise.all(events.map((e) => getCupDetail(db, { leagueId, cupEventId: e.id })));
}

export async function setCupIcon(
  db: Db,
  storage: Storage,
  params: { leagueId: string; cupEventId: string; requestedByUserId: string; buffer: Buffer; mimeType: string },
) {
  await requireCommissioner(db, params.leagueId, params.requestedByUserId);

  const [cupEvent] = await db
    .select()
    .from(cupEvents)
    .where(and(eq(cupEvents.id, params.cupEventId), eq(cupEvents.leagueId, params.leagueId)));
  if (!cupEvent) throw new CupNotFoundError("Cup not found");

  const iconUrl = await uploadIconFile(storage, {
    path: `cups/${params.cupEventId}`,
    buffer: params.buffer,
    mimeType: params.mimeType,
  });

  await db.update(cupEvents).set({ iconUrl }).where(eq(cupEvents.id, params.cupEventId));

  return getCupDetail(db, { leagueId: params.leagueId, cupEventId: params.cupEventId });
}

async function computeUserGameweekTiebreakStats(
  db: Db,
  params: { leagueId: string; userId: string; seasonId: string; gameweekId: string },
): Promise<CupTiebreakStats> {
  const emptyGoalsByPosition: Record<Position, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 };

  const roster = await getActiveRosterPlayers(db, {
    leagueId: params.leagueId,
    userId: params.userId,
    seasonId: params.seasonId,
  });
  if (roster.length === 0) {
    return { topElevenPoints: 0, totalSquadPoints: 0, totalGoals: 0, goalsByPosition: emptyGoalsByPosition, cleanSheets: 0 };
  }

  const statRows = await db
    .select()
    .from(playerGameweekStats)
    .where(
      and(
        eq(playerGameweekStats.gameweekId, params.gameweekId),
        inArray(playerGameweekStats.playerId, roster.map((r) => r.player.id)),
      ),
    );
  const statsByPlayerId = new Map(statRows.map((s) => [s.playerId, s]));

  const scored: PlayerGameweekScore[] = roster.map((r) => ({
    playerId: r.player.id,
    position: r.player.position,
    points: statsByPlayerId.get(r.player.id)?.points ?? 0,
  }));
  const topElevenPoints = computeTopEleven(scored).totalPoints;

  const goalsByPosition = { ...emptyGoalsByPosition };
  let totalSquadPoints = 0;
  let totalGoals = 0;
  let cleanSheets = 0;
  for (const r of roster) {
    const stat = statsByPlayerId.get(r.player.id);
    if (!stat) continue;
    totalSquadPoints += stat.points;
    totalGoals += stat.goals;
    goalsByPosition[r.player.position] += stat.goals;
    cleanSheets += stat.cleanSheets;
  }

  return { topElevenPoints, totalSquadPoints, totalGoals, goalsByPosition, cleanSheets };
}

/**
 * Runs alongside `autoFinalizeFinishedGameweeks` after every FPL sync. Each
 * cup can only have one round "in flight" at a time — the next round's
 * matchups aren't created until the current round's gameweek finishes and
 * gets scored — so this walks forward one round at a time per cup, looping
 * within a cup in case multiple rounds' gameweeks have already finished
 * (e.g. after the API was offline for a while).
 */
export async function autoFinalizeCupRounds(db: Db) {
  const activeCups = await db.select().from(cupEvents).where(eq(cupEvents.status, "in_progress"));

  let roundsFinalized = 0;
  let matchupsFinalized = 0;

  for (const cup of activeCups) {
    while (true) {
      const pending = await db
        .select({ matchup: cupMatchups })
        .from(cupMatchups)
        .innerJoin(gameweeks, eq(cupMatchups.gameweekId, gameweeks.id))
        .where(and(eq(cupMatchups.cupEventId, cup.id), isNull(cupMatchups.winnerId), eq(gameweeks.isFinished, true)));
      if (pending.length === 0) break;

      const roundNumber = pending[0]!.matchup.roundNumber;
      const roundMatchups = pending.map((p) => p.matchup).filter((m) => m.roundNumber === roundNumber);

      for (const matchup of roundMatchups) {
        if (matchup.isBye || !matchup.userBId) continue;

        const [statsA, statsB] = await Promise.all([
          computeUserGameweekTiebreakStats(db, {
            leagueId: cup.leagueId,
            userId: matchup.userAId,
            seasonId: cup.seasonId,
            gameweekId: matchup.gameweekId,
          }),
          computeUserGameweekTiebreakStats(db, {
            leagueId: cup.leagueId,
            userId: matchup.userBId,
            seasonId: cup.seasonId,
            gameweekId: matchup.gameweekId,
          }),
        ]);

        const comparison = compareCupTiebreak(statsA, statsB);
        const aWins = comparison === "a" || (comparison === "tie" && Math.random() < 0.5);
        const winnerId = aWins ? matchup.userAId : matchup.userBId;
        const loserId = aWins ? matchup.userBId : matchup.userAId;

        await db
          .update(cupMatchups)
          .set({ userAScore: statsA.topElevenPoints, userBScore: statsB.topElevenPoints, winnerId })
          .where(eq(cupMatchups.id, matchup.id));

        const [loserEntrant] = await db
          .select()
          .from(cupEntrants)
          .where(and(eq(cupEntrants.cupEventId, cup.id), eq(cupEntrants.userId, loserId)));
        if (loserEntrant) {
          const newLosses = loserEntrant.losses + 1;
          const eliminationThreshold = cup.format === "single" ? 1 : 2;
          await db
            .update(cupEntrants)
            .set({ losses: newLosses, eliminatedAt: newLosses >= eliminationThreshold ? new Date() : null })
            .where(eq(cupEntrants.id, loserEntrant.id));
        }

        matchupsFinalized++;
      }
      roundsFinalized++;

      const entrants = await db.select().from(cupEntrants).where(eq(cupEntrants.cupEventId, cup.id));
      const survivors = entrants.filter((e) => !e.eliminatedAt);

      if (survivors.length <= 1 || roundNumber >= cup.configuredRounds) {
        await db.update(cupEvents).set({ status: "completed", completedAt: new Date() }).where(eq(cupEvents.id, cup.id));
        break;
      }

      const nextGameweekNumber = cup.startingGameweekNumber + roundNumber;
      const [nextGameweek] = await db
        .select()
        .from(gameweeks)
        .where(and(eq(gameweeks.seasonId, cup.seasonId), eq(gameweeks.number, nextGameweekNumber)));
      if (!nextGameweek) break;

      await createRoundMatchups(db, {
        cupEventId: cup.id,
        roundNumber: roundNumber + 1,
        gameweek: nextGameweek,
        entrantUserIds: survivors.map((s) => s.userId),
      });
    }
  }

  return { roundsFinalized, matchupsFinalized };
}
