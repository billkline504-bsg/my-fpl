import type { Position } from "../types/domain.js";

export interface League {
  id: string;
  name: string;
  commissionerId: string;
  seasonId: string;
  maxUsers: number;
  inviteCode: string;
  createdAt: string;
}

export interface LeagueMember {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  joinedAt: string;
}

export interface Profile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
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
