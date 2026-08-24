import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { api, type League, type LeagueHistoryRow } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import { ui } from "../lib/ui";

const NEW_SEASON_VALUE = "__new__";

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

  const [selectedSeasonId, setSelectedSeasonId] = useState(NEW_SEASON_VALUE);
  const [label, setLabel] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [seasonError, setSeasonError] = useState<string | null>(null);

  const historyQuery = useQuery({
    queryKey: ["league-history", league.id],
    queryFn: () => api.getLeagueHistory(league.id),
  });
  const seasonsQuery = useQuery({ queryKey: ["seasons"], queryFn: api.listSeasons });

  const isCreatingNewSeason = selectedSeasonId === NEW_SEASON_VALUE;

  const switchSeasonMutation = useMutation({
    mutationFn: () => {
      const target = seasonsQuery.data?.find((s) => s.id === selectedSeasonId);
      return api.startNextSeason(league.id, {
        label: target?.label ?? label,
        startDate: target?.startDate ?? startDate,
        endDate: target?.endDate ?? endDate,
      });
    },
    onSuccess: (updated) => {
      setSeasonError(null);
      setLabel("");
      setStartDate("");
      setEndDate("");
      setSelectedSeasonId(NEW_SEASON_VALUE);
      onLeagueUpdated?.(updated);
      queryClient.invalidateQueries({ queryKey: ["leagues"] });
      queryClient.invalidateQueries({ queryKey: ["seasons"] });
      queryClient.invalidateQueries({ queryKey: ["league-history", league.id] });
      queryClient.invalidateQueries({ queryKey: ["standings", league.id] });
      queryClient.invalidateQueries({ queryKey: ["roster", league.id] });
      queryClient.invalidateQueries({ queryKey: ["draft", league.id] });
      queryClient.invalidateQueries({ queryKey: ["transfer-window", league.id] });
      queryClient.invalidateQueries({ queryKey: ["cups", league.id] });
    },
    onError: (err) => setSeasonError(err instanceof Error ? err.message : "Failed to switch season"),
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
            <Text style={ui.subtext}>Switch to</Text>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              {seasonsQuery.data
                ?.filter((s) => s.id !== league.seasonId)
                .map((s) => (
                  <Pressable
                    key={s.id}
                    onPress={() => setSelectedSeasonId(s.id)}
                    style={[ui.buttonSmall, selectedSeasonId !== s.id && { backgroundColor: "#e2e8f0" }]}
                  >
                    <Text style={selectedSeasonId === s.id ? ui.buttonTextSmall : { fontSize: 12, color: "#334155" }}>
                      {s.label}
                    </Text>
                  </Pressable>
                ))}
              <Pressable
                onPress={() => setSelectedSeasonId(NEW_SEASON_VALUE)}
                style={[ui.buttonSmall, !isCreatingNewSeason && { backgroundColor: "#e2e8f0" }]}
              >
                <Text style={isCreatingNewSeason ? ui.buttonTextSmall : { fontSize: 12, color: "#334155" }}>
                  + New season
                </Text>
              </Pressable>
            </View>
            {isCreatingNewSeason && (
              <>
                <TextInput
                  style={ui.input}
                  placeholder="New season label (e.g. 2028/29)"
                  value={label}
                  onChangeText={setLabel}
                />
                <TextInput
                  style={ui.input}
                  placeholder="Start date (YYYY-MM-DD)"
                  value={startDate}
                  onChangeText={setStartDate}
                />
                <TextInput
                  style={ui.input}
                  placeholder="End date (YYYY-MM-DD)"
                  value={endDate}
                  onChangeText={setEndDate}
                />
              </>
            )}
            {seasonError && <Text style={ui.errorText}>{seasonError}</Text>}
            <Pressable
              style={[ui.buttonSmall, switchSeasonMutation.isPending && ui.buttonDisabled]}
              onPress={() => switchSeasonMutation.mutate()}
              disabled={switchSeasonMutation.isPending}
            >
              <Text style={ui.buttonTextSmall}>{isCreatingNewSeason ? "Start new season" : "Switch season"}</Text>
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
