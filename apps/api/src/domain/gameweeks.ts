import { and, asc, eq } from "drizzle-orm";
import { gameweeks, type Db } from "@my-fpl/db";

/**
 * The gameweek transfers/results should be attributed to: the one FPL has
 * marked current, or — pre-season, before any gameweek has started — the
 * earliest unfinished one.
 */
export async function getCurrentOrNextGameweek(db: Db, seasonId: string) {
  const [current] = await db
    .select()
    .from(gameweeks)
    .where(and(eq(gameweeks.seasonId, seasonId), eq(gameweeks.isCurrent, true)));
  if (current) return current;

  const [next] = await db
    .select()
    .from(gameweeks)
    .where(and(eq(gameweeks.seasonId, seasonId), eq(gameweeks.isFinished, false)))
    .orderBy(asc(gameweeks.number))
    .limit(1);
  if (next) return next;

  throw new Error("No gameweeks found for this season — sync FPL data first");
}
