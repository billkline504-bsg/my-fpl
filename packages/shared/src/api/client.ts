import type { Position } from "../types/domain.js";
import type {
  DraftEvent,
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
} from "./types.js";

export interface ApiClientConfig {
  apiUrl: string;
  getAccessToken: () => Promise<string | undefined>;
}

/**
 * Shared by both the web and mobile apps — this is the entire HTTP contract
 * with the Fastify API, parameterized only by where to find the API and how
 * to get the current Supabase access token (each platform's supabase-js
 * client differs in storage, not in shape).
 */
export function createApiClient(config: ApiClientConfig) {
  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const accessToken = await config.getAccessToken();

    const response = await fetch(`${config.apiUrl}${path}`, {
      ...init,
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...init?.headers,
      },
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? `Request to ${path} failed with ${response.status}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  return {
    listMyLeagues: () => request<League[]>("/leagues"),
    createLeague: (input: { name: string; seasonId?: string }) =>
      request<League>("/leagues", { method: "POST", body: JSON.stringify(input) }),
    joinLeague: (inviteCode: string) =>
      request<League>("/leagues/join", { method: "POST", body: JSON.stringify({ inviteCode }) }),
    getLeagueMembers: (leagueId: string) => request<LeagueMember[]>(`/leagues/${leagueId}/members`),
    upsertMyProfile: (input: { displayName: string }) =>
      request<Profile>("/profiles/me", { method: "PUT", body: JSON.stringify(input) }),
    listPlayers: (params: { search?: string; position?: Position }) => {
      const query = new URLSearchParams();
      if (params.search) query.set("search", params.search);
      if (params.position) query.set("position", params.position);
      const qs = query.toString();
      return request<Player[]>(`/players${qs ? `?${qs}` : ""}`);
    },
    syncFpl: () => request<FplSyncResult>("/fpl/sync", { method: "POST" }),
    getDraft: (leagueId: string) => request<DraftEvent | null>(`/leagues/${leagueId}/draft`),
    createDraft: (leagueId: string, input: { type: DraftType; pickCount: number }) =>
      request<DraftEvent>(`/leagues/${leagueId}/draft`, { method: "POST", body: JSON.stringify(input) }),
    startDraft: (leagueId: string, draftEventId: string) =>
      request<DraftEvent>(`/leagues/${leagueId}/draft/${draftEventId}/start`, { method: "POST" }),
    listAvailableDraftPlayers: (leagueId: string, params: { search?: string; position?: Position }) => {
      const query = new URLSearchParams();
      if (params.search) query.set("search", params.search);
      if (params.position) query.set("position", params.position);
      const qs = query.toString();
      return request<Player[]>(`/leagues/${leagueId}/draft/available-players${qs ? `?${qs}` : ""}`);
    },
    makeDraftPick: (leagueId: string, playerId: string) =>
      request<DraftEvent>(`/leagues/${leagueId}/draft/pick`, { method: "POST", body: JSON.stringify({ playerId }) }),
    getRoster: (leagueId: string) => request<RosterPlayer[]>(`/leagues/${leagueId}/roster`),
    getTransferWindow: (leagueId: string) => request<TransferWindow | null>(`/leagues/${leagueId}/transfer-window`),
    createTransferWindow: (
      leagueId: string,
      input: { opensAt: string; closesAt: string; postWindowDraftPickCount: number },
    ) =>
      request<TransferWindow>(`/leagues/${leagueId}/transfer-window`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    makeTransfer: (leagueId: string, input: { playerOutId: string; playerInId: string }) =>
      request(`/leagues/${leagueId}/transfers`, { method: "POST", body: JSON.stringify(input) }),
    generateSchedule: (leagueId: string) => request(`/leagues/${leagueId}/schedule`, { method: "POST" }),
    getStandings: (leagueId: string) => request<StandingRow[]>(`/leagues/${leagueId}/standings`),
    getMatchups: (leagueId: string, gameweek: number) =>
      request<Matchup[]>(`/leagues/${leagueId}/matchups?gameweek=${gameweek}`),
    finalizeGameweek: (leagueId: string, gameweekNumber: number) =>
      request(`/leagues/${leagueId}/gameweeks/${gameweekNumber}/finalize`, { method: "POST" }),
    getPlayerStats: (playerId: string) => request<PlayerSeasonStats>(`/players/${playerId}/stats`),
    getLeagueHistory: (leagueId: string) => request<LeagueHistoryRow[]>(`/leagues/${leagueId}/history`),
    startNextSeason: (leagueId: string, input: { label: string; startDate: string; endDate: string }) =>
      request<League>(`/leagues/${leagueId}/seasons`, { method: "POST", body: JSON.stringify(input) }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
