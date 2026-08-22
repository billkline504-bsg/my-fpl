import { eq } from "drizzle-orm";
import { profiles, type Db } from "@my-fpl/db";

export async function upsertProfile(db: Db, params: { id: string; displayName: string; avatarUrl?: string }) {
  const [profile] = await db
    .insert(profiles)
    .values({ id: params.id, displayName: params.displayName, avatarUrl: params.avatarUrl })
    .onConflictDoUpdate({
      target: profiles.id,
      set: { displayName: params.displayName, avatarUrl: params.avatarUrl },
    })
    .returning();

  return profile;
}

export async function getProfile(db: Db, id: string) {
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, id));
  return profile ?? null;
}
