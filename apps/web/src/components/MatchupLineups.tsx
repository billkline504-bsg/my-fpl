import { useQuery } from "@tanstack/react-query";
import { api, type GameweekLineup, type League, type LineupPlayer } from "../lib/api";

function LineupColumn({ name, lineup }: { name: string; lineup: GameweekLineup | undefined }) {
  return (
    <div className="flex-1">
      <p className="mb-1 text-xs font-medium text-slate-500">{name}</p>
      <div className="space-y-2">
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-wide text-slate-400">Starting XI</p>
          <ul className="space-y-0.5">
            {lineup?.starters.map((p) => (
              <PlayerRow key={p.playerId} player={p} />
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-wide text-slate-400">Bench</p>
          <ul className="space-y-0.5">
            {lineup?.bench.map((p) => (
              <PlayerRow key={p.playerId} player={p} />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function PlayerRow({ player }: { player: LineupPlayer }) {
  return (
    <li className="flex items-center justify-between text-xs text-slate-700">
      <span>
        {player.webName} <span className="text-slate-400">({player.position})</span>
      </span>
      <span className="font-medium">{player.points}</span>
    </li>
  );
}

export function MatchupLineups({
  league,
  gameweekNumber,
  matchup,
  displayName,
}: {
  league: League;
  gameweekNumber: number;
  matchup: { userAId: string; userBId: string };
  displayName: (userId: string) => string;
}) {
  const aQuery = useQuery({
    queryKey: ["lineup", league.id, gameweekNumber, matchup.userAId],
    queryFn: () => api.getTeamGameweekLineup(league.id, gameweekNumber, matchup.userAId),
  });
  const bQuery = useQuery({
    queryKey: ["lineup", league.id, gameweekNumber, matchup.userBId],
    queryFn: () => api.getTeamGameweekLineup(league.id, gameweekNumber, matchup.userBId),
  });

  if (aQuery.isLoading || bQuery.isLoading) {
    return <p className="p-2 text-sm text-slate-500">Loading lineups...</p>;
  }
  if (aQuery.isError || bQuery.isError) {
    return <p className="p-2 text-sm text-red-600">Failed to load lineups.</p>;
  }

  return (
    <div className="flex gap-6 border-t border-slate-100 p-2">
      <LineupColumn name={displayName(matchup.userAId)} lineup={aQuery.data} />
      <LineupColumn name={displayName(matchup.userBId)} lineup={bQuery.data} />
    </div>
  );
}
