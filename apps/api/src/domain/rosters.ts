import { and, eq, isNull } from "drizzle-orm";
import { clubs, players, rosterPlayers, rosters, type Db } from "@my-fpl/db";
import { SQUAD_POSITION_REQUIREMENTS, type Position } from "@my-fpl/shared";

export async function ensureRoster(db: Db, params: { leagueId: string; userId: string; seasonId: string }) {
  const [existing] = await db
    .select()
    .from(rosters)
    .where(
      and(eq(rosters.leagueId, params.leagueId), eq(rosters.userId, params.userId), eq(rosters.seasonId, params.seasonId)),
    );
  if (existing) return existing;

  const [created] = await db
    .insert(rosters)
    .values({ leagueId: params.leagueId, userId: params.userId, seasonId: params.seasonId })
    .returning();
  if (!created) throw new Error("Failed to create roster");
  return created;
}

/** Every player currently owned (active, non-removed) by anyone in this league/season. */
export async function getOwnedPlayerIdsForLeagueSeason(db: Db, leagueId: string, seasonId: string) {
  const rows = await db
    .select({ playerId: rosterPlayers.playerId })
    .from(rosterPlayers)
    .innerJoin(rosters, eq(rosterPlayers.rosterId, rosters.id))
    .where(and(eq(rosters.leagueId, leagueId), eq(rosters.seasonId, seasonId), isNull(rosterPlayers.removedAt)));
  return rows.map((r) => r.playerId);
}

export async function countActivePositions(
  db: Db,
  params: { leagueId: string; userId: string; seasonId: string },
): Promise<Record<Position, number>> {
  const roster = await ensureRoster(db, params);
  const rows = await db
    .select({ position: rosterPlayers.position })
    .from(rosterPlayers)
    .where(and(eq(rosterPlayers.rosterId, roster.id), isNull(rosterPlayers.removedAt)));

  const counts: Record<Position, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
  for (const row of rows) counts[row.position]++;
  return counts;
}

export function wouldExceedPositionCap(counts: Record<Position, number>, position: Position) {
  return counts[position] >= SQUAD_POSITION_REQUIREMENTS[position];
}

export async function addPlayerToRoster(
  db: Db,
  params: {
    leagueId: string;
    userId: string;
    seasonId: string;
    playerId: string;
    position: Position;
    addedVia: "draft" | "transfer";
  },
) {
  const roster = await ensureRoster(db, params);
  await db.insert(rosterPlayers).values({
    rosterId: roster.id,
    playerId: params.playerId,
    position: params.position,
    addedVia: params.addedVia,
  });
}

export async function removePlayerFromRoster(
  db: Db,
  params: { leagueId: string; userId: string; seasonId: string; playerId: string },
) {
  const roster = await ensureRoster(db, params);
  const [active] = await db
    .select()
    .from(rosterPlayers)
    .where(
      and(eq(rosterPlayers.rosterId, roster.id), eq(rosterPlayers.playerId, params.playerId), isNull(rosterPlayers.removedAt)),
    );
  if (!active) return null;

  await db.update(rosterPlayers).set({ removedAt: new Date() }).where(eq(rosterPlayers.id, active.id));
  return active;
}

export async function getActiveRosterPlayers(
  db: Db,
  params: { leagueId: string; userId: string; seasonId: string },
) {
  const roster = await ensureRoster(db, params);
  const rows = await db
    .select({
      id: rosterPlayers.id,
      addedVia: rosterPlayers.addedVia,
      addedAt: rosterPlayers.addedAt,
      playerId: players.id,
      webName: players.webName,
      position: players.position,
      clubId: clubs.id,
      clubName: clubs.name,
      clubShortName: clubs.shortName,
    })
    .from(rosterPlayers)
    .innerJoin(players, eq(rosterPlayers.playerId, players.id))
    .innerJoin(clubs, eq(players.clubId, clubs.id))
    .where(and(eq(rosterPlayers.rosterId, roster.id), isNull(rosterPlayers.removedAt)));

  return rows.map((r) => ({
    id: r.id,
    addedVia: r.addedVia,
    addedAt: r.addedAt,
    player: {
      id: r.playerId,
      webName: r.webName,
      position: r.position,
      club: { id: r.clubId, name: r.clubName, shortName: r.clubShortName },
    },
  }));
}
