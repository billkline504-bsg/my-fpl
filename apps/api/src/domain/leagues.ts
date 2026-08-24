import { customAlphabet } from "nanoid";
import { eq, and, count } from "drizzle-orm";
import { leagues, leagueMemberships, profiles, seasons, type Db } from "@my-fpl/db";

const generateInviteCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);

export class LeagueNotFoundError extends Error {}
export class LeagueFullError extends Error {}
export class AlreadyMemberError extends Error {}
export class ProfileRequiredError extends Error {}

async function requireProfile(db: Db, userId: string) {
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, userId));
  if (!profile) {
    throw new ProfileRequiredError("Set up your profile before creating or joining a league");
  }
}

export async function createLeague(db: Db, params: { commissionerId: string; name: string; seasonId: string }) {
  await requireProfile(db, params.commissionerId);

  const [league] = await db
    .insert(leagues)
    .values({
      name: params.name,
      commissionerId: params.commissionerId,
      seasonId: params.seasonId,
      inviteCode: generateInviteCode(),
    })
    .returning();

  if (!league) {
    throw new Error("Failed to create league");
  }

  await db.insert(leagueMemberships).values({
    leagueId: league.id,
    userId: params.commissionerId,
  });

  const [season] = await db.select().from(seasons).where(eq(seasons.id, league.seasonId));
  return { ...league, seasonLabel: season?.label ?? "Unknown season" };
}

export async function joinLeagueByInviteCode(db: Db, params: { userId: string; inviteCode: string }) {
  await requireProfile(db, params.userId);

  const [league] = await db.select().from(leagues).where(eq(leagues.inviteCode, params.inviteCode));
  if (!league) {
    throw new LeagueNotFoundError(`No league with invite code ${params.inviteCode}`);
  }

  const [existingMembership] = await db
    .select()
    .from(leagueMemberships)
    .where(and(eq(leagueMemberships.leagueId, league.id), eq(leagueMemberships.userId, params.userId)));
  if (existingMembership) {
    throw new AlreadyMemberError("Already a member of this league");
  }

  const [memberCountRow] = await db
    .select({ memberCount: count() })
    .from(leagueMemberships)
    .where(eq(leagueMemberships.leagueId, league.id));
  const memberCount = memberCountRow?.memberCount ?? 0;
  if (memberCount >= league.maxUsers) {
    throw new LeagueFullError(`League is full (max ${league.maxUsers} users)`);
  }

  await db.insert(leagueMemberships).values({ leagueId: league.id, userId: params.userId });

  return league;
}

export async function listMyLeagues(db: Db, userId: string) {
  return db
    .select({
      id: leagues.id,
      name: leagues.name,
      commissionerId: leagues.commissionerId,
      seasonId: leagues.seasonId,
      seasonLabel: seasons.label,
      maxUsers: leagues.maxUsers,
      inviteCode: leagues.inviteCode,
      createdAt: leagues.createdAt,
    })
    .from(leagueMemberships)
    .innerJoin(leagues, eq(leagueMemberships.leagueId, leagues.id))
    .innerJoin(seasons, eq(leagues.seasonId, seasons.id))
    .where(eq(leagueMemberships.userId, userId));
}

export async function getLeagueMembers(db: Db, leagueId: string) {
  return db
    .select({
      userId: profiles.id,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      joinedAt: leagueMemberships.joinedAt,
    })
    .from(leagueMemberships)
    .innerJoin(profiles, eq(leagueMemberships.userId, profiles.id))
    .where(eq(leagueMemberships.leagueId, leagueId));
}
