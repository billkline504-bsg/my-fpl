import { and, eq, ilike, inArray, notInArray, or, type SQL } from "drizzle-orm";
import { clubs, draftEvents, draftPicks, leagueMemberships, leagues, players, transferWindows, type Db } from "@my-fpl/db";
import { getSnakeDraftTurnUserId, type Position } from "@my-fpl/shared";
import { addPlayerToRoster, countActivePositions, getOwnedPlayerIdsForLeagueSeason, wouldExceedPositionCap } from "./rosters.js";

export class NotCommissionerError extends Error {}
export class DraftAlreadyActiveError extends Error {}
export class DraftNotFoundError extends Error {}
export class DraftNotPendingError extends Error {}
export class DraftNotInProgressError extends Error {}
export class NotYourTurnError extends Error {}
export class PlayerAlreadyDraftedError extends Error {}
export class PositionCapExceededError extends Error {}
export class NoLeagueMembersError extends Error {}
export class InitialDraftAlreadyExistsError extends Error {}
export class InitialDraftNotCompleteError extends Error {}
export class TransferWindowNotClosedError extends Error {}

async function requireCommissioner(db: Db, leagueId: string, userId: string) {
  const [league] = await db.select().from(leagues).where(eq(leagues.id, leagueId));
  if (!league || league.commissionerId !== userId) {
    throw new NotCommissionerError("Only the league commissioner can do this");
  }
  return league;
}

export async function createDraftEvent(
  db: Db,
  params: { leagueId: string; requestedByUserId: string; type: "initial" | "post_transfer"; pickCount: number },
) {
  const league = await requireCommissioner(db, params.leagueId, params.requestedByUserId);

  const [existing] = await db
    .select()
    .from(draftEvents)
    .where(and(eq(draftEvents.leagueId, params.leagueId), inArray(draftEvents.status, ["pending", "in_progress"])));
  if (existing) {
    throw new DraftAlreadyActiveError("This league already has a pending or in-progress draft");
  }

  if (params.type === "initial") {
    const [priorInitial] = await db
      .select()
      .from(draftEvents)
      .where(and(eq(draftEvents.leagueId, params.leagueId), eq(draftEvents.type, "initial")));
    if (priorInitial) {
      throw new InitialDraftAlreadyExistsError("This league already has an initial draft");
    }
  } else {
    const [completedInitial] = await db
      .select()
      .from(draftEvents)
      .where(
        and(
          eq(draftEvents.leagueId, params.leagueId),
          eq(draftEvents.type, "initial"),
          eq(draftEvents.status, "completed"),
        ),
      );
    if (!completedInitial) {
      throw new InitialDraftNotCompleteError("The initial draft must be completed first");
    }

    const [window] = await db
      .select()
      .from(transferWindows)
      .where(eq(transferWindows.leagueId, params.leagueId));
    if (!window || window.closesAt > new Date()) {
      throw new TransferWindowNotClosedError("The transfer window must close before the post-transfer draft can start");
    }
  }

  const [draftEvent] = await db
    .insert(draftEvents)
    .values({
      leagueId: params.leagueId,
      seasonId: league.seasonId,
      type: params.type,
      configuredPickCount: params.pickCount,
      status: "pending",
      pickOrder: [],
      currentPick: 0,
    })
    .returning();

  return draftEvent;
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

export async function startDraftEvent(
  db: Db,
  params: { leagueId: string; draftEventId: string; requestedByUserId: string },
) {
  await requireCommissioner(db, params.leagueId, params.requestedByUserId);

  const [draftEvent] = await db
    .select()
    .from(draftEvents)
    .where(and(eq(draftEvents.id, params.draftEventId), eq(draftEvents.leagueId, params.leagueId)));
  if (!draftEvent) throw new DraftNotFoundError("Draft not found");
  if (draftEvent.status !== "pending") throw new DraftNotPendingError("Draft has already been started");

  const members = await db
    .select({ userId: leagueMemberships.userId })
    .from(leagueMemberships)
    .where(eq(leagueMemberships.leagueId, params.leagueId));
  if (members.length === 0) throw new NoLeagueMembersError("League has no members to draft");

  const pickOrder = shuffle(members.map((m) => m.userId));

  const [updated] = await db
    .update(draftEvents)
    .set({ status: "in_progress", pickOrder, currentPick: 0, startedAt: new Date() })
    .where(eq(draftEvents.id, draftEvent.id))
    .returning();

  return updated;
}

export async function getDraftForLeague(db: Db, leagueId: string) {
  const active = await db
    .select()
    .from(draftEvents)
    .where(and(eq(draftEvents.leagueId, leagueId), inArray(draftEvents.status, ["pending", "in_progress"])));

  let draftEvent = active[0];
  if (!draftEvent) {
    const completed = await db
      .select()
      .from(draftEvents)
      .where(and(eq(draftEvents.leagueId, leagueId), eq(draftEvents.status, "completed")))
      .orderBy(draftEvents.completedAt)
      .limit(1);
    draftEvent = completed[0];
  }

  if (!draftEvent) return null;

  const pickRows = await db
    .select({
      id: draftPicks.id,
      pickNumber: draftPicks.pickNumber,
      userId: draftPicks.userId,
      draftedAt: draftPicks.draftedAt,
      playerId: players.id,
      playerWebName: players.webName,
      playerPosition: players.position,
      clubId: clubs.id,
      clubName: clubs.name,
      clubShortName: clubs.shortName,
    })
    .from(draftPicks)
    .innerJoin(players, eq(draftPicks.playerId, players.id))
    .innerJoin(clubs, eq(players.clubId, clubs.id))
    .where(eq(draftPicks.draftEventId, draftEvent.id))
    .orderBy(draftPicks.pickNumber);

  const picks = pickRows.map((r) => ({
    id: r.id,
    pickNumber: r.pickNumber,
    userId: r.userId,
    draftedAt: r.draftedAt,
    player: {
      id: r.playerId,
      webName: r.playerWebName,
      position: r.playerPosition,
      club: { id: r.clubId, name: r.clubName, shortName: r.clubShortName },
    },
  }));

  const totalPicks = draftEvent.pickOrder.length * draftEvent.configuredPickCount;
  const currentTurnUserId =
    draftEvent.status === "in_progress" ? getSnakeDraftTurnUserId(draftEvent.pickOrder, draftEvent.currentPick) : null;

  return { ...draftEvent, picks, totalPicks, currentTurnUserId };
}

export async function listAvailableDraftPlayers(
  db: Db,
  params: { leagueId: string; seasonId: string; search?: string; position?: Position },
) {
  const ownedPlayerIds = await getOwnedPlayerIdsForLeagueSeason(db, params.leagueId, params.seasonId);

  const conditions: SQL[] = [];
  if (ownedPlayerIds.length > 0) {
    conditions.push(notInArray(players.id, ownedPlayerIds));
  }
  if (params.position) {
    conditions.push(eq(players.position, params.position));
  }

  if (params.search) {
    const pattern = `%${params.search}%`;
    conditions.push(
      or(ilike(players.webName, pattern), ilike(players.firstName, pattern), ilike(players.lastName, pattern))!,
    );
  }

  return db
    .select({
      id: players.id,
      firstName: players.firstName,
      lastName: players.lastName,
      webName: players.webName,
      position: players.position,
      club: { id: clubs.id, name: clubs.name, shortName: clubs.shortName },
    })
    .from(players)
    .innerJoin(clubs, eq(players.clubId, clubs.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(players.webName)
    .limit(200);
}

export async function makeDraftPick(
  db: Db,
  params: { leagueId: string; userId: string; playerId: string },
) {
  const [draftEvent] = await db
    .select()
    .from(draftEvents)
    .where(and(eq(draftEvents.leagueId, params.leagueId), eq(draftEvents.status, "in_progress")));
  if (!draftEvent) throw new DraftNotInProgressError("No draft is currently in progress for this league");

  const currentTurnUserId = getSnakeDraftTurnUserId(draftEvent.pickOrder, draftEvent.currentPick);
  if (currentTurnUserId !== params.userId) {
    throw new NotYourTurnError("It is not your turn to pick");
  }

  const [player] = await db.select().from(players).where(eq(players.id, params.playerId));
  if (!player) throw new Error("Player not found");

  const ownedPlayerIds = await getOwnedPlayerIdsForLeagueSeason(db, params.leagueId, draftEvent.seasonId);
  if (ownedPlayerIds.includes(params.playerId)) {
    throw new PlayerAlreadyDraftedError("This player has already been drafted in this league");
  }

  const positionCounts = await countActivePositions(db, {
    leagueId: params.leagueId,
    userId: params.userId,
    seasonId: draftEvent.seasonId,
  });
  if (wouldExceedPositionCap(positionCounts, player.position)) {
    throw new PositionCapExceededError(`You already have the maximum number of ${player.position}s`);
  }

  const pickNumber = draftEvent.currentPick + 1;
  const nextCurrentPick = draftEvent.currentPick + 1;
  const totalPicks = draftEvent.pickOrder.length * draftEvent.configuredPickCount;
  const isComplete = nextCurrentPick >= totalPicks;

  await db.insert(draftPicks).values({
    draftEventId: draftEvent.id,
    userId: params.userId,
    playerId: params.playerId,
    pickNumber,
  });

  await addPlayerToRoster(db, {
    leagueId: params.leagueId,
    userId: params.userId,
    seasonId: draftEvent.seasonId,
    playerId: params.playerId,
    position: player.position,
    addedVia: "draft",
  });

  await db
    .update(draftEvents)
    .set({
      currentPick: nextCurrentPick,
      status: isComplete ? "completed" : "in_progress",
      completedAt: isComplete ? new Date() : null,
    })
    .where(eq(draftEvents.id, draftEvent.id));

  return getDraftForLeague(db, params.leagueId);
}
