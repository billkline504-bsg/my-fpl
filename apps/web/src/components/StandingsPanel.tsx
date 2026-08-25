import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type League } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import { MatchupLineups } from "./MatchupLineups";

export function StandingsPanel({ league }: { league: League }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isCommissioner = user?.id === league.commissionerId;

  const [gameweekNumber, setGameweekNumber] = useState(1);
  const [expandedMatchupId, setExpandedMatchupId] = useState<string | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [finalizeError, setFinalizeError] = useState<string | null>(null);
  const [finalizeResult, setFinalizeResult] = useState<string | null>(null);

  const standingsQuery = useQuery({ queryKey: ["standings", league.id], queryFn: () => api.getStandings(league.id) });
  const membersQuery = useQuery({
    queryKey: ["league-members", league.id],
    queryFn: () => api.getLeagueMembers(league.id),
  });
  const matchupsQuery = useQuery({
    queryKey: ["matchups", league.id, gameweekNumber],
    queryFn: () => api.getMatchups(league.id, gameweekNumber),
  });

  function displayName(userId: string) {
    return membersQuery.data?.find((m) => m.userId === userId)?.displayName ?? userId.slice(0, 8);
  }

  const generateScheduleMutation = useMutation({
    mutationFn: () => api.generateSchedule(league.id),
    onSuccess: () => {
      setScheduleError(null);
      queryClient.invalidateQueries({ queryKey: ["matchups", league.id] });
      queryClient.invalidateQueries({ queryKey: ["standings", league.id] });
    },
    onError: (err) => setScheduleError(err instanceof Error ? err.message : "Failed to generate schedule"),
  });

  const finalizeMutation = useMutation({
    mutationFn: () => api.finalizeGameweek(league.id, gameweekNumber),
    onSuccess: () => {
      setFinalizeError(null);
      setFinalizeResult(`Finalized gameweek ${gameweekNumber}.`);
      queryClient.invalidateQueries({ queryKey: ["matchups", league.id, gameweekNumber] });
      queryClient.invalidateQueries({ queryKey: ["standings", league.id] });
    },
    onError: (err) => setFinalizeError(err instanceof Error ? err.message : "Failed to finalize gameweek"),
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-700">League table</h3>
          {isCommissioner && (
            <button
              onClick={() => generateScheduleMutation.mutate()}
              disabled={generateScheduleMutation.isPending}
              className="rounded bg-slate-900 px-3 py-1.5 text-xs text-white disabled:opacity-50"
            >
              Generate Schedule
            </button>
          )}
        </div>
        {scheduleError && <p className="mb-2 text-sm text-red-600">{scheduleError}</p>}
        {standingsQuery.isError && (
          <p className="mb-2 text-sm text-red-600">
            {standingsQuery.error instanceof Error ? standingsQuery.error.message : "Failed to load standings"}
          </p>
        )}
        <table className="w-full rounded-lg border border-slate-200 text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
              <th className="p-2">Manager</th>
              <th className="p-2">P</th>
              <th className="p-2">W</th>
              <th className="p-2">T</th>
              <th className="p-2">L</th>
              <th className="p-2">Pts</th>
            </tr>
          </thead>
          <tbody>
            {standingsQuery.data?.length === 0 && (
              <tr>
                <td colSpan={6} className="p-2 text-slate-500">
                  No standings yet — generate a schedule and finalize a gameweek.
                </td>
              </tr>
            )}
            {standingsQuery.data?.map((row) => (
              <tr key={row.userId} className="border-b border-slate-100 last:border-0">
                <td className="p-2 text-slate-900">{row.displayName}</td>
                <td className="p-2">{row.played}</td>
                <td className="p-2">{row.wins}</td>
                <td className="p-2">{row.ties}</td>
                <td className="p-2">{row.losses}</td>
                <td className="p-2 font-medium">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 rounded-lg border border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-700">Gameweek matchups</h3>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500">
              GW
              <input
                type="number"
                min={1}
                max={38}
                className="ml-1 w-16 rounded border border-slate-300 px-2 py-1 text-sm"
                value={gameweekNumber}
                onChange={(e) => setGameweekNumber(Number(e.target.value))}
              />
            </label>
            {isCommissioner && (
              <button
                onClick={() => finalizeMutation.mutate()}
                disabled={finalizeMutation.isPending}
                className="rounded bg-slate-900 px-3 py-1.5 text-xs text-white disabled:opacity-50"
              >
                Finalize GW{gameweekNumber}
              </button>
            )}
          </div>
        </div>
        {finalizeError && <p className="text-sm text-red-600">{finalizeError}</p>}
        {finalizeResult && <p className="text-sm text-green-700">{finalizeResult}</p>}
        {matchupsQuery.data?.length === 0 && (
          <p className="text-sm text-slate-500">No matchups scheduled for this gameweek.</p>
        )}
        <ul className="divide-y divide-slate-200">
          {matchupsQuery.data?.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => setExpandedMatchupId(expandedMatchupId === m.id ? null : m.id)}
                className="flex w-full items-center justify-between p-2 text-sm"
              >
                <span className={m.winnerId === m.userAId ? "font-semibold text-slate-900" : "text-slate-700"}>
                  {displayName(m.userAId)} {m.userAScore ?? "-"}
                </span>
                <span className="text-slate-400">vs</span>
                <span className={m.winnerId === m.userBId ? "font-semibold text-slate-900" : "text-slate-700"}>
                  {m.userBScore ?? "-"} {displayName(m.userBId)}
                </span>
              </button>
              {expandedMatchupId === m.id && (
                <MatchupLineups league={league} gameweekNumber={gameweekNumber} matchup={m} displayName={displayName} />
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
