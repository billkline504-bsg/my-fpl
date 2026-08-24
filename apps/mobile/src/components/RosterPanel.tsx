import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FlatList, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { api, type League, type Position } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import { ui } from "../lib/ui";
import { SQUAD_POSITION_REQUIREMENTS } from "@my-fpl/shared";

const POSITIONS: Position[] = ["GK", "DEF", "MID", "FWD"];

export function RosterPanel({ league }: { league: League }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isCommissioner = user?.id === league.commissionerId;

  // Plain text date/time entry (e.g. "2026-08-25 18:00") — keeps this
  // screen dependency-free rather than pulling in a native date picker.
  const [opensAt, setOpensAt] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [postWindowDraftPickCount, setPostWindowDraftPickCount] = useState("12");
  const [playerOutId, setPlayerOutId] = useState("");
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState<Position | "">("");
  const [transferError, setTransferError] = useState<string | null>(null);
  const [windowError, setWindowError] = useState<string | null>(null);

  const rosterQuery = useQuery({ queryKey: ["roster", league.id], queryFn: () => api.getRoster(league.id) });
  const windowQuery = useQuery({
    queryKey: ["transfer-window", league.id],
    queryFn: () => api.getTransferWindow(league.id),
    refetchInterval: 60000,
  });

  const isWindowOpen = windowQuery.data?.isOpen ?? false;
  const isClosingSoon =
    isWindowOpen &&
    !!windowQuery.data &&
    new Date(windowQuery.data.closesAt).getTime() - Date.now() < 24 * 60 * 60 * 1000;

  const availablePlayersQuery = useQuery({
    queryKey: ["available-players", league.id, search, position],
    queryFn: () =>
      api.listAvailableDraftPlayers(league.id, { search: search || undefined, position: position || undefined }),
    enabled: isWindowOpen && !!playerOutId,
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
        postWindowDraftPickCount: Number(postWindowDraftPickCount),
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
    <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 32 }}>
      <View>
        <Text style={[ui.h2, { marginBottom: 4 }]}>Your squad ({(rosterQuery.data ?? []).length}/15)</Text>
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 8 }}>
          {POSITIONS.map((p) => (
            <Text key={p} style={ui.subtext}>
              {p} {counts[p]}/{SQUAD_POSITION_REQUIREMENTS[p]}
            </Text>
          ))}
        </View>
        {rosterQuery.isLoading && <Text style={ui.subtext}>Loading squad...</Text>}
        {rosterQuery.isError && (
          <Text style={ui.errorText}>
            {rosterQuery.error instanceof Error ? rosterQuery.error.message : "Failed to load your squad"}
          </Text>
        )}
        <View style={ui.card}>
          {rosterQuery.data?.map((rp) => (
            <View key={rp.id} style={ui.listItem}>
              <Text style={ui.text}>{rp.player.webName}</Text>
              <Text style={ui.subtext}>
                {rp.player.position} · {rp.player.club.shortName}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={ui.card}>
        <Text style={ui.h2}>Transfer window</Text>
        {windowQuery.isError && (
          <Text style={ui.errorText}>
            {windowQuery.error instanceof Error ? windowQuery.error.message : "Failed to load the transfer window"}
          </Text>
        )}
        {windowQuery.data ? (
          <Text style={ui.text}>
            {new Date(windowQuery.data.opensAt).toLocaleString()} —{" "}
            {new Date(windowQuery.data.closesAt).toLocaleString()} ·{" "}
            <Text style={isWindowOpen ? ui.successText : ui.subtext}>{isWindowOpen ? "Open" : "Closed"}</Text>
            {isClosingSoon && <Text style={{ color: "#b45309", fontWeight: "600" }}> · Closing soon</Text>}
          </Text>
        ) : isCommissioner ? (
          <View style={{ gap: 8 }}>
            <TextInput
              style={ui.input}
              placeholder="Opens (e.g. 2026-08-25 18:00)"
              value={opensAt}
              onChangeText={setOpensAt}
            />
            <TextInput
              style={ui.input}
              placeholder="Closes (e.g. 2026-09-01 18:00)"
              value={closesAt}
              onChangeText={setClosesAt}
            />
            <TextInput
              style={ui.input}
              placeholder="Post-window draft picks"
              keyboardType="number-pad"
              value={postWindowDraftPickCount}
              onChangeText={setPostWindowDraftPickCount}
            />
            {windowError && <Text style={ui.errorText}>{windowError}</Text>}
            <Pressable
              style={[ui.button, createWindowMutation.isPending && ui.buttonDisabled]}
              onPress={() => createWindowMutation.mutate()}
              disabled={createWindowMutation.isPending}
            >
              <Text style={ui.buttonText}>Open Transfer Window</Text>
            </Pressable>
          </View>
        ) : (
          <Text style={ui.subtext}>The commissioner hasn't set up a transfer window yet.</Text>
        )}
      </View>

      {isWindowOpen && (
        <View style={ui.card}>
          <Text style={ui.h2}>Make a transfer</Text>
          <Text style={ui.subtext}>Drop</Text>
          <View style={{ gap: 6 }}>
            {rosterQuery.data?.map((rp) => (
              <Pressable
                key={rp.player.id}
                onPress={() => setPlayerOutId(rp.player.id)}
                style={[
                  ui.listItem,
                  { borderRadius: 6, paddingHorizontal: 8 },
                  playerOutId === rp.player.id && { backgroundColor: "#f1f5f9" },
                ]}
              >
                <Text style={ui.text}>{rp.player.webName}</Text>
                <Text style={ui.subtext}>
                  {rp.player.position} · {rp.player.club.shortName}
                </Text>
              </Pressable>
            ))}
          </View>

          {playerOutId && (
            <View style={{ gap: 8, marginTop: 8 }}>
              <TextInput
                style={ui.input}
                placeholder="Search players to add..."
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
              {transferError && <Text style={ui.errorText}>{transferError}</Text>}
              <FlatList
                data={availablePlayersQuery.data ?? []}
                keyExtractor={(p) => p.id}
                style={{ maxHeight: 260 }}
                renderItem={({ item }) => (
                  <View style={ui.listItem}>
                    <Text style={ui.text}>
                      {item.webName} <Text style={ui.subtext}>{item.position} · {item.club.shortName}</Text>
                    </Text>
                    <Pressable
                      style={[ui.buttonSmall, transferMutation.isPending && ui.buttonDisabled]}
                      onPress={() => transferMutation.mutate(item.id)}
                      disabled={transferMutation.isPending}
                    >
                      <Text style={ui.buttonTextSmall}>Add</Text>
                    </Pressable>
                  </View>
                )}
              />
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}
