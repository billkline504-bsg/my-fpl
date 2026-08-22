import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type DraftType, type League, type Position } from "../lib/api";
import { useAuth } from "../hooks/useAuth";

const POSITIONS: Position[] = ["GK", "DEF", "MID", "FWD"];

export function DraftPanel({ league }: { league: League }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isCommissioner = user?.id === league.commissionerId;

  const [draftType, setDraftType] = useState<DraftType>("initial");
  const [pickCount, setPickCount] = useState(15);
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState<Position | "">("");
  const [pickError, setPickError] = useState<string | null>(null);

  const draftQuery = useQuery({ queryKey: ["draft", league.id], queryFn: () => api.getDraft(league.id) });
  const membersQuery = useQuery({
    queryKey: ["league-members", league.id],
    queryFn: () => api.getLeagueMembers(league.id),
  });

  const draft = draftQuery.data ?? null;
  const isMyTurn = !!draft && draft.status === "in_progress" && draft.currentTurnUserId === user?.id;

  const availablePlayersQuery = useQuery({
    queryKey: ["draft-available-players", league.id, search, position],
    queryFn: () => api.listAvailableDraftPlayers(league.id, { search: search || undefined, position: position || undefined }),
    enabled: isMyTurn,
  });

  function displayName(userId: string) {
    return membersQuery.data?.find((m) => m.userId === userId)?.displayName ?? userId.slice(0, 8);
  }

  const invalidateDraft = () => {
    queryClient.invalidateQueries({ queryKey: ["draft", league.id] });
    queryClient.invalidateQueries({ queryKey: ["draft-available-players", league.id] });
  };

  const createDraftMutation = useMutation({
    mutationFn: () => api.createDraft(league.id, { type: draftType, pickCount }),
    onSuccess: invalidateDraft,
  });

  const startDraftMutation = useMutation({
    mutationFn: () => api.startDraft(league.id, draft!.id),
    onSuccess: invalidateDraft,
  });

  const pickMutation = useMutation({
    mutationFn: (playerId: string) => api.makeDraftPick(league.id, playerId),
    onSuccess: () => {
      setPickError(null);
      invalidateDraft();
    },
    onError: (err) => setPickError(err instanceof Error ? err.message : "Failed to draft player"),
  });

  if (draftQuery.isLoading) {
    return <p className="text-sm text-slate-500">Loading draft...</p>;
  }

  if (!draft) {
    if (!isCommissioner) {
      return <p className="text-sm text-slate-500">The commissioner hasn't started a draft yet.</p>;
    }
    return (
      <form
        className="space-y-3 rounded-lg border border-slate-200 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          createDraftMutation.mutate();
        }}
      >
        <h3 className="text-sm font-medium text-slate-700">Set up a draft</h3>
        <div className="flex gap-3">
          <select
            className="rounded border border-slate-300 px-3 py-2 text-sm"
            value={draftType}
            onChange={(e) => setDraftType(e.target.value as DraftType)}
          >
            <option value="initial">Initial draft</option>
            <option value="post_transfer">Post-transfer draft</option>
          </select>
          <input
            className="w-24 rounded border border-slate-300 px-3 py-2 text-sm"
            type="number"
            min={1}
            max={15}
            value={pickCount}
            onChange={(e) => setPickCount(Number(e.target.value))}
          />
          <span className="self-center text-xs text-slate-500">picks per manager</span>
        </div>
        <button
          type="submit"
          disabled={createDraftMutation.isPending}
          className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
        >
          Create Draft
        </button>
      </form>
    );
  }

  if (draft.status === "pending") {
    return (
      <div className="space-y-3 rounded-lg border border-slate-200 p-4">
        <p className="text-sm text-slate-700">
          {draft.type === "initial" ? "Initial" : "Post-transfer"} draft configured — {draft.configuredPickCount}{" "}
          picks per manager. Not started yet.
        </p>
        {isCommissioner ? (
          <button
            onClick={() => startDraftMutation.mutate()}
            disabled={startDraftMutation.isPending}
            className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            Start Draft
          </button>
        ) : (
          <p className="text-sm text-slate-500">Waiting for the commissioner to start the draft.</p>
        )}
      </div>
    );
  }

  const round = Math.floor(draft.currentPick / draft.pickOrder.length) + 1;
  const pickInRound = (draft.currentPick % draft.pickOrder.length) + 1;

  return (
    <div className="space-y-4">
      {draft.status === "in_progress" ? (
        <div className="rounded-lg bg-slate-100 p-3 text-sm text-slate-800">
          Round {round}, Pick {pickInRound} of {draft.pickOrder.length} — pick {draft.currentPick + 1} of{" "}
          {draft.totalPicks} overall.{" "}
          {isMyTurn ? (
            <span className="font-medium">It's your turn!</span>
          ) : (
            <span>
              Waiting for <span className="font-medium">{displayName(draft.currentTurnUserId!)}</span>...
            </span>
          )}
        </div>
      ) : (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-800">Draft complete!</div>
      )}

      {isMyTurn && (
        <div className="space-y-3 rounded-lg border border-slate-200 p-4">
          <div className="flex gap-3">
            <input
              className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm"
              placeholder="Search available players..."
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
          {pickError && <p className="text-sm text-red-600">{pickError}</p>}
          <ul className="max-h-80 divide-y divide-slate-200 overflow-y-auto rounded border border-slate-200">
            {availablePlayersQuery.data?.map((player) => (
              <li key={player.id} className="flex items-center justify-between p-2">
                <span className="text-sm text-slate-900">
                  {player.webName} <span className="text-xs text-slate-500">{player.position} · {player.club.shortName}</span>
                </span>
                <button
                  onClick={() => pickMutation.mutate(player.id)}
                  disabled={pickMutation.isPending}
                  className="rounded bg-slate-900 px-2 py-1 text-xs text-white disabled:opacity-50"
                >
                  Draft
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3 className="mb-2 text-sm font-medium text-slate-700">Draft board</h3>
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200">
          {draft.picks.map((pick) => (
            <li key={pick.id} className="flex items-center justify-between p-2 text-sm">
              <span className="text-slate-500">#{pick.pickNumber}</span>
              <span className="text-slate-900">{displayName(pick.userId)}</span>
              <span className="text-slate-700">
                {pick.player.webName} ({pick.player.position} · {pick.player.club.shortName})
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
