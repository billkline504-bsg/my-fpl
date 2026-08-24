import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type League } from "../lib/api";
import { useAuth } from "../hooks/useAuth";

const NEW_SEASON_VALUE = "__new__";

export function HistoryPanel({
  league,
  onLeagueUpdated,
}: {
  league: League;
  onLeagueUpdated?: (league: League) => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isCommissioner = user?.id === league.commissionerId;

  const [selectedSeasonId, setSelectedSeasonId] = useState(NEW_SEASON_VALUE);
  const [label, setLabel] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [seasonError, setSeasonError] = useState<string | null>(null);

  const historyQuery = useQuery({ queryKey: ["league-history", league.id], queryFn: () => api.getLeagueHistory(league.id) });
  const seasonsQuery = useQuery({ queryKey: ["seasons"], queryFn: api.listSeasons });

  const isCreatingNewSeason = selectedSeasonId === NEW_SEASON_VALUE;

  const switchSeasonMutation = useMutation({
    mutationFn: () => {
      const target = seasonsQuery.data?.find((s) => s.id === selectedSeasonId);
      return api.startNextSeason(league.id, {
        label: target?.label ?? label,
        startDate: target?.startDate ?? startDate,
        endDate: target?.endDate ?? endDate,
      });
    },
    onSuccess: (updated) => {
      setSeasonError(null);
      setLabel("");
      setStartDate("");
      setEndDate("");
      setSelectedSeasonId(NEW_SEASON_VALUE);
      onLeagueUpdated?.(updated);
      queryClient.invalidateQueries({ queryKey: ["leagues"] });
      queryClient.invalidateQueries({ queryKey: ["seasons"] });
      queryClient.invalidateQueries({ queryKey: ["league-history", league.id] });
      queryClient.invalidateQueries({ queryKey: ["standings", league.id] });
      queryClient.invalidateQueries({ queryKey: ["roster", league.id] });
      queryClient.invalidateQueries({ queryKey: ["draft", league.id] });
      queryClient.invalidateQueries({ queryKey: ["transfer-window", league.id] });
      queryClient.invalidateQueries({ queryKey: ["cups", league.id] });
    },
    onError: (err) => setSeasonError(err instanceof Error ? err.message : "Failed to switch season"),
  });

  const seasons = new Map<string, { seasonLabel: string; rows: typeof historyQuery.data }>();
  for (const row of historyQuery.data ?? []) {
    const existing = seasons.get(row.seasonId);
    if (existing) {
      existing.rows!.push(row);
    } else {
      seasons.set(row.seasonId, { seasonLabel: row.seasonLabel, rows: [row] });
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-lg border border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-700">
            Current season: <span className="font-normal text-slate-500">{league.seasonLabel}</span>
          </h3>
        </div>
        {isCommissioner && (
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              switchSeasonMutation.mutate();
            }}
          >
            <div className="flex flex-wrap gap-3">
              <label className="text-xs text-slate-500">
                Switch to
                <select
                  className="mt-1 block rounded border border-slate-300 px-2 py-1 text-sm"
                  value={selectedSeasonId}
                  onChange={(e) => setSelectedSeasonId(e.target.value)}
                >
                  <option value={NEW_SEASON_VALUE}>+ Create new season</option>
                  {seasonsQuery.data
                    ?.filter((s) => s.id !== league.seasonId)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                </select>
              </label>
              {isCreatingNewSeason && (
                <>
                  <label className="text-xs text-slate-500">
                    New season label
                    <input
                      type="text"
                      placeholder="2028/29"
                      className="mt-1 block w-28 rounded border border-slate-300 px-2 py-1 text-sm"
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      required
                    />
                  </label>
                  <label className="text-xs text-slate-500">
                    Start date
                    <input
                      type="date"
                      className="mt-1 block rounded border border-slate-300 px-2 py-1 text-sm"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </label>
                  <label className="text-xs text-slate-500">
                    End date
                    <input
                      type="date"
                      className="mt-1 block rounded border border-slate-300 px-2 py-1 text-sm"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                    />
                  </label>
                </>
              )}
            </div>
            {seasonError && <p className="text-sm text-red-600">{seasonError}</p>}
            <button
              type="submit"
              disabled={switchSeasonMutation.isPending}
              className="rounded bg-slate-900 px-3 py-1.5 text-xs text-white disabled:opacity-50"
            >
              {isCreatingNewSeason ? "Start new season" : "Switch season"}
            </button>
          </form>
        )}
      </div>

      {historyQuery.isLoading && <p className="text-sm text-slate-500">Loading history...</p>}
      {historyQuery.isError && (
        <p className="text-sm text-red-600">
          {historyQuery.error instanceof Error ? historyQuery.error.message : "Failed to load season history"}
        </p>
      )}
      {historyQuery.data?.length === 0 && (
        <p className="text-sm text-slate-500">No season history yet — finalize a gameweek to get started.</p>
      )}
      {[...seasons.entries()].map(([seasonId, { seasonLabel, rows }]) => (
        <div key={seasonId}>
          <h3 className="mb-2 text-sm font-medium text-slate-700">{seasonLabel}</h3>
          <table className="w-full rounded-lg border border-slate-200 text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="p-2">Manager</th>
                <th className="p-2">P</th>
                <th className="p-2">W</th>
                <th className="p-2">T</th>
                <th className="p-2">L</th>
                <th className="p-2">Pts</th>
                <th className="p-2">Total scored</th>
              </tr>
            </thead>
            <tbody>
              {rows?.map((row) => (
                <tr key={row.userId} className="border-b border-slate-100 last:border-0">
                  <td className="p-2 text-slate-900">{row.displayName}</td>
                  <td className="p-2">{row.played}</td>
                  <td className="p-2">{row.wins}</td>
                  <td className="p-2">{row.ties}</td>
                  <td className="p-2">{row.losses}</td>
                  <td className="p-2 font-medium">{row.points}</td>
                  <td className="p-2">{row.totalPointsScored}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
