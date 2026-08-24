import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, getRecommendedCupRounds, type CupEvent, type CupFormat, type League } from "../lib/api";
import { useAuth } from "../hooks/useAuth";

function CupBracket({ cup, displayName }: { cup: CupEvent; displayName: (userId: string) => string }) {
  const rounds = new Map<number, typeof cup.matchups>();
  for (const m of cup.matchups) {
    const existing = rounds.get(m.roundNumber);
    if (existing) existing.push(m);
    else rounds.set(m.roundNumber, [m]);
  }

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-700">
          {cup.name} <span className="text-xs text-slate-500">({cup.format} elimination)</span>
        </h3>
        <span className={`text-xs font-medium ${cup.status === "completed" ? "text-green-700" : "text-slate-500"}`}>
          {cup.status === "completed"
            ? `Champion${cup.champions.length > 1 ? "s" : ""}: ${cup.champions.map(displayName).join(", ")}`
            : `In progress`}
        </span>
      </div>

      {[...rounds.entries()].map(([roundNumber, matchups]) => (
        <div key={roundNumber}>
          <h4 className="mb-1 text-xs font-medium text-slate-500">
            Round {roundNumber} (GW{cup.startingGameweekNumber + roundNumber - 1})
          </h4>
          <ul className="divide-y divide-slate-200 rounded border border-slate-200">
            {matchups.map((m) => (
              <li key={m.id} className="flex items-center justify-between p-2 text-sm">
                <span className={m.winnerId === m.userAId ? "font-semibold text-slate-900" : "text-slate-700"}>
                  {displayName(m.userAId)} {m.userAScore ?? ""}
                </span>
                {m.isBye ? (
                  <span className="text-xs text-slate-400">BYE</span>
                ) : (
                  <>
                    <span className="text-slate-400">vs</span>
                    <span className={m.winnerId === m.userBId ? "font-semibold text-slate-900" : "text-slate-700"}>
                      {m.userBScore ?? ""} {displayName(m.userBId!)}
                    </span>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function CupsPanel({ league }: { league: League }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isCommissioner = user?.id === league.commissionerId;

  const [name, setName] = useState("");
  const [format, setFormat] = useState<CupFormat>("single");
  const [startingGameweekNumber, setStartingGameweekNumber] = useState(1);
  const [rounds, setRounds] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const cupsQuery = useQuery({ queryKey: ["cups", league.id], queryFn: () => api.listCups(league.id) });
  const membersQuery = useQuery({
    queryKey: ["league-members", league.id],
    queryFn: () => api.getLeagueMembers(league.id),
  });

  function displayName(userId: string) {
    return membersQuery.data?.find((m) => m.userId === userId)?.displayName ?? userId.slice(0, 8);
  }

  const hasActiveCup = cupsQuery.data?.some((c) => c.status === "in_progress") ?? false;
  const recommendedRounds = getRecommendedCupRounds(format, membersQuery.data?.length ?? 0);

  const createCupMutation = useMutation({
    mutationFn: () =>
      api.createCup(league.id, {
        name,
        format,
        startingGameweekNumber,
        configuredRounds: rounds ? Number(rounds) : undefined,
      }),
    onSuccess: () => {
      setCreateError(null);
      setName("");
      setRounds("");
      queryClient.invalidateQueries({ queryKey: ["cups", league.id] });
    },
    onError: (err) => setCreateError(err instanceof Error ? err.message : "Failed to create cup"),
  });

  return (
    <div className="space-y-6">
      {isCommissioner && !hasActiveCup && (
        <form
          className="space-y-3 rounded-lg border border-slate-200 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            createCupMutation.mutate();
          }}
        >
          <h3 className="text-sm font-medium text-slate-700">Start a cup competition</h3>
          <div className="flex flex-wrap gap-3">
            <label className="text-xs text-slate-500">
              Name
              <input
                type="text"
                placeholder="MyFACup"
                className="mt-1 block w-32 rounded border border-slate-300 px-2 py-1 text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
            <label className="text-xs text-slate-500">
              Format
              <select
                className="mt-1 block rounded border border-slate-300 px-2 py-1 text-sm"
                value={format}
                onChange={(e) => setFormat(e.target.value as CupFormat)}
              >
                <option value="single">Single elimination</option>
                <option value="double">Double elimination</option>
              </select>
            </label>
            <label className="text-xs text-slate-500">
              Starting GW
              <input
                type="number"
                min={1}
                max={38}
                className="mt-1 block w-20 rounded border border-slate-300 px-2 py-1 text-sm"
                value={startingGameweekNumber}
                onChange={(e) => setStartingGameweekNumber(Number(e.target.value))}
              />
            </label>
            <label className="text-xs text-slate-500">
              Rounds
              <input
                type="number"
                min={1}
                max={10}
                placeholder={`Recommended: ${recommendedRounds}`}
                className="mt-1 block w-36 rounded border border-slate-300 px-2 py-1 text-sm"
                value={rounds}
                onChange={(e) => setRounds(e.target.value)}
              />
            </label>
          </div>
          <p className="text-xs text-slate-500">
            {membersQuery.data?.length ?? 0} entrants (all current league members) · recommended {recommendedRounds}{" "}
            round{recommendedRounds === 1 ? "" : "s"} for this format
          </p>
          {createError && <p className="text-sm text-red-600">{createError}</p>}
          <button
            type="submit"
            disabled={createCupMutation.isPending}
            className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            Start Cup
          </button>
        </form>
      )}
      {isCommissioner && hasActiveCup && (
        <p className="text-sm text-slate-500">
          This league already has an active cup — start a new one once it completes.
        </p>
      )}

      {cupsQuery.isLoading && <p className="text-sm text-slate-500">Loading cups...</p>}
      {cupsQuery.isError && (
        <p className="text-sm text-red-600">
          {cupsQuery.error instanceof Error ? cupsQuery.error.message : "Failed to load cups"}
        </p>
      )}
      {cupsQuery.data?.length === 0 && (
        <p className="text-sm text-slate-500">No cup competitions yet.</p>
      )}
      {cupsQuery.data?.map((cup) => <CupBracket key={cup.id} cup={cup} displayName={displayName} />)}
    </div>
  );
}
