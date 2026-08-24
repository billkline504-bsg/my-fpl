import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { api, type League } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import { ui } from "../lib/ui";

export function StandingsPanel({ league }: { league: League }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isCommissioner = user?.id === league.commissionerId;

  const [gameweekNumber, setGameweekNumber] = useState("1");
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [finalizeError, setFinalizeError] = useState<string | null>(null);
  const [finalizeResult, setFinalizeResult] = useState<string | null>(null);

  const gwNumber = Number(gameweekNumber) || 1;

  const standingsQuery = useQuery({ queryKey: ["standings", league.id], queryFn: () => api.getStandings(league.id) });
  const membersQuery = useQuery({
    queryKey: ["league-members", league.id],
    queryFn: () => api.getLeagueMembers(league.id),
  });
  const matchupsQuery = useQuery({
    queryKey: ["matchups", league.id, gwNumber],
    queryFn: () => api.getMatchups(league.id, gwNumber),
  });

  function displayName(userId: string) {
    return membersQuery.data?.find((m) => m.userId === userId)?.displayName ?? userId.slice(0, 8);
  }

  const generateScheduleMutation = useMutation({
    mutationFn: () => api.generateSchedule(league.id),
    onSuccess: () => {
      setScheduleError(null);
      queryClient.invalidateQueries({ queryKey: ["matchups", league.id] });
      queryClient.invalidateQueries({ queryKey: ["standings", league.id] });
    },
    onError: (err) => setScheduleError(err instanceof Error ? err.message : "Failed to generate schedule"),
  });

  const finalizeMutation = useMutation({
    mutationFn: () => api.finalizeGameweek(league.id, gwNumber),
    onSuccess: () => {
      setFinalizeError(null);
      setFinalizeResult(`Finalized gameweek ${gwNumber}.`);
      queryClient.invalidateQueries({ queryKey: ["matchups", league.id, gwNumber] });
      queryClient.invalidateQueries({ queryKey: ["standings", league.id] });
    },
    onError: (err) => setFinalizeError(err instanceof Error ? err.message : "Failed to finalize gameweek"),
  });

  const columns = ["P", "W", "T", "L", "Pts"] as const;

  return (
    <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 32 }}>
      <View>
        <View style={[ui.row, { marginBottom: 8 }]}>
          <Text style={ui.h2}>League table</Text>
          {isCommissioner && (
            <Pressable
              style={[ui.buttonSmall, generateScheduleMutation.isPending && ui.buttonDisabled]}
              onPress={() => generateScheduleMutation.mutate()}
              disabled={generateScheduleMutation.isPending}
            >
              <Text style={ui.buttonTextSmall}>Generate Schedule</Text>
            </Pressable>
          )}
        </View>
        {scheduleError && <Text style={ui.errorText}>{scheduleError}</Text>}
        {standingsQuery.isError && (
          <Text style={ui.errorText}>
            {standingsQuery.error instanceof Error ? standingsQuery.error.message : "Failed to load standings"}
          </Text>
        )}

        <View style={ui.card}>
          <View style={[ui.row, { borderBottomWidth: 1, borderBottomColor: "#e2e8f0", paddingBottom: 6 }]}>
            <Text style={[ui.subtext, { flex: 2 }]}>Manager</Text>
            {columns.map((c) => (
              <Text key={c} style={[ui.subtext, { width: 32, textAlign: "right" }]}>
                {c}
              </Text>
            ))}
          </View>
          {standingsQuery.data?.length === 0 && (
            <Text style={ui.subtext}>No standings yet — generate a schedule and finalize a gameweek.</Text>
          )}
          {standingsQuery.data?.map((row) => (
            <View key={row.userId} style={ui.row}>
              <Text style={[ui.text, { flex: 2 }]}>{row.displayName}</Text>
              <Text style={[ui.text, { width: 32, textAlign: "right" }]}>{row.played}</Text>
              <Text style={[ui.text, { width: 32, textAlign: "right" }]}>{row.wins}</Text>
              <Text style={[ui.text, { width: 32, textAlign: "right" }]}>{row.ties}</Text>
              <Text style={[ui.text, { width: 32, textAlign: "right" }]}>{row.losses}</Text>
              <Text style={[ui.text, { width: 32, textAlign: "right", fontWeight: "700" }]}>{row.points}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={ui.card}>
        <View style={ui.row}>
          <Text style={ui.h2}>Gameweek matchups</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <TextInput
              style={[ui.input, { width: 48, textAlign: "center", paddingVertical: 4 }]}
              keyboardType="number-pad"
              value={gameweekNumber}
              onChangeText={setGameweekNumber}
            />
            {isCommissioner && (
              <Pressable
                style={[ui.buttonSmall, finalizeMutation.isPending && ui.buttonDisabled]}
                onPress={() => finalizeMutation.mutate()}
                disabled={finalizeMutation.isPending}
              >
                <Text style={ui.buttonTextSmall}>Finalize GW{gwNumber}</Text>
              </Pressable>
            )}
          </View>
        </View>
        {finalizeError && <Text style={ui.errorText}>{finalizeError}</Text>}
        {finalizeResult && <Text style={ui.successText}>{finalizeResult}</Text>}
        {matchupsQuery.data?.length === 0 && (
          <Text style={ui.subtext}>No matchups scheduled for this gameweek.</Text>
        )}
        {matchupsQuery.data?.map((m) => (
          <View key={m.id} style={ui.listItem}>
            <Text style={[ui.text, m.winnerId === m.userAId && { fontWeight: "700" }]}>
              {displayName(m.userAId)} {m.userAScore ?? "-"}
            </Text>
            <Text style={ui.subtext}>vs</Text>
            <Text style={[ui.text, m.winnerId === m.userBId && { fontWeight: "700" }]}>
              {m.userBScore ?? "-"} {displayName(m.userBId)}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
