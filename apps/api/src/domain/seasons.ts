import { desc, eq } from "drizzle-orm";
import { leagues, seasons, type Db } from "@my-fpl/db";

export class NotCommissionerError extends Error {}
export class SeasonAlreadyActiveError extends Error {}

/**
 * Phase 2 (FPL sync) will populate real seasons from the FPL API. Until
 * then, league creation needs *some* season to attach to, so we lazily
 * create a single placeholder season on first use.
 */
export async function getOrCreateDefaultSeason(db: Db) {
  const [existing] = await db.select().from(seasons).orderBy(desc(seasons.startDate)).limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(seasons)
    .values({
      label: "2026/27",
      startDate: "2026-08-01",
      endDate: "2027-05-31",
    })
    .returning();

  if (!created) {
    throw new Error("Failed to create default season");
  }

  return created;
}

/**
 * Moves a league onto a new (or existing, by label) season. Historical data
 * — standings, matchups, rosters, draft events, transfer windows — all carry
 * their own `seasonId` already, so nothing needs to be reset or migrated;
 * they simply stop being "current" once `leagues.seasonId` points elsewhere.
 */
export async function startNextSeasonForLeague(
  db: Db,
  params: { leagueId: string; requestedByUserId: string; label: string; startDate: string; endDate: string },
) {
  const [league] = await db.select().from(leagues).where(eq(leagues.id, params.leagueId));
  if (!league || league.commissionerId !== params.requestedByUserId) {
    throw new NotCommissionerError("Only the league commissioner can do this");
  }

  const [existingSeason] = await db.select().from(seasons).where(eq(seasons.label, params.label));

  let season = existingSeason;
  if (!season) {
    const [created] = await db
      .insert(seasons)
      .values({ label: params.label, startDate: params.startDate, endDate: params.endDate })
      .returning();
    if (!created) throw new Error("Failed to create season");
    season = created;
  }

  if (season.id === league.seasonId) {
    throw new SeasonAlreadyActiveError("This league is already on that season");
  }

  const [updated] = await db
    .update(leagues)
    .set({ seasonId: season.id })
    .where(eq(leagues.id, league.id))
    .returning();
  if (!updated) throw new Error("Failed to start new season");

  return { ...updated, seasonLabel: season.label };
}
