import { and, desc, eq, inArray, isNotNull, or, isNull } from "drizzle-orm";
import { gameweeks, leagueMemberships, leagues, matchups, playerGameweekStats, profiles, standings, type Db } from "@my-fpl/db";
import { computeTopEleven, generateRoundRobin, MATCH_POINTS, type PlayerGameweekScore } from "@my-fpl/shared";
import { getActiveRosterPlayers } from "./rosters.js";
import { syncGameweekStats } from "./fplSync.js";

type Gameweek = typeof gameweeks.$inferSelect;

export class NotCommissionerError extends Error {}
export class ScheduleAlreadyExistsError extends Error {}
export class NotEnoughMembersError extends Error {}
export class NoGameweeksError extends Error {}
export class GameweekNotFoundError extends Error {}

async function requireCommissioner(db: Db, leagueId: string, userId: string) {
  const [league] = await db.select().from(leagues).where(eq(leagues.id, leagueId));
  if (!league || league.commissionerId !== userId) {
    throw new NotCommissionerError("Only the league commissioner can do this");
  }
  return league;
}

export async function generateSeasonSchedule(db: Db, params: { leagueId: string; requestedByUserId: string }) {
  const league = await requireCommissioner(db, params.leagueId, params.requestedByUserId);

  const [existing] = await db
    .select()
    .from(matchups)
    .where(and(eq(matchups.leagueId, params.leagueId), eq(matchups.seasonId, league.seasonId)));
  if (existing) {
    throw new ScheduleAlreadyExistsError("A schedule has already been generated for this league");
  }

  const members = await db
    .select({ userId: leagueMemberships.userId })
    .from(leagueMemberships)
    .where(eq(leagueMemberships.leagueId, params.leagueId));
  if (members.length < 2) {
    throw new NotEnoughMembersError("Need at least 2 league members to generate a schedule");
  }

  const rounds = generateRoundRobin(members.map((m) => m.userId));

  const seasonGameweeks = await db
    .select()
    .from(gameweeks)
    .where(eq(gameweeks.seasonId, league.seasonId))
    .orderBy(gameweeks.number);
  if (seasonGameweeks.length === 0) {
    throw new NoGameweeksError("No gameweeks found for this season — sync FPL data first");
  }

  const rows = seasonGameweeks.flatMap((gameweek, i) =>
    rounds[i % rounds.length]!.map((pairing) => ({
      leagueId: params.leagueId,
      seasonId: league.seasonId,
      gameweekId: gameweek.id,
      userAId: pairing.userAId,
      userBId: pairing.userBId,
    })),
  );

  if (rows.length > 0) {
    await db.insert(matchups).values(rows);
  }

  return { rounds: rounds.length, gameweeks: seasonGameweeks.length, matchupsCreated: rows.length };
}

export async function computeUserGameweekScore(
  db: Db,
  params: { leagueId: string; userId: string; seasonId: string; gameweekId: string },
) {
  const roster = await getActiveRosterPlayers(db, {
    leagueId: params.leagueId,
    userId: params.userId,
    seasonId: params.seasonId,
  });
  if (roster.length === 0) return 0;

  const statRows = await db
    .select()
    .from(playerGameweekStats)
    .where(
      and(
        eq(playerGameweekStats.gameweekId, params.gameweekId),
        inArray(
          playerGameweekStats.playerId,
          roster.map((r) => r.player.id),
        ),
      ),
    );
  const pointsByPlayerId = new Map(statRows.map((s) => [s.playerId, s.points]));

  const scored: PlayerGameweekScore[] = roster.map((r) => ({
    playerId: r.player.id,
    position: r.player.position,
    points: pointsByPlayerId.get(r.player.id) ?? 0,
  }));

  return computeTopEleven(scored).totalPoints;
}

async function finalizeGameweekForLeague(
  db: Db,
  params: { leagueId: string; seasonId: string; gameweek: Gameweek },
) {
  const gameweekMatchups = await db
    .select()
    .from(matchups)
    .where(and(eq(matchups.leagueId, params.leagueId), eq(matchups.gameweekId, params.gameweek.id)));

  for (const matchup of gameweekMatchups) {
    const [userAScore, userBScore] = await Promise.all([
      computeUserGameweekScore(db, {
        leagueId: params.leagueId,
        userId: matchup.userAId,
        seasonId: params.seasonId,
        gameweekId: params.gameweek.id,
      }),
      computeUserGameweekScore(db, {
        leagueId: params.leagueId,
        userId: matchup.userBId,
        seasonId: params.seasonId,
        gameweekId: params.gameweek.id,
      }),
    ]);
    const winnerId = userAScore === userBScore ? null : userAScore > userBScore ? matchup.userAId : matchup.userBId;

    await db.update(matchups).set({ userAScore, userBScore, winnerId }).where(eq(matchups.id, matchup.id));
  }

  await recalculateStandings(db, { leagueId: params.leagueId, seasonId: params.seasonId });

  return { gameweekNumber: params.gameweek.number, matchupsFinalized: gameweekMatchups.length };
}

export async function finalizeGameweek(
  db: Db,
  params: { leagueId: string; requestedByUserId: string; gameweekNumber: number },
) {
  const league = await requireCommissioner(db, params.leagueId, params.requestedByUserId);

  const [gameweek] = await db
    .select()
    .from(gameweeks)
    .where(and(eq(gameweeks.seasonId, league.seasonId), eq(gameweeks.number, params.gameweekNumber)));
  if (!gameweek) throw new GameweekNotFoundError(`Gameweek ${params.gameweekNumber} not found`);

  return finalizeGameweekForLeague(db, { leagueId: params.leagueId, seasonId: league.seasonId, gameweek });
}

/**
 * Runs after each FPL sync so leagues don't depend on a commissioner
 * remembering to click "Finalize" every week. For every FPL-finished
 * gameweek that still has an unfinalized matchup somewhere, re-syncs that
 * gameweek's player stats one more time (bonus points are sometimes
 * confirmed by FPL after the gameweek is marked finished) and finalizes it
 * for every league that hasn't already been finalized for it. Gameweeks
 * where every league is already finalized are skipped entirely, so this
 * doesn't keep re-hitting the FPL API for old, fully-settled gameweeks.
 */
export async function autoFinalizeFinishedGameweeks(db: Db) {
  const finishedGameweeks = await db.select().from(gameweeks).where(eq(gameweeks.isFinished, true));

  let gameweeksFinalized = 0;
  let matchupsFinalized = 0;

  for (const gameweek of finishedGameweeks) {
    const unfinalized = await db
      .select({ leagueId: matchups.leagueId })
      .from(matchups)
      .where(and(eq(matchups.gameweekId, gameweek.id), or(isNull(matchups.userAScore), isNull(matchups.userBScore))));
    if (unfinalized.length === 0) continue;

    // Best-effort — a sync hiccup shouldn't block finalizing with whatever
    // stats we already have.
    await syncGameweekStats(db, gameweek.fplEventId).catch(() => null);

    const leagueIds = [...new Set(unfinalized.map((r) => r.leagueId))];
    for (const leagueId of leagueIds) {
      const result = await finalizeGameweekForLeague(db, { leagueId, seasonId: gameweek.seasonId, gameweek });
      matchupsFinalized += result.matchupsFinalized;
    }
    gameweeksFinalized++;
  }

  return { gameweeksChecked: finishedGameweeks.length, gameweeksFinalized, matchupsFinalized };
}

interface StandingLine {
  played: number;
  wins: number;
  ties: number;
  losses: number;
  points: number;
}

function emptyLine(): StandingLine {
  return { played: 0, wins: 0, ties: 0, losses: 0, points: 0 };
}

/**
 * Rebuilds the whole standings table from finalized matchup results, rather
 * than incrementing it — that keeps re-finalizing a gameweek (e.g. after a
 * stat correction) idempotent instead of double-counting.
 */
export async function recalculateStandings(db: Db, params: { leagueId: string; seasonId: string }) {
  const finalized = await db
    .select()
    .from(matchups)
    .where(
      and(
        eq(matchups.leagueId, params.leagueId),
        eq(matchups.seasonId, params.seasonId),
        isNotNull(matchups.userAScore),
        isNotNull(matchups.userBScore),
      ),
    );

  const lines = new Map<string, StandingLine>();
  const ensure = (userId: string) => {
    if (!lines.has(userId)) lines.set(userId, emptyLine());
    return lines.get(userId)!;
  };

  for (const matchup of finalized) {
    const a = ensure(matchup.userAId);
    const b = ensure(matchup.userBId);
    a.played++;
    b.played++;
    if (matchup.winnerId === null) {
      a.ties++;
      b.ties++;
      a.points += MATCH_POINTS.TIE;
      b.points += MATCH_POINTS.TIE;
    } else if (matchup.winnerId === matchup.userAId) {
      a.wins++;
      a.points += MATCH_POINTS.WIN;
      b.losses++;
      b.points += MATCH_POINTS.LOSS;
    } else {
      b.wins++;
      b.points += MATCH_POINTS.WIN;
      a.losses++;
      a.points += MATCH_POINTS.LOSS;
    }
  }

  const members = await db
    .select({ userId: leagueMemberships.userId })
    .from(leagueMemberships)
    .where(eq(leagueMemberships.leagueId, params.leagueId));
  for (const member of members) ensure(member.userId);

  for (const [userId, line] of lines) {
    await db
      .insert(standings)
      .values({ leagueId: params.leagueId, seasonId: params.seasonId, userId, ...line })
      .onConflictDoUpdate({
        target: [standings.leagueId, standings.seasonId, standings.userId],
        set: line,
      });
  }
}

export async function getStandings(db: Db, leagueId: string) {
  const [league] = await db.select().from(leagues).where(eq(leagues.id, leagueId));
  if (!league) throw new Error("League not found");

  return db
    .select({
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
    .where(and(eq(standings.leagueId, leagueId), eq(standings.seasonId, league.seasonId)))
    .orderBy(desc(standings.points), desc(standings.wins));
}

export async function getMatchupsForGameweek(db: Db, params: { leagueId: string; gameweekNumber: number }) {
  const [league] = await db.select().from(leagues).where(eq(leagues.id, params.leagueId));
  if (!league) throw new Error("League not found");

  const [gameweek] = await db
    .select()
    .from(gameweeks)
    .where(and(eq(gameweeks.seasonId, league.seasonId), eq(gameweeks.number, params.gameweekNumber)));
  if (!gameweek) return [];

  return db
    .select({
      id: matchups.id,
      userAId: matchups.userAId,
      userBId: matchups.userBId,
      userAScore: matchups.userAScore,
      userBScore: matchups.userBScore,
      winnerId: matchups.winnerId,
    })
    .from(matchups)
    .where(and(eq(matchups.leagueId, params.leagueId), eq(matchups.gameweekId, gameweek.id)));
}
