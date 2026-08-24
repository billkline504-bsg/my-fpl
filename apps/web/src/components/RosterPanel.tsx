import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type League, type Position } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import { SQUAD_POSITION_REQUIREMENTS } from "@my-fpl/shared";

const POSITIONS: Position[] = ["GK", "DEF", "MID", "FWD"];

export function RosterPanel({ league }: { league: League }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isCommissioner = user?.id === league.commissionerId;

  const [opensAt, setOpensAt] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [postWindowDraftPickCount, setPostWindowDraftPickCount] = useState(12);
  const [playerOutId, setPlayerOutId] = useState("");
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState<Position | "">("");
  const [transferError, setTransferError] = useState<string | null>(null);
  const [windowError, setWindowError] = useState<string | null>(null);

  const rosterQuery = useQuery({ queryKey: ["roster", league.id], queryFn: () => api.getRoster(league.id) });
  const windowQuery = useQuery({
    queryKey: ["transfer-window", league.id],
    queryFn: () => api.getTransferWindow(league.id),
    // Polls slowly so "closes soon"/"closed" flips over without a manual refresh.
    refetchInterval: 60000,
  });

  const isWindowOpen = windowQuery.data?.isOpen ?? false;
  const isClosingSoon =
    isWindowOpen &&
    !!windowQuery.data &&
    new Date(windowQuery.data.closesAt).getTime() - Date.now() < 24 * 60 * 60 * 1000;

  const availablePlayersQuery = useQuery({
    queryKey: ["available-players", league.id, search, position],
    queryFn: () => api.listAvailableDraftPlayers(league.id, { search: search || undefined, position: position || undefined }),
    enabled: isWindowOpen,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["roster", league.id] });
    queryClient.invalidateQueries({ queryKey: ["available-players", league.id] });
  };

  const createWindowMutation = useMutation({
    mutationFn: () =>
      api.createTransferWindow(league.id, {
        opensAt: new Date(opensAt).toISOString(),
        closesAt: new Date(closesAt).toISOString(),
        postWindowDraftPickCount,
      }),
    onSuccess: () => {
      setWindowError(null);
      queryClient.invalidateQueries({ queryKey: ["transfer-window", league.id] });
    },
    onError: (err) => setWindowError(err instanceof Error ? err.message : "Failed to create transfer window"),
  });

  const transferMutation = useMutation({
    mutationFn: (playerInId: string) => api.makeTransfer(league.id, { playerOutId, playerInId }),
    onSuccess: () => {
      setTransferError(null);
      setPlayerOutId("");
      invalidate();
    },
    onError: (err) => setTransferError(err instanceof Error ? err.message : "Transfer failed"),
  });

  const counts: Record<Position, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
  for (const rp of rosterQuery.data ?? []) counts[rp.player.position]++;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-sm font-medium text-slate-700">
          Your squad ({(rosterQuery.data ?? []).length}/15)
        </h3>
        <div className="mb-2 flex gap-4 text-xs text-slate-500">
          {POSITIONS.map((p) => (
            <span key={p}>
              {p} {counts[p]}/{SQUAD_POSITION_REQUIREMENTS[p]}
            </span>
          ))}
        </div>
        {rosterQuery.isLoading && <p className="text-sm text-slate-500">Loading squad...</p>}
        {rosterQuery.isError && (
          <p className="text-sm text-red-600">
            {rosterQuery.error instanceof Error ? rosterQuery.error.message : "Failed to load your squad"}
          </p>
        )}
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200">
          {rosterQuery.data?.map((rp) => (
            <li key={rp.id} className="flex items-center justify-between p-2 text-sm">
              <span className="text-slate-900">{rp.player.webName}</span>
              <span className="text-xs text-slate-500">
                {rp.player.position} · {rp.player.club.shortName}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-3 rounded-lg border border-slate-200 p-4">
        <h3 className="text-sm font-medium text-slate-700">Transfer window</h3>
        {windowQuery.isError && (
          <p className="text-sm text-red-600">
            {windowQuery.error instanceof Error ? windowQuery.error.message : "Failed to load the transfer window"}
          </p>
        )}
        {windowQuery.data ? (
          <p className="text-sm text-slate-700">
            {new Date(windowQuery.data.opensAt).toLocaleString()} —{" "}
            {new Date(windowQuery.data.closesAt).toLocaleString()} ·{" "}
            <span className={isWindowOpen ? "font-medium text-green-700" : "font-medium text-slate-500"}>
              {isWindowOpen ? "Open" : "Closed"}
            </span>
            {isClosingSoon && <span className="font-medium text-amber-600"> · Closing soon</span>}
          </p>
        ) : isCommissioner ? (
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              createWindowMutation.mutate();
            }}
          >
            <div className="flex flex-wrap gap-3">
              <label className="text-xs text-slate-500">
                Opens
                <input
                  type="datetime-local"
                  className="mt-1 block rounded border border-slate-300 px-2 py-1 text-sm"
                  value={opensAt}
                  onChange={(e) => setOpensAt(e.target.value)}
                  required
                />
              </label>
              <label className="text-xs text-slate-500">
                Closes
                <input
                  type="datetime-local"
                  className="mt-1 block rounded border border-slate-300 px-2 py-1 text-sm"
                  value={closesAt}
                  onChange={(e) => setClosesAt(e.target.value)}
                  required
                />
              </label>
              <label className="text-xs text-slate-500">
                Post-window draft picks
                <input
                  type="number"
                  min={1}
                  max={15}
                  className="mt-1 block w-24 rounded border border-slate-300 px-2 py-1 text-sm"
                  value={postWindowDraftPickCount}
                  onChange={(e) => setPostWindowDraftPickCount(Number(e.target.value))}
                />
              </label>
            </div>
            {windowError && <p className="text-sm text-red-600">{windowError}</p>}
            <button
              type="submit"
              disabled={createWindowMutation.isPending}
              className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
              Open Transfer Window
            </button>
          </form>
        ) : (
          <p className="text-sm text-slate-500">The commissioner hasn't set up a transfer window yet.</p>
        )}
      </div>

      {isWindowOpen && (
        <div className="space-y-3 rounded-lg border border-slate-200 p-4">
          <h3 className="text-sm font-medium text-slate-700">Make a transfer</h3>
          <label className="block text-xs text-slate-500">
            Drop
            <select
              className="mt-1 block w-full rounded border border-slate-300 px-2 py-2 text-sm"
              value={playerOutId}
              onChange={(e) => setPlayerOutId(e.target.value)}
            >
              <option value="">Select a player to drop...</option>
              {rosterQuery.data?.map((rp) => (
                <option key={rp.player.id} value={rp.player.id}>
                  {rp.player.webName} ({rp.player.position} · {rp.player.club.shortName})
                </option>
              ))}
            </select>
          </label>

          {playerOutId && (
            <div className="space-y-2">
              <div className="flex gap-3">
                <input
                  className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Search players to add..."
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
              {transferError && <p className="text-sm text-red-600">{transferError}</p>}
              <ul className="max-h-64 divide-y divide-slate-200 overflow-y-auto rounded border border-slate-200">
                {availablePlayersQuery.data?.map((p) => (
                  <li key={p.id} className="flex items-center justify-between p-2">
                    <span className="text-sm text-slate-900">
                      {p.webName} <span className="text-xs text-slate-500">{p.position} · {p.club.shortName}</span>
                    </span>
                    <button
                      onClick={() => transferMutation.mutate(p.id)}
                      disabled={transferMutation.isPending}
                      className="rounded bg-slate-900 px-2 py-1 text-xs text-white disabled:opacity-50"
                    >
                      Add
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
