import { createApiClient } from "@my-fpl/shared";
import { supabase } from "./supabase";

const apiUrl = import.meta.env.VITE_API_URL as string;

if (!apiUrl) {
  throw new Error("VITE_API_URL must be set (see .env.example)");
}

export const api = createApiClient({
  apiUrl,
  getAccessToken: async () => (await supabase.auth.getSession()).data.session?.access_token,
});

export type { Position } from "@my-fpl/shared";
export type {
  DraftEvent,
  DraftPick,
  DraftStatus,
  DraftType,
  FplSyncResult,
  League,
  LeagueHistoryRow,
  LeagueMember,
  Matchup,
  Player,
  PlayerSeasonStats,
  Profile,
  RosterPlayer,
  StandingRow,
  TransferWindow,
} from "@my-fpl/shared";
