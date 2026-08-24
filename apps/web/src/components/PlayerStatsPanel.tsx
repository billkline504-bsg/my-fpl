import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export function PlayerStatsPanel({ playerId, onClose }: { playerId: string; onClose: () => void }) {
  const statsQuery = useQuery({
    queryKey: ["player-stats", playerId],
    queryFn: () => api.getPlayerStats(playerId),
  });

  const stats = statsQuery.data;

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-700">
          {stats ? `${stats.player.webName} — season stats` : "Player stats"}
        </h3>
        <button className="text-xs text-slate-500 underline" onClick={onClose}>
          Close
        </button>
      </div>

      {statsQuery.isLoading && <p className="text-sm text-slate-500">Loading stats...</p>}
      {statsQuery.isError && (
        <p className="text-sm text-red-600">
          {statsQuery.error instanceof Error ? statsQuery.error.message : "Failed to load player stats"}
        </p>
      )}

      {stats && (
        <>
          <div className="grid grid-cols-3 gap-2 text-center sm:grid-cols-6">
            {(
              [
                ["Points", stats.totals.points],
                ["Apps", stats.totals.appearances],
                ["Mins", stats.totals.minutes],
                ["Goals", stats.totals.goals],
                ["Assists", stats.totals.assists],
                ["Clean sheets", stats.totals.cleanSheets],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="rounded bg-slate-50 p-2">
                <div className="text-lg font-semibold text-slate-900">{value}</div>
                <div className="text-xs text-slate-500">{label}</div>
              </div>
            ))}
          </div>

          {stats.gameweeks.length === 0 ? (
            <p className="text-sm text-slate-500">No gameweek stats yet this season.</p>
          ) : (
            <ul className="max-h-64 divide-y divide-slate-200 overflow-y-auto rounded border border-slate-200">
              {stats.gameweeks.map((gw) => (
                <li key={gw.gameweekNumber} className="flex items-center justify-between p-2 text-sm">
                  <span className="text-slate-700">GW{gw.gameweekNumber}</span>
                  <span className="text-slate-500">
                    {gw.minutes}' · {gw.goals}G {gw.assists}A
                  </span>
                  <span className="font-medium text-slate-900">{gw.points} pts</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
