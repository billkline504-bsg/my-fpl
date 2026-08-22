import { useLayoutEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pressable, SafeAreaView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { api } from "../lib/api";
import { ui } from "../lib/ui";
import { DraftPanel } from "../components/DraftPanel";
import { RosterPanel } from "../components/RosterPanel";
import { StandingsPanel } from "../components/StandingsPanel";
import { HistoryPanel } from "../components/HistoryPanel";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "LeagueDetail">;

type DetailTab = "members" | "draft" | "roster" | "standings" | "history";

export function LeagueDetailScreen({ route, navigation }: Props) {
  const { league } = route.params;
  const [tab, setTab] = useState<DetailTab>("members");

  useLayoutEffect(() => {
    navigation.setOptions({ title: league.name });
  }, [navigation, league.name]);

  const membersQuery = useQuery({
    queryKey: ["league-members", league.id],
    queryFn: () => api.getLeagueMembers(league.id),
  });

  return (
    <SafeAreaView style={ui.screen}>
      <View style={ui.tabBar}>
        {(["members", "draft", "roster", "standings", "history"] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[ui.tabButton, tab === t && ui.tabButtonActive]}>
            <Text style={[ui.tabButtonText, tab === t && ui.tabButtonTextActive]}>{t}</Text>
          </Pressable>
        ))}
      </View>

      <View style={{ flex: 1, padding: 16 }}>
        {tab === "members" ? (
          <View style={ui.card}>
            {membersQuery.isLoading && <Text style={ui.subtext}>Loading members...</Text>}
            {membersQuery.data?.map((member) => (
              <Text key={member.userId} style={ui.text}>
                {member.displayName}
              </Text>
            ))}
          </View>
        ) : tab === "draft" ? (
          <DraftPanel league={league} />
        ) : tab === "roster" ? (
          <RosterPanel league={league} />
        ) : tab === "standings" ? (
          <StandingsPanel league={league} />
        ) : (
          <HistoryPanel league={league} />
        )}
      </View>
    </SafeAreaView>
  );
}
