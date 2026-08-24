import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { api, type League, type LeagueHistoryRow } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import { ui } from "../lib/ui";

export function HistoryPanel({
  league,
  onLeagueUpdated,
}: {
  league: League;
  onLeagueUpdated?: (league: League) => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isCommissioner = user?.id === league.commissionerId;

  const [label, setLabel] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [seasonError, setSeasonError] = useState<string | null>(null);

  const historyQuery = useQuery({
    queryKey: ["league-history", league.id],
    queryFn: () => api.getLeagueHistory(league.id),
  });

  const startNextSeasonMutation = useMutation({
    mutationFn: () => api.startNextSeason(league.id, { label, startDate, endDate }),
    onSuccess: (updated) => {
      setSeasonError(null);
      setLabel("");
      setStartDate("");
      setEndDate("");
      onLeagueUpdated?.(updated);
      queryClient.invalidateQueries({ queryKey: ["leagues"] });
      queryClient.invalidateQueries({ queryKey: ["league-history", league.id] });
      queryClient.invalidateQueries({ queryKey: ["standings", league.id] });
      queryClient.invalidateQueries({ queryKey: ["roster", league.id] });
      queryClient.invalidateQueries({ queryKey: ["draft", league.id] });
      queryClient.invalidateQueries({ queryKey: ["transfer-window", league.id] });
    },
    onError: (err) => setSeasonError(err instanceof Error ? err.message : "Failed to start new season"),
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
      <View style={ui.card}>
        <Text style={ui.h2}>
          Current season: <Text style={ui.subtext}>{league.seasonLabel}</Text>
        </Text>
        {isCommissioner && (
          <View style={{ gap: 8 }}>
            <TextInput
              style={ui.input}
              placeholder="New season label (e.g. 2027/28)"
              value={label}
              onChangeText={setLabel}
            />
            <TextInput
              style={ui.input}
              placeholder="Start date (YYYY-MM-DD)"
              value={startDate}
              onChangeText={setStartDate}
            />
            <TextInput style={ui.input} placeholder="End date (YYYY-MM-DD)" value={endDate} onChangeText={setEndDate} />
            {seasonError && <Text style={ui.errorText}>{seasonError}</Text>}
            <Pressable
              style={[ui.buttonSmall, startNextSeasonMutation.isPending && ui.buttonDisabled]}
              onPress={() => startNextSeasonMutation.mutate()}
              disabled={startNextSeasonMutation.isPending}
            >
              <Text style={ui.buttonTextSmall}>Start new season</Text>
            </Pressable>
          </View>
        )}
      </View>

      {historyQuery.isLoading && <Text style={ui.subtext}>Loading history...</Text>}
      {historyQuery.isError && (
        <Text style={ui.errorText}>
          {historyQuery.error instanceof Error ? historyQuery.error.message : "Failed to load season history"}
        </Text>
      )}
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
