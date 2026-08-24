import { useQuery } from "@tanstack/react-query";
import { FlatList, Pressable, Text, View } from "react-native";
import { api } from "../lib/api";
import { ui } from "../lib/ui";

export function PlayerStatsPanel({ playerId, onClose }: { playerId: string; onClose: () => void }) {
  const statsQuery = useQuery({
    queryKey: ["player-stats", playerId],
    queryFn: () => api.getPlayerStats(playerId),
  });

  const stats = statsQuery.data;

  return (
    <View style={ui.card}>
      <View style={ui.row}>
        <Text style={ui.h2}>{stats ? `${stats.player.webName} — season stats` : "Player stats"}</Text>
        <Pressable onPress={onClose}>
          <Text style={ui.linkText}>Close</Text>
        </Pressable>
      </View>

      {statsQuery.isLoading && <Text style={ui.subtext}>Loading stats...</Text>}
      {statsQuery.isError && (
        <Text style={ui.errorText}>
          {statsQuery.error instanceof Error ? statsQuery.error.message : "Failed to load player stats"}
        </Text>
      )}

      {stats && (
        <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {(
              [
                ["Points", stats.totals.points],
                ["Apps", stats.totals.appearances],
                ["Mins", stats.totals.minutes],
                ["Goals", stats.totals.goals],
                ["Assists", stats.totals.assists],
                ["Clean sheets", stats.totals.cleanSheets],
              ] as const
            ).map(([label, value]) => (
              <View key={label} style={{ backgroundColor: "#f8fafc", borderRadius: 6, padding: 8, minWidth: 72, alignItems: "center" }}>
                <Text style={[ui.h2, { fontSize: 18 }]}>{value}</Text>
                <Text style={ui.subtext}>{label}</Text>
              </View>
            ))}
          </View>

          {stats.gameweeks.length === 0 ? (
            <Text style={ui.subtext}>No gameweek stats yet this season.</Text>
          ) : (
            <FlatList
              data={stats.gameweeks}
              keyExtractor={(gw) => String(gw.gameweekNumber)}
              style={{ maxHeight: 260 }}
              renderItem={({ item: gw }) => (
                <View style={ui.listItem}>
                  <Text style={ui.text}>GW{gw.gameweekNumber}</Text>
                  <Text style={ui.subtext}>
                    {gw.minutes}' · {gw.goals}G {gw.assists}A
                  </Text>
                  <Text style={[ui.text, { fontWeight: "700" }]}>{gw.points} pts</Text>
                </View>
              )}
            />
          )}
        </>
      )}
    </View>
  );
}
