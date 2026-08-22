import { useState } from "react";
import { Pressable, SafeAreaView, Text, View } from "react-native";
import { useAuth } from "../hooks/useAuth";
import { ui } from "../lib/ui";
import { LeaguesScreen } from "./LeaguesScreen";
import { PlayersScreen } from "./PlayersScreen";

type Tab = "leagues" | "players";

export function HomeScreen() {
  const { user, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>("leagues");

  return (
    <SafeAreaView style={ui.screen}>
      <View style={[ui.row, { padding: 16, paddingBottom: 0 }]}>
        <Text style={ui.subtext}>{user?.email}</Text>
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
    </SafeAreaView>
  );
}
