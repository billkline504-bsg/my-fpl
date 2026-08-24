import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type Position } from "../lib/api";
import { PlayerStatsPanel } from "../components/PlayerStatsPanel";

const POSITIONS: Position[] = ["GK", "DEF", "MID", "FWD"];

export function PlayersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState<Position | "">("");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const playersQuery = useQuery({
    queryKey: ["players", search, position],
    queryFn: () => api.listPlayers({ search: search || undefined, position: position || undefined }),
  });

  const syncMutation = useMutation({
    mutationFn: api.syncFpl,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["players"] }),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Players</h2>
        <button
          className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
        >
          {syncMutation.isPending ? "Syncing..." : "Sync from FPL"}
        </button>
      </div>

      {syncMutation.isSuccess && (
        <p className="text-sm text-slate-500">
          Synced {syncMutation.data.clubs} clubs, {syncMutation.data.players} players,{" "}
          {syncMutation.data.gameweeks} gameweeks
          {syncMutation.data.stats
            ? ` · GW${syncMutation.data.stats.gameweekNumber} stats for ${syncMutation.data.stats.playersUpdated} players`
            : ""}
          .
        </p>
      )}
      {syncMutation.isError && (
        <p className="text-sm text-red-600">
          {syncMutation.error instanceof Error ? syncMutation.error.message : "Sync failed"}
        </p>
      )}

      <div className="flex gap-3">
        <input
          className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm"
          placeholder="Search players..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="rounded border border-slate-300 px-3 py-2 text-sm"
          value={position}
          onChange={(e) => setPosition(e.target.value as Position | "")}
        >
          <option value="">All positions</option>
          {POSITIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      {playersQuery.isLoading && <p className="text-sm text-slate-500">Loading players...</p>}
      {playersQuery.isError && (
        <p className="text-sm text-red-600">
          {playersQuery.error instanceof Error ? playersQuery.error.message : "Failed to load players"}
        </p>
      )}
      {playersQuery.data?.length === 0 && (
        <p className="text-sm text-slate-500">
          No players found. If this is the first run, click "Sync from FPL" above.
        </p>
      )}

      {selectedPlayerId && (
        <PlayerStatsPanel playerId={selectedPlayerId} onClose={() => setSelectedPlayerId(null)} />
      )}

      <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200">
        {playersQuery.data?.map((player) => (
          <li key={player.id}>
            <button
              className="flex w-full items-center justify-between p-3 text-left hover:bg-slate-50"
              onClick={() => setSelectedPlayerId(player.id)}
            >
              <span className="text-sm text-slate-900">{player.webName}</span>
              <span className="text-xs text-slate-500">
                {player.position} · {player.club.shortName}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
