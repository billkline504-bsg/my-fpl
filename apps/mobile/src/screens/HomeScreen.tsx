import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pressable, Text, View } from "react-native";
import { useAuth } from "../hooks/useAuth";
import { api } from "../lib/api";
import { ui } from "../lib/ui";
import { IconUpload } from "../components/IconUpload";
import { LeaguesScreen } from "./LeaguesScreen";
import { PlayersScreen } from "./PlayersScreen";

type Tab = "leagues" | "players";

export function HomeScreen() {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("leagues");

  const myProfileQuery = useQuery({ queryKey: ["my-profile"], queryFn: api.getMyProfile });
  const uploadMyIconMutation = useMutation({
    mutationFn: (formData: FormData) => api.uploadMyIcon(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      queryClient.invalidateQueries({ queryKey: ["league-members"] });
    },
  });

  return (
    <View style={ui.screen}>
      <View style={[ui.row, { padding: 16, paddingBottom: 0 }]}>
        <View style={[ui.row, { gap: 8, justifyContent: "flex-start" }]}>
          <IconUpload
            iconUrl={myProfileQuery.data?.iconUrl ?? null}
            busy={uploadMyIconMutation.isPending}
            onUpload={(formData) => uploadMyIconMutation.mutate(formData)}
          />
          <Text style={ui.subtext}>{user?.email}</Text>
        </View>
        <Pressable onPress={() => signOut()}>
          <Text style={ui.linkText}>Sign out</Text>
        </Pressable>
      </View>

      <View style={ui.tabBar}>
        {(["leagues", "players"] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={[ui.tabButton, tab === t && ui.tabButtonActive]}
          >
            <Text style={[ui.tabButtonText, tab === t && ui.tabButtonTextActive]}>{t}</Text>
          </Pressable>
        ))}
      </View>

      {tab === "leagues" ? <LeaguesScreen /> : <PlayersScreen />}
    </View>
  );
}
