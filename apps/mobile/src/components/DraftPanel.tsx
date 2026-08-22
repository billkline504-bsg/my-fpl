import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FlatList, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { api, type DraftType, type League, type Position } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import { ui } from "../lib/ui";

const POSITIONS: Position[] = ["GK", "DEF", "MID", "FWD"];

export function DraftPanel({ league }: { league: League }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isCommissioner = user?.id === league.commissionerId;

  const [draftType, setDraftType] = useState<DraftType>("initial");
  const [pickCount, setPickCount] = useState("15");
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
    queryFn: () =>
      api.listAvailableDraftPlayers(league.id, { search: search || undefined, position: position || undefined }),
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
    mutationFn: () => api.createDraft(league.id, { type: draftType, pickCount: Number(pickCount) }),
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
    return <Text style={ui.subtext}>Loading draft...</Text>;
  }

  if (!draft) {
    if (!isCommissioner) {
      return <Text style={ui.subtext}>The commissioner hasn't started a draft yet.</Text>;
    }
    return (
      <View style={ui.card}>
        <Text style={ui.h2}>Set up a draft</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(["initial", "post_transfer"] as const).map((t) => (
            <Pressable
              key={t}
              onPress={() => setDraftType(t)}
              style={[ui.buttonSmall, draftType !== t && { backgroundColor: "#e2e8f0" }]}
            >
              <Text style={draftType === t ? ui.buttonTextSmall : { fontSize: 12, color: "#334155" }}>
                {t === "initial" ? "Initial" : "Post-transfer"}
              </Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          style={ui.input}
          keyboardType="number-pad"
          value={pickCount}
          onChangeText={setPickCount}
          placeholder="Picks per manager"
        />
        <Pressable
          style={[ui.button, createDraftMutation.isPending && ui.buttonDisabled]}
          onPress={() => createDraftMutation.mutate()}
          disabled={createDraftMutation.isPending}
        >
          <Text style={ui.buttonText}>Create Draft</Text>
        </Pressable>
      </View>
    );
  }

  if (draft.status === "pending") {
    return (
      <View style={ui.card}>
        <Text style={ui.text}>
          {draft.type === "initial" ? "Initial" : "Post-transfer"} draft configured — {draft.configuredPickCount}{" "}
          picks per manager. Not started yet.
        </Text>
        {isCommissioner ? (
          <Pressable
            style={[ui.button, startDraftMutation.isPending && ui.buttonDisabled]}
            onPress={() => startDraftMutation.mutate()}
            disabled={startDraftMutation.isPending}
          >
            <Text style={ui.buttonText}>Start Draft</Text>
          </Pressable>
        ) : (
          <Text style={ui.subtext}>Waiting for the commissioner to start the draft.</Text>
        )}
      </View>
    );
  }

  const round = Math.floor(draft.currentPick / draft.pickOrder.length) + 1;
  const pickInRound = (draft.currentPick % draft.pickOrder.length) + 1;

  return (
    <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 32 }}>
      {draft.status === "in_progress" ? (
        <View style={[ui.card, { backgroundColor: "#f1f5f9" }]}>
          <Text style={ui.text}>
            Round {round}, Pick {pickInRound} of {draft.pickOrder.length} — pick {draft.currentPick + 1} of{" "}
            {draft.totalPicks} overall.
          </Text>
          <Text style={ui.text}>
            {isMyTurn ? "It's your turn!" : `Waiting for ${displayName(draft.currentTurnUserId!)}...`}
          </Text>
        </View>
      ) : (
        <View style={[ui.card, { backgroundColor: "#f0fdf4" }]}>
          <Text style={ui.successText}>Draft complete!</Text>
        </View>
      )}

      {isMyTurn && (
        <View style={ui.card}>
          <TextInput
            style={ui.input}
            placeholder="Search available players..."
            value={search}
            onChangeText={setSearch}
          />
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {(["", ...POSITIONS] as const).map((p) => (
              <Pressable
                key={p || "all"}
                onPress={() => setPosition(p)}
                style={[ui.buttonSmall, position !== p && { backgroundColor: "#e2e8f0" }]}
              >
                <Text style={position === p ? ui.buttonTextSmall : { fontSize: 12, color: "#334155" }}>
                  {p || "All"}
                </Text>
              </Pressable>
            ))}
          </View>
          {pickError && <Text style={ui.errorText}>{pickError}</Text>}
          <FlatList
            data={availablePlayersQuery.data ?? []}
            keyExtractor={(p) => p.id}
            style={{ maxHeight: 320 }}
            renderItem={({ item }) => (
              <View style={ui.listItem}>
                <Text style={ui.text}>
                  {item.webName} <Text style={ui.subtext}>{item.position} · {item.club.shortName}</Text>
                </Text>
                <Pressable
                  style={[ui.buttonSmall, pickMutation.isPending && ui.buttonDisabled]}
                  onPress={() => pickMutation.mutate(item.id)}
                  disabled={pickMutation.isPending}
                >
                  <Text style={ui.buttonTextSmall}>Draft</Text>
                </Pressable>
              </View>
            )}
          />
        </View>
      )}

      <View>
        <Text style={[ui.h2, { marginBottom: 8 }]}>Draft board</Text>
        <View style={ui.card}>
          {draft.picks.map((pick) => (
            <View key={pick.id} style={ui.listItem}>
              <Text style={ui.subtext}>#{pick.pickNumber}</Text>
              <Text style={ui.text}>{displayName(pick.userId)}</Text>
              <Text style={ui.subtext}>
                {pick.player.webName} ({pick.player.position} · {pick.player.club.shortName})
              </Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
