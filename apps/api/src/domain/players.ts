import { and, eq, ilike, or, type SQL } from "drizzle-orm";
import { clubs, players, type Db } from "@my-fpl/db";
import type { Position } from "@my-fpl/shared";

export async function listPlayers(db: Db, params: { search?: string; position?: Position }) {
  const conditions: SQL[] = [];
  if (params.search) {
    const pattern = `%${params.search}%`;
    conditions.push(
      or(
        ilike(players.webName, pattern),
        ilike(players.firstName, pattern),
        ilike(players.lastName, pattern),
      )!,
    );
  }
  if (params.position) {
    conditions.push(eq(players.position, params.position));
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
