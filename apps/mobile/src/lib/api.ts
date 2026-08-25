import { createApiClient } from "@my-fpl/shared";
import { supabase } from "./supabase";

const apiUrl = process.env.EXPO_PUBLIC_API_URL;

if (!apiUrl) {
  throw new Error("EXPO_PUBLIC_API_URL must be set (see .env.example)");
}

export const api = createApiClient({
  apiUrl,
  getAccessToken: async () => (await supabase.auth.getSession()).data.session?.access_token,
});

export type {
  CupEntrant,
  CupEvent,
  CupFormat,
  CupMatchup,
  CupStatus,
  DraftEvent,
  DraftPick,
  DraftStatus,
  DraftType,
  FplSyncResult,
  GameweekLineup,
  League,
  LeagueHistoryRow,
  LeagueMember,
  LineupPlayer,
  Matchup,
  Player,
  PlayerSeasonStats,
  Position,
  Profile,
  RosterPlayer,
  Season,
  StandingRow,
  TransferWindow,
} from "@my-fpl/shared";
export { getRecommendedCupRounds } from "@my-fpl/shared";
