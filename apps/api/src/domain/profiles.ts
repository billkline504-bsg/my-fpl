import { eq } from "drizzle-orm";
import { profiles, type Db } from "@my-fpl/db";
import { uploadIconFile } from "./icons.js";
import type { Storage } from "../plugins/storage.js";

export async function upsertProfile(db: Db, params: { id: string; displayName: string }) {
  const [profile] = await db
    .insert(profiles)
    .values({ id: params.id, displayName: params.displayName })
    .onConflictDoUpdate({
      target: profiles.id,
      set: { displayName: params.displayName },
    })
    .returning();

  return profile;
}

export async function getProfile(db: Db, id: string) {
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, id));
  return profile ?? null;
}

export async function setMyIcon(
  db: Db,
  storage: Storage,
  params: { userId: string; buffer: Buffer; mimeType: string },
) {
  const iconUrl = await uploadIconFile(storage, {
    path: `profiles/${params.userId}`,
    buffer: params.buffer,
    mimeType: params.mimeType,
  });

  const [profile] = await db.update(profiles).set({ iconUrl }).where(eq(profiles.id, params.userId)).returning();
  return profile;
}
