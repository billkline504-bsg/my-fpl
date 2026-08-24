import { and, eq, isNull } from "drizzle-orm";
import { leagues, players, rosterPlayers, transfers, transferWindows, type Db } from "@my-fpl/db";
import { PositionCapExceededError } from "./draft.js";
import { getCurrentOrNextGameweek } from "./gameweeks.js";
import { addPlayerToRoster, countActivePositions, ensureRoster, getOwnedPlayerIdsForLeagueSeason, removePlayerFromRoster, wouldExceedPositionCap } from "./rosters.js";

export class NotCommissionerError extends Error {}
export class TransferWindowExistsError extends Error {}
export class TransferWindowNotFoundError extends Error {}
export class TransferWindowClosedError extends Error {}
export class PlayerNotOnRosterError extends Error {}
export class PlayerAlreadyOwnedError extends Error {}

async function requireCommissioner(db: Db, leagueId: string, userId: string) {
  const [league] = await db.select().from(leagues).where(eq(leagues.id, leagueId));
  if (!league || league.commissionerId !== userId) {
    throw new NotCommissionerError("Only the league commissioner can do this");
  }
  return league;
}

export async function getTransferWindow(db: Db, leagueId: string) {
  const [league] = await db.select().from(leagues).where(eq(leagues.id, leagueId));
  if (!league) return null;

  const [window] = await db
    .select()
    .from(transferWindows)
    .where(and(eq(transferWindows.leagueId, leagueId), eq(transferWindows.seasonId, league.seasonId)));
  if (!window) return null;

  const now = new Date();
  const isOpen = now >= window.opensAt && now <= window.closesAt;
  return { ...window, isOpen };
}

export async function createTransferWindow(
  db: Db,
  params: {
    leagueId: string;
    requestedByUserId: string;
    opensAt: Date;
    closesAt: Date;
    postWindowDraftPickCount: number;
  },
) {
  const league = await requireCommissioner(db, params.leagueId, params.requestedByUserId);

  const [existing] = await db
    .select()
    .from(transferWindows)
    .where(and(eq(transferWindows.leagueId, params.leagueId), eq(transferWindows.seasonId, league.seasonId)));
  if (existing) {
    throw new TransferWindowExistsError("This league already has a transfer window configured");
  }

  const [window] = await db
    .insert(transferWindows)
    .values({
      leagueId: params.leagueId,
      seasonId: league.seasonId,
      opensAt: params.opensAt,
      closesAt: params.closesAt,
      postWindowDraftPickCount: params.postWindowDraftPickCount,
    })
    .returning();

  return window;
}

export async function makeTransfer(
  db: Db,
  params: { leagueId: string; userId: string; playerOutId: string; playerInId: string },
) {
  const league = await db.select().from(leagues).where(eq(leagues.id, params.leagueId)).then((rows) => rows[0]);
  if (!league) throw new Error("League not found");

  const window = await getTransferWindow(db, params.leagueId);
  if (!window) {
    throw new TransferWindowNotFoundError("No transfer window has been configured for this league");
  }
  if (!window.isOpen) {
    throw new TransferWindowClosedError("The transfer window is not currently open");
  }

  const [playerOut] = await db.select().from(players).where(eq(players.id, params.playerOutId));
  const [playerIn] = await db.select().from(players).where(eq(players.id, params.playerInId));
  if (!playerOut || !playerIn) throw new Error("Player not found");

  const ownedPlayerIds = await getOwnedPlayerIdsForLeagueSeason(db, params.leagueId, league.seasonId);
  if (ownedPlayerIds.includes(params.playerInId)) {
    throw new PlayerAlreadyOwnedError("This player is already owned by someone in this league");
  }

  const roster = await ensureRoster(db, { leagueId: params.leagueId, userId: params.userId, seasonId: league.seasonId });
  const [activeOut] = await db
    .select()
    .from(rosterPlayers)
    .where(
      and(eq(rosterPlayers.rosterId, roster.id), eq(rosterPlayers.playerId, params.playerOutId), isNull(rosterPlayers.removedAt)),
    );
  if (!activeOut) {
    throw new PlayerNotOnRosterError("You don't own that player");
  }

  // Validate the position cap before mutating anything: removing playerOut
  // only frees a slot in playerIn's position if they share a position.
  const positionCounts = await countActivePositions(db, {
    leagueId: params.leagueId,
    userId: params.userId,
    seasonId: league.seasonId,
  });
  const projectedCounts = { ...positionCounts };
  if (playerOut.position === playerIn.position) {
    projectedCounts[playerIn.position] -= 1;
  }
  if (wouldExceedPositionCap(projectedCounts, playerIn.position)) {
    throw new PositionCapExceededError(`You already have the maximum number of ${playerIn.position}s`);
  }

  await removePlayerFromRoster(db, {
    leagueId: params.leagueId,
    userId: params.userId,
    seasonId: league.seasonId,
    playerId: params.playerOutId,
  });

  await addPlayerToRoster(db, {
    leagueId: params.leagueId,
    userId: params.userId,
    seasonId: league.seasonId,
    playerId: params.playerInId,
    position: playerIn.position,
    addedVia: "transfer",
  });

  const gameweek = await getCurrentOrNextGameweek(db, league.seasonId);
  await db.insert(transfers).values({
    leagueId: params.leagueId,
    userId: params.userId,
    playerOutId: params.playerOutId,
    playerInId: params.playerInId,
    gameweekId: gameweek.id,
  });

  return { playerOut, playerIn };
}
