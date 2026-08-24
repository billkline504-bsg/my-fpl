import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type League } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import { DraftPanel } from "../components/DraftPanel";
import { RosterPanel } from "../components/RosterPanel";
import { StandingsPanel } from "../components/StandingsPanel";
import { HistoryPanel } from "../components/HistoryPanel";
import { CupsPanel } from "../components/CupsPanel";
import { Icon, IconUpload } from "../components/IconUpload";

type DetailTab = "members" | "draft" | "roster" | "standings" | "history" | "cups";

export function LeaguesPage() {
  const { signOut, user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("members");
  const [newLeagueName, setNewLeagueName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const leaguesQuery = useQuery({ queryKey: ["leagues"], queryFn: api.listMyLeagues });

  const membersQuery = useQuery({
    queryKey: ["league-members", selectedLeague?.id],
    queryFn: () => api.getLeagueMembers(selectedLeague!.id),
    enabled: !!selectedLeague,
  });

  const myProfileQuery = useQuery({ queryKey: ["my-profile"], queryFn: api.getMyProfile });

  const uploadMyIconMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return api.uploadMyIcon(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      queryClient.invalidateQueries({ queryKey: ["league-members"] });
    },
  });

  const uploadLeagueIconMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return api.uploadLeagueIcon(selectedLeague!.id, formData);
    },
    onSuccess: (updated) => {
      setSelectedLeague(updated);
      queryClient.invalidateQueries({ queryKey: ["leagues"] });
    },
  });

  const createLeagueMutation = useMutation({
    mutationFn: () => api.createLeague({ name: newLeagueName }),
    onSuccess: () => {
      setNewLeagueName("");
      setFormError(null);
      queryClient.invalidateQueries({ queryKey: ["leagues"] });
    },
    onError: (err) => setFormError(err instanceof Error ? err.message : "Failed to create league"),
  });

  const joinLeagueMutation = useMutation({
    mutationFn: () => api.joinLeague(inviteCode),
    onSuccess: () => {
      setInviteCode("");
      setFormError(null);
      queryClient.invalidateQueries({ queryKey: ["leagues"] });
    },
    onError: (err) => setFormError(err instanceof Error ? err.message : "Failed to join league"),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">My Leagues</h1>
        <div className="flex items-center gap-3">
          <IconUpload
            iconUrl={myProfileQuery.data?.iconUrl ?? null}
            alt="Your team icon"
            busy={uploadMyIconMutation.isPending}
            onUpload={(file) => uploadMyIconMutation.mutate(file)}
          />
          <span className="text-sm text-slate-500">{user?.email}</span>
          <button className="text-sm text-slate-500 underline" onClick={() => signOut()}>
            Sign out
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <form
          className="space-y-2 rounded-lg border border-slate-200 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            createLeagueMutation.mutate();
          }}
        >
          <h2 className="text-sm font-medium text-slate-700">Create a league</h2>
          <input
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            placeholder="League name"
            value={newLeagueName}
            onChange={(e) => setNewLeagueName(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={createLeagueMutation.isPending}
            className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            Create
          </button>
        </form>

        <form
          className="space-y-2 rounded-lg border border-slate-200 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            joinLeagueMutation.mutate();
          }}
        >
          <h2 className="text-sm font-medium text-slate-700">Join a league</h2>
          <input
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm uppercase"
            placeholder="Invite code"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={joinLeagueMutation.isPending}
            className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            Join
          </button>
        </form>
      </section>

      {formError && <p className="text-sm text-red-600">{formError}</p>}

      <section className="space-y-2">
        {leaguesQuery.isLoading && <p className="text-sm text-slate-500">Loading leagues...</p>}
        {leaguesQuery.isError && (
          <p className="text-sm text-red-600">
            {leaguesQuery.error instanceof Error ? leaguesQuery.error.message : "Failed to load your leagues"}
          </p>
        )}
        {leaguesQuery.data?.length === 0 && (
          <p className="text-sm text-slate-500">You're not in any leagues yet.</p>
        )}
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200">
          {leaguesQuery.data?.map((league) => (
            <li key={league.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Icon iconUrl={league.iconUrl} alt={`${league.name} icon`} />
                <div>
                  <p className="font-medium text-slate-900">{league.name}</p>
                  <p className="text-xs text-slate-500">
                    Invite code: <span className="font-mono">{league.inviteCode}</span> · max {league.maxUsers} users
                    · {league.seasonLabel}
                  </p>
                </div>
              </div>
              <button
                className="text-sm text-slate-600 underline"
                onClick={() => {
                  setSelectedLeague(league);
                  setDetailTab("members");
                }}
              >
                Open
              </button>
            </li>
          ))}
        </ul>
      </section>

      {selectedLeague && (
        <section className="space-y-3 rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {user?.id === selectedLeague.commissionerId ? (
                <IconUpload
                  iconUrl={selectedLeague.iconUrl}
                  alt={`${selectedLeague.name} icon`}
                  busy={uploadLeagueIconMutation.isPending}
                  onUpload={(file) => uploadLeagueIconMutation.mutate(file)}
                />
              ) : (
                <Icon iconUrl={selectedLeague.iconUrl} alt={`${selectedLeague.name} icon`} />
              )}
              <h2 className="text-sm font-medium text-slate-700">{selectedLeague.name}</h2>
            </div>
            <button className="text-xs text-slate-500 underline" onClick={() => setSelectedLeague(null)}>
              Close
            </button>
          </div>

          <div className="flex gap-4 border-b border-slate-200">
            {(["members", "draft", "roster", "standings", "history", "cups"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setDetailTab(t)}
                className={`border-b-2 pb-2 text-sm font-medium capitalize ${
                  detailTab === t ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {detailTab === "members" ? (
            <>
              {membersQuery.isLoading && <p className="text-sm text-slate-500">Loading members...</p>}
              <ul className="space-y-1">
                {membersQuery.data?.map((member) => (
                  <li key={member.userId} className="flex items-center gap-2 text-sm text-slate-800">
                    <Icon iconUrl={member.iconUrl} alt={`${member.displayName} icon`} size={20} />
                    {member.displayName}
                  </li>
                ))}
              </ul>
            </>
          ) : detailTab === "draft" ? (
            <DraftPanel league={selectedLeague} />
          ) : detailTab === "roster" ? (
            <RosterPanel league={selectedLeague} />
          ) : detailTab === "standings" ? (
            <StandingsPanel league={selectedLeague} />
          ) : detailTab === "history" ? (
            <HistoryPanel league={selectedLeague} onLeagueUpdated={setSelectedLeague} />
          ) : (
            <CupsPanel league={selectedLeague} />
          )}
        </section>
      )}
    </div>
  );
}
