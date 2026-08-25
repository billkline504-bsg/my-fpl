import { useQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";
import { api, type GameweekLineup, type League, type LineupPlayer } from "../lib/api";
import { ui } from "../lib/ui";

function LineupColumn({ name, lineup }: { name: string; lineup: GameweekLineup | undefined }) {
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <Text style={[ui.subtext, { fontWeight: "600" }]}>{name}</Text>
      <View style={{ gap: 2 }}>
        <Text style={[ui.subtext, { fontSize: 10, textTransform: "uppercase" }]}>Starting XI</Text>
        {lineup?.starters.map((p) => (
          <PlayerRow key={p.playerId} player={p} />
        ))}
      </View>
      <View style={{ gap: 2 }}>
        <Text style={[ui.subtext, { fontSize: 10, textTransform: "uppercase" }]}>Bench</Text>
        {lineup?.bench.map((p) => (
          <PlayerRow key={p.playerId} player={p} />
        ))}
      </View>
    </View>
  );
}

function PlayerRow({ player }: { player: LineupPlayer }) {
  return (
    <View style={[ui.row, { paddingVertical: 0 }]}>
      <Text style={{ fontSize: 12, color: "#0f172a" }}>
        {player.webName} <Text style={ui.subtext}>({player.position})</Text>
      </Text>
      <Text style={{ fontSize: 12, fontWeight: "600" }}>{player.points}</Text>
    </View>
  );
}

export function MatchupLineups({
  league,
  gameweekNumber,
  matchup,
  displayName,
}: {
  league: League;
  gameweekNumber: number;
  matchup: { userAId: string; userBId: string };
  displayName: (userId: string) => string;
}) {
  const aQuery = useQuery({
    queryKey: ["lineup", league.id, gameweekNumber, matchup.userAId],
    queryFn: () => api.getTeamGameweekLineup(league.id, gameweekNumber, matchup.userAId),
  });
  const bQuery = useQuery({
    queryKey: ["lineup", league.id, gameweekNumber, matchup.userBId],
    queryFn: () => api.getTeamGameweekLineup(league.id, gameweekNumber, matchup.userBId),
  });

  if (aQuery.isLoading || bQuery.isLoading) {
    return <Text style={[ui.subtext, { paddingVertical: 8 }]}>Loading lineups...</Text>;
  }
  if (aQuery.isError || bQuery.isError) {
    return <Text style={[ui.errorText, { paddingVertical: 8 }]}>Failed to load lineups.</Text>;
  }

  return (
    <View style={{ flexDirection: "row", gap: 16, paddingVertical: 8, borderTopWidth: 1, borderTopColor: "#e2e8f0" }}>
      <LineupColumn name={displayName(matchup.userAId)} lineup={aQuery.data} />
      <LineupColumn name={displayName(matchup.userBId)} lineup={bQuery.data} />
    </View>
  );
}
