import type { Position } from "../types/domain.js";
import type { CupFormat, CupStatus } from "../cups/types.js";

export interface League {
  id: string;
  name: string;
  commissionerId: string;
  seasonId: string;
  seasonLabel: string;
  maxUsers: number;
  inviteCode: string;
  iconUrl: string | null;
  createdAt: string;
}

export interface Season {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
}

export interface LeagueMember {
  userId: string;
  displayName: string;
  iconUrl: string | null;
  joinedAt: string;
}

export interface Profile {
  id: string;
  displayName: string;
  iconUrl: string | null;
}

export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  webName: string;
  position: Position;
  club: { id: string; name: string; shortName: string };
}

export interface FplSyncResult {
  clubs: number;
  players: number;
  gameweeks: number;
  stats: { gameweekNumber: number; playersUpdated: number } | null;
  finalized: { gameweeksFinalized: number; matchupsFinalized: number };
  cupsFinalized: { roundsFinalized: number; matchupsFinalized: number };
}

export type DraftType = "initial" | "post_transfer";
export type DraftStatus = "pending" | "in_progress" | "completed";

export interface DraftPick {
  id: string;
  pickNumber: number;
  userId: string;
  draftedAt: string;
  player: { id: string; webName: string; position: Position; club: { id: string; name: string; shortName: string } };
}

export interface DraftEvent {
  id: string;
  leagueId: string;
  seasonId: string;
  type: DraftType;
  configuredPickCount: number;
  status: DraftStatus;
  pickOrder: string[];
  currentPick: number;
  totalPicks: number;
  currentTurnUserId: string | null;
  picks: DraftPick[];
}

export interface RosterPlayer {
  id: string;
  addedVia: "draft" | "transfer";
  addedAt: string;
  player: { id: string; webName: string; position: Position; club: { id: string; name: string; shortName: string } };
}

export interface TransferWindow {
  id: string;
  leagueId: string;
  seasonId: string;
  opensAt: string;
  closesAt: string;
  postWindowDraftPickCount: number;
  isOpen: boolean;
}

export interface Matchup {
  id: string;
  userAId: string;
  userBId: string;
  userAScore: number | null;
  userBScore: number | null;
  winnerId: string | null;
}

export interface LineupPlayer {
  playerId: string;
  webName: string;
  position: Position;
  club: { id: string; name: string; shortName: string };
  points: number;
}

export interface GameweekLineup {
  starters: LineupPlayer[];
  bench: LineupPlayer[];
  totalPoints: number;
}

export interface StandingRow {
  userId: string;
  displayName: string;
  played: number;
  wins: number;
  ties: number;
  losses: number;
  points: number;
}

export interface PlayerGameweekStatLine {
  gameweekNumber: number;
  points: number;
  minutes: number;
  goals: number;
  assists: number;
  cleanSheets: number;
}

export interface PlayerSeasonStats {
  player: Pick<Player, "id" | "webName" | "position" | "club">;
  totals: {
    points: number;
    minutes: number;
    goals: number;
    assists: number;
    cleanSheets: number;
    appearances: number;
  };
  gameweeks: PlayerGameweekStatLine[];
}

export interface LeagueHistoryRow {
  seasonId: string;
  seasonLabel: string;
  userId: string;
  displayName: string;
  played: number;
  wins: number;
  ties: number;
  losses: number;
  points: number;
  totalPointsScored: number;
}

export interface CupEntrant {
  userId: string;
  losses: number;
  eliminatedAt: string | null;
}

export interface CupMatchup {
  id: string;
  roundNumber: number;
  gameweekNumber: number;
  userAId: string;
  userBId: string | null;
  userAScore: number | null;
  userBScore: number | null;
  winnerId: string | null;
  isBye: boolean;
}

export interface CupEvent {
  id: string;
  leagueId: string;
  seasonId: string;
  name: string;
  format: CupFormat;
  startingGameweekNumber: number;
  configuredRounds: number;
  status: CupStatus;
  iconUrl: string | null;
  createdAt: string;
  completedAt: string | null;
  entrants: CupEntrant[];
  matchups: CupMatchup[];
  champions: string[];
}
