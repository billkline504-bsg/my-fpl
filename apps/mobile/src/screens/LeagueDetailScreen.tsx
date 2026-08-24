import { useLayoutEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pressable, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../hooks/useAuth";
import { api } from "../lib/api";
import { ui } from "../lib/ui";
import { Icon, IconUpload } from "../components/IconUpload";
import { DraftPanel } from "../components/DraftPanel";
import { RosterPanel } from "../components/RosterPanel";
import { StandingsPanel } from "../components/StandingsPanel";
import { HistoryPanel } from "../components/HistoryPanel";
import { CupsPanel } from "../components/CupsPanel";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "LeagueDetail">;

type DetailTab = "members" | "draft" | "roster" | "standings" | "history" | "cups";

export function LeagueDetailScreen({ route, navigation }: Props) {
  const { league } = route.params;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<DetailTab>("members");
  const isCommissioner = user?.id === league.commissionerId;

  useLayoutEffect(() => {
    navigation.setOptions({ title: league.name });
  }, [navigation, league.name]);

  const membersQuery = useQuery({
    queryKey: ["league-members", league.id],
    queryFn: () => api.getLeagueMembers(league.id),
  });

  const uploadLeagueIconMutation = useMutation({
    mutationFn: (formData: FormData) => api.uploadLeagueIcon(league.id, formData),
    onSuccess: (updated) => {
      navigation.setParams({ league: updated });
      queryClient.invalidateQueries({ queryKey: ["leagues"] });
    },
  });

  return (
    <View style={ui.screen}>
      <View style={[ui.row, { padding: 16, paddingBottom: 0, justifyContent: "flex-start", gap: 8 }]}>
        {isCommissioner ? (
          <IconUpload
            iconUrl={league.iconUrl}
            busy={uploadLeagueIconMutation.isPending}
            onUpload={(formData) => uploadLeagueIconMutation.mutate(formData)}
          />
        ) : (
          <Icon iconUrl={league.iconUrl} />
        )}
      </View>
      <View style={ui.tabBar}>
        {(["members", "draft", "roster", "standings", "history", "cups"] as const).map((t) => (
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
              <View key={member.userId} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Icon iconUrl={member.iconUrl} size={20} />
                <Text style={ui.text}>{member.displayName}</Text>
              </View>
            ))}
          </View>
        ) : tab === "draft" ? (
          <DraftPanel league={league} />
        ) : tab === "roster" ? (
          <RosterPanel league={league} />
        ) : tab === "standings" ? (
          <StandingsPanel league={league} />
        ) : tab === "history" ? (
          <HistoryPanel league={league} onLeagueUpdated={(updated) => navigation.setParams({ league: updated })} />
        ) : (
          <CupsPanel league={league} />
        )}
      </View>
    </View>
  );
}
