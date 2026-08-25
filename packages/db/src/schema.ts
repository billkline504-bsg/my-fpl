import {
  boolean,
  date,
  integer,
  jsonb,
  pgEnum,
  pgSchema,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

// Supabase's own `auth.users` table. We don't own or migrate this schema —
// it's declared here only so app tables can foreign-key against it.
const authSchema = pgSchema("auth");
export const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
  email: text("email"),
});

export const positionEnum = pgEnum("position", ["GK", "DEF", "MID", "FWD"]);
export const draftTypeEnum = pgEnum("draft_type", ["initial", "post_transfer"]);
export const draftStatusEnum = pgEnum("draft_status", ["pending", "in_progress", "completed"]);
export const addedViaEnum = pgEnum("added_via", ["draft", "transfer"]);

export const profiles = pgTable("profiles", {
  id: uuid("id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull(),
  iconUrl: text("icon_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const seasons = pgTable("seasons", {
  id: uuid("id").primaryKey().defaultRandom(),
  label: text("label").notNull().unique(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
});

export const gameweeks = pgTable(
  "gameweeks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    seasonId: uuid("season_id")
      .notNull()
      .references(() => seasons.id, { onDelete: "cascade" }),
    fplEventId: integer("fpl_event_id").notNull(),
    number: integer("number").notNull(),
    deadlineTime: timestamp("deadline_time", { withTimezone: true }).notNull(),
    isCurrent: boolean("is_current").notNull().default(false),
    isFinished: boolean("is_finished").notNull().default(false),
  },
  (t) => [unique().on(t.seasonId, t.number)],
);

export const clubs = pgTable("clubs", {
  id: uuid("id").primaryKey().defaultRandom(),
  fplId: integer("fpl_id").notNull().unique(),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
});

export const players = pgTable("players", {
  id: uuid("id").primaryKey().defaultRandom(),
  fplId: integer("fpl_id").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  webName: text("web_name").notNull(),
  clubId: uuid("club_id")
    .notNull()
    .references(() => clubs.id),
  position: positionEnum("position").notNull(),
});

export const playerGameweekStats = pgTable(
  "player_gameweek_stats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    gameweekId: uuid("gameweek_id")
      .notNull()
      .references(() => gameweeks.id, { onDelete: "cascade" }),
    points: integer("points").notNull().default(0),
    minutes: integer("minutes").notNull().default(0),
    goals: integer("goals").notNull().default(0),
    assists: integer("assists").notNull().default(0),
    cleanSheets: integer("clean_sheets").notNull().default(0),
  },
  (t) => [unique().on(t.playerId, t.gameweekId)],
);

export const leagues = pgTable("leagues", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  commissionerId: uuid("commissioner_id")
    .notNull()
    .references(() => profiles.id),
  seasonId: uuid("season_id")
    .notNull()
    .references(() => seasons.id),
  maxUsers: integer("max_users").notNull().default(8),
  inviteCode: text("invite_code").notNull().unique(),
  iconUrl: text("icon_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const leagueMemberships = pgTable(
  "league_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leagueId: uuid("league_id")
      .notNull()
      .references(() => leagues.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.leagueId, t.userId)],
);

export const draftEvents = pgTable("draft_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  leagueId: uuid("league_id")
    .notNull()
    .references(() => leagues.id, { onDelete: "cascade" }),
  seasonId: uuid("season_id")
    .notNull()
    .references(() => seasons.id),
  type: draftTypeEnum("type").notNull(),
  configuredPickCount: integer("configured_pick_count").notNull(),
  status: draftStatusEnum("status").notNull().default("pending"),
  pickOrder: jsonb("pick_order").$type<string[]>().notNull(),
  currentPick: integer("current_pick").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const draftPicks = pgTable(
  "draft_picks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    draftEventId: uuid("draft_event_id")
      .notNull()
      .references(() => draftEvents.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id),
    pickNumber: integer("pick_number").notNull(),
    draftedAt: timestamp("drafted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.draftEventId, t.pickNumber), unique().on(t.draftEventId, t.playerId)],
);

export const rosters = pgTable(
  "rosters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leagueId: uuid("league_id")
      .notNull()
      .references(() => leagues.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id),
    seasonId: uuid("season_id")
      .notNull()
      .references(() => seasons.id),
  },
  (t) => [unique().on(t.leagueId, t.userId, t.seasonId)],
);

export const rosterPlayers = pgTable("roster_players", {
  id: uuid("id").primaryKey().defaultRandom(),
  rosterId: uuid("roster_id")
    .notNull()
    .references(() => rosters.id, { onDelete: "cascade" }),
  playerId: uuid("player_id")
    .notNull()
    .references(() => players.id),
  position: positionEnum("position").notNull(),
  addedVia: addedViaEnum("added_via").notNull(),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  removedAt: timestamp("removed_at", { withTimezone: true }),
});

export const transferWindows = pgTable("transfer_windows", {
  id: uuid("id").primaryKey().defaultRandom(),
  leagueId: uuid("league_id")
    .notNull()
    .references(() => leagues.id, { onDelete: "cascade" }),
  seasonId: uuid("season_id")
    .notNull()
    .references(() => seasons.id),
  opensAt: timestamp("opens_at", { withTimezone: true }).notNull(),
  closesAt: timestamp("closes_at", { withTimezone: true }).notNull(),
  postWindowDraftPickCount: integer("post_window_draft_pick_count").notNull(),
});

export const transfers = pgTable("transfers", {
  id: uuid("id").primaryKey().defaultRandom(),
  leagueId: uuid("league_id")
    .notNull()
    .references(() => leagues.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id),
  playerOutId: uuid("player_out_id").references(() => players.id),
  playerInId: uuid("player_in_id")
    .notNull()
    .references(() => players.id),
  gameweekId: uuid("gameweek_id")
    .notNull()
    .references(() => gameweeks.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const matchups = pgTable("matchups", {
  id: uuid("id").primaryKey().defaultRandom(),
  leagueId: uuid("league_id")
    .notNull()
    .references(() => leagues.id, { onDelete: "cascade" }),
  seasonId: uuid("season_id")
    .notNull()
    .references(() => seasons.id),
  gameweekId: uuid("gameweek_id")
    .notNull()
    .references(() => gameweeks.id),
  userAId: uuid("user_a_id")
    .notNull()
    .references(() => profiles.id),
  userBId: uuid("user_b_id")
    .notNull()
    .references(() => profiles.id),
  userAScore: integer("user_a_score"),
  userBScore: integer("user_b_score"),
  winnerId: uuid("winner_id").references(() => profiles.id),
});

export const lineupSlotEnum = pgEnum("lineup_slot", ["starter", "bench"]);

export const gameweekLineups = pgTable(
  "gameweek_lineups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    rosterId: uuid("roster_id")
      .notNull()
      .references(() => rosters.id, { onDelete: "cascade" }),
    gameweekId: uuid("gameweek_id")
      .notNull()
      .references(() => gameweeks.id, { onDelete: "cascade" }),
    computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.rosterId, t.gameweekId)],
);

export const gameweekLineupPlayers = pgTable(
  "gameweek_lineup_players",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lineupId: uuid("lineup_id")
      .notNull()
      .references(() => gameweekLineups.id, { onDelete: "cascade" }),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id),
    position: positionEnum("position").notNull(),
    slot: lineupSlotEnum("slot").notNull(),
  },
  (t) => [unique().on(t.lineupId, t.playerId)],
);

export const standings = pgTable(
  "standings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leagueId: uuid("league_id")
      .notNull()
      .references(() => leagues.id, { onDelete: "cascade" }),
    seasonId: uuid("season_id")
      .notNull()
      .references(() => seasons.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id),
    played: integer("played").notNull().default(0),
    wins: integer("wins").notNull().default(0),
    ties: integer("ties").notNull().default(0),
    losses: integer("losses").notNull().default(0),
    points: integer("points").notNull().default(0),
  },
  (t) => [unique().on(t.leagueId, t.seasonId, t.userId)],
);

export const cupFormatEnum = pgEnum("cup_format", ["single", "double"]);
export const cupStatusEnum = pgEnum("cup_status", ["in_progress", "completed"]);

export const cupEvents = pgTable("cup_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  leagueId: uuid("league_id")
    .notNull()
    .references(() => leagues.id, { onDelete: "cascade" }),
  seasonId: uuid("season_id")
    .notNull()
    .references(() => seasons.id),
  name: text("name").notNull(),
  format: cupFormatEnum("format").notNull(),
  // A round always maps onto exactly one real gameweek; round N's gameweek
  // number is startingGameweekNumber + N - 1.
  startingGameweekNumber: integer("starting_gameweek_number").notNull(),
  configuredRounds: integer("configured_rounds").notNull(),
  status: cupStatusEnum("status").notNull().default("in_progress"),
  iconUrl: text("icon_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const cupEntrants = pgTable(
  "cup_entrants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cupEventId: uuid("cup_event_id")
      .notNull()
      .references(() => cupEvents.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id),
    losses: integer("losses").notNull().default(0),
    eliminatedAt: timestamp("eliminated_at", { withTimezone: true }),
  },
  (t) => [unique().on(t.cupEventId, t.userId)],
);

export const reminderTypeEnum = pgEnum("reminder_type", ["days_before", "hours_before"]);

export const gameweekReminders = pgTable(
  "gameweek_reminders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameweekId: uuid("gameweek_id")
      .notNull()
      .references(() => gameweeks.id, { onDelete: "cascade" }),
    type: reminderTypeEnum("type").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.gameweekId, t.type)],
);

export const cupMatchups = pgTable("cup_matchups", {
  id: uuid("id").primaryKey().defaultRandom(),
  cupEventId: uuid("cup_event_id")
    .notNull()
    .references(() => cupEvents.id, { onDelete: "cascade" }),
  roundNumber: integer("round_number").notNull(),
  gameweekId: uuid("gameweek_id")
    .notNull()
    .references(() => gameweeks.id),
  userAId: uuid("user_a_id")
    .notNull()
    .references(() => profiles.id),
  // null means userAId drew a bye this round — no opponent, auto-advances.
  userBId: uuid("user_b_id").references(() => profiles.id),
  userAScore: integer("user_a_score"),
  userBScore: integer("user_b_score"),
  winnerId: uuid("winner_id").references(() => profiles.id),
  isBye: boolean("is_bye").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
