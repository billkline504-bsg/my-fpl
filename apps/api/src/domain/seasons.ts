import { desc } from "drizzle-orm";
import { seasons, type Db } from "@my-fpl/db";

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
