import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { api, type Position } from "../lib/api";
import { ui } from "../lib/ui";
import { PlayerStatsPanel } from "../components/PlayerStatsPanel";

const POSITIONS: Position[] = ["GK", "DEF", "MID", "FWD"];

export function PlayersScreen() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState<Position | "">("");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const playersQuery = useQuery({
    queryKey: ["players", search, position],
    queryFn: () => api.listPlayers({ search: search || undefined, position: position || undefined }),
  });

  const syncMutation = useMutation({
    mutationFn: api.syncFpl,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["players"] }),
  });

  return (
    <FlatList
      style={ui.screen}
      contentContainerStyle={ui.content}
      ListHeaderComponent={
        <View style={{ gap: 12 }}>
          <View style={ui.row}>
            <Text style={ui.h1}>Players</Text>
            <Pressable
              style={[ui.buttonSmall, syncMutation.isPending && ui.buttonDisabled]}
              onPress={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
            >
              <Text style={ui.buttonTextSmall}>{syncMutation.isPending ? "Syncing..." : "Sync from FPL"}</Text>
            </Pressable>
          </View>

          {syncMutation.isSuccess && (
            <Text style={ui.subtext}>
              Synced {syncMutation.data.clubs} clubs, {syncMutation.data.players} players,{" "}
              {syncMutation.data.gameweeks} gameweeks.
            </Text>
          )}
          {syncMutation.isError && (
            <Text style={ui.errorText}>
              {syncMutation.error instanceof Error ? syncMutation.error.message : "Sync failed"}
            </Text>
          )}

          <TextInput style={ui.input} placeholder="Search players..." value={search} onChangeText={setSearch} />
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

          {playersQuery.isLoading && <Text style={ui.subtext}>Loading players...</Text>}
          {playersQuery.isError && (
            <Text style={ui.errorText}>
              {playersQuery.error instanceof Error ? playersQuery.error.message : "Failed to load players"}
            </Text>
          )}
          {playersQuery.data?.length === 0 && (
            <Text style={ui.subtext}>No players found. If this is the first run, tap "Sync from FPL" above.</Text>
          )}

          {selectedPlayerId && (
            <PlayerStatsPanel playerId={selectedPlayerId} onClose={() => setSelectedPlayerId(null)} />
          )}
        </View>
      }
      data={playersQuery.data ?? []}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <Pressable style={ui.listItem} onPress={() => setSelectedPlayerId(item.id)}>
          <Text style={ui.text}>{item.webName}</Text>
          <Text style={ui.subtext}>
            {item.position} · {item.club.shortName}
          </Text>
        </Pressable>
      )}
    />
  );
}
