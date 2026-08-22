import { eq } from "drizzle-orm";
import { clubs, gameweeks, playerGameweekStats, players, type Db } from "@my-fpl/db";
import { FPL_ELEMENT_TYPE_TO_POSITION, type FplBootstrapStatic, type FplEventLive } from "@my-fpl/shared";
import { getOrCreateDefaultSeason } from "./seasons.js";

const FPL_API_BASE = "https://fantasy.premierleague.com/api";

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${FPL_API_BASE}${path}`);
  if (!response.ok) {
    throw new Error(`FPL API request to ${path} failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function syncClubsAndPlayers(db: Db) {
  const data = await fetchJson<FplBootstrapStatic>("/bootstrap-static/");
  const season = await getOrCreateDefaultSeason(db);

  for (const team of data.teams) {
    await db
      .insert(clubs)
      .values({ fplId: team.id, name: team.name, shortName: team.short_name })
      .onConflictDoUpdate({
        target: clubs.fplId,
        set: { name: team.name, shortName: team.short_name },
      });
  }

  const clubRows = await db.select().from(clubs);
  const clubIdByFplId = new Map(clubRows.map((c) => [c.fplId, c.id]));

  let skippedPlayers = 0;
  for (const element of data.elements) {
    const clubId = clubIdByFplId.get(element.team);
    if (!clubId) {
      skippedPlayers++;
      continue;
    }

    const values = {
      fplId: element.id,
      firstName: element.first_name,
      lastName: element.second_name,
      webName: element.web_name,
      clubId,
      position: FPL_ELEMENT_TYPE_TO_POSITION[element.element_type],
    };
    await db.insert(players).values(values).onConflictDoUpdate({ target: players.fplId, set: values });
  }

  for (const event of data.events) {
    const values = {
      seasonId: season.id,
      fplEventId: event.id,
      number: event.id,
      deadlineTime: new Date(event.deadline_time),
      isCurrent: event.is_current,
      isFinished: event.finished,
    };
    await db
      .insert(gameweeks)
      .values(values)
      .onConflictDoUpdate({ target: [gameweeks.seasonId, gameweeks.number], set: values });
  }

  return { clubs: data.teams.length, players: data.elements.length - skippedPlayers, gameweeks: data.events.length };
}

export async function syncGameweekStats(db: Db, fplEventId: number) {
  const [gameweek] = await db.select().from(gameweeks).where(eq(gameweeks.fplEventId, fplEventId));
  if (!gameweek) {
    throw new Error(`Gameweek with FPL event id ${fplEventId} not found — sync clubs/players first`);
  }

  const data = await fetchJson<FplEventLive>(`/event/${fplEventId}/live/`);
  const playerRows = await db.select().from(players);
  const playerIdByFplId = new Map(playerRows.map((p) => [p.fplId, p.id]));

  let updated = 0;
  for (const element of data.elements) {
    const playerId = playerIdByFplId.get(element.id);
    if (!playerId) continue;

    const values = {
      playerId,
      gameweekId: gameweek.id,
      points: element.stats.total_points,
      minutes: element.stats.minutes,
      goals: element.stats.goals_scored,
      assists: element.stats.assists,
      cleanSheets: element.stats.clean_sheets,
    };
    await db
      .insert(playerGameweekStats)
      .values(values)
      .onConflictDoUpdate({ target: [playerGameweekStats.playerId, playerGameweekStats.gameweekId], set: values });
    updated++;
  }

  return { gameweekNumber: gameweek.number, playersUpdated: updated };
}

export async function syncAll(db: Db) {
  const summary = await syncClubsAndPlayers(db);

  const [currentGameweek] = await db.select().from(gameweeks).where(eq(gameweeks.isCurrent, true));
  const stats = currentGameweek ? await syncGameweekStats(db, currentGameweek.fplEventId) : null;

  return { ...summary, stats };
}
