import { useQuery } from "@tanstack/react-query";
import { api, type League } from "../lib/api";

export function HistoryPanel({ league }: { league: League }) {
  const historyQuery = useQuery({ queryKey: ["league-history", league.id], queryFn: () => api.getLeagueHistory(league.id) });

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
      {historyQuery.isLoading && <p className="text-sm text-slate-500">Loading history...</p>}
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
