import { useQuery } from "@tanstack/react-query";
import { ScrollView, Text, View } from "react-native";
import { api, type League, type LeagueHistoryRow } from "../lib/api";
import { ui } from "../lib/ui";

export function HistoryPanel({ league }: { league: League }) {
  const historyQuery = useQuery({
    queryKey: ["league-history", league.id],
    queryFn: () => api.getLeagueHistory(league.id),
  });

  const seasons = new Map<string, { seasonLabel: string; rows: LeagueHistoryRow[] }>();
  for (const row of historyQuery.data ?? []) {
    const existing = seasons.get(row.seasonId);
    if (existing) {
      existing.rows.push(row);
    } else {
      seasons.set(row.seasonId, { seasonLabel: row.seasonLabel, rows: [row] });
    }
  }

  const columns = ["P", "W", "T", "L", "Pts", "Scored"] as const;

  return (
    <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 32 }}>
      {historyQuery.isLoading && <Text style={ui.subtext}>Loading history...</Text>}
      {historyQuery.data?.length === 0 && (
        <Text style={ui.subtext}>No season history yet — finalize a gameweek to get started.</Text>
      )}
      {[...seasons.entries()].map(([seasonId, { seasonLabel, rows }]) => (
        <View key={seasonId}>
          <Text style={[ui.h2, { marginBottom: 8 }]}>{seasonLabel}</Text>
          <View style={ui.card}>
            <View style={[ui.row, { borderBottomWidth: 1, borderBottomColor: "#e2e8f0", paddingBottom: 6 }]}>
              <Text style={[ui.subtext, { flex: 2 }]}>Manager</Text>
              {columns.map((c) => (
                <Text key={c} style={[ui.subtext, { width: 44, textAlign: "right" }]}>
                  {c}
                </Text>
              ))}
            </View>
            {rows.map((row) => (
              <View key={row.userId} style={ui.row}>
                <Text style={[ui.text, { flex: 2 }]}>{row.displayName}</Text>
                <Text style={[ui.text, { width: 44, textAlign: "right" }]}>{row.played}</Text>
                <Text style={[ui.text, { width: 44, textAlign: "right" }]}>{row.wins}</Text>
                <Text style={[ui.text, { width: 44, textAlign: "right" }]}>{row.ties}</Text>
                <Text style={[ui.text, { width: 44, textAlign: "right" }]}>{row.losses}</Text>
                <Text style={[ui.text, { width: 44, textAlign: "right", fontWeight: "700" }]}>{row.points}</Text>
                <Text style={[ui.text, { width: 44, textAlign: "right" }]}>{row.totalPointsScored}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
